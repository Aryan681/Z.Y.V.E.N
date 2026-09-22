import logger from "../config/logger.js";
import emailService from "./email.service.js";
import userRepo from "../repos/user/user.js";
import redisService from "./redis.service.js";
import riskConstants from "../risk/risk.constants.js";
import riskEventRepo from "../risk/riskEvent.repo.js";
import riskNotificationRepo from "../risk/riskNotification.repo.js";

const suspiciousSignals = new Set([
  "failed_login_velocity",
  "impossible_travel",
  "suspicious_ip_reputation",
  "rapid_login_velocity",
]);

const getOperatorRecipients = () =>
  String(process.env.SECURITY_ALERT_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

const hasSignal = (event, signalTypes) =>
  (event.signals || []).some((signal) => signalTypes.has(signal.type));

const claimCooldown = async (key, seconds) => {
  try {
    const result = await redisService.setIfAbsentWithExpiry(key, "1", seconds);
    return result === "OK";
  } catch (error) {
    logger.warn(`Risk alert cooldown unavailable: ${error.message}`);
    return true;
  }
};

const sendNotification = async ({
  event,
  userId,
  recipientType,
  recipient,
  notificationType,
  dedupeKey,
  subject,
  message,
}) => {
  const notification = await riskNotificationRepo.createPending({
    eventId: event.event_id,
    userId,
    recipientType,
    recipient,
    notificationType,
    dedupeKey,
  });

  if (!notification) return false;

  try {
    await emailService.sendSecurityAlertMail(recipient, subject, message);
    await riskNotificationRepo.markSent(notification.notification_id);
    return true;
  } catch (error) {
    logger.error(`Risk notification delivery failed: ${error.message}`);
    try {
      await riskNotificationRepo.markFailed(notification.notification_id, error.message);
    } catch (markError) {
      logger.error(`Risk notification status update failed: ${markError.message}`);
    }
    return false;
  }
};

const riskAlertService = {
  processRiskEvent: async ({ event, sessionContext }) => {
    try {
      const isCritical = event.level === "critical" || event.decision === "deny";
      const isSuspicious = hasSignal(event, suspiciousSignals);
      const challengeCount =
        event.decision === riskConstants.decisions.require2FA
          ? await riskEventRepo.countRecentByDecision(
              event.user_id,
              riskConstants.decisions.require2FA,
              riskConstants.alerting.repeatedChallengeWindowSeconds,
            )
          : 0;
      const repeatedChallenge =
        challengeCount >= riskConstants.alerting.repeatedChallengeThreshold;

      const user = await userRepo.findUserById(event.user_id);

      if (isCritical && user?.email) {
        const allowed = await claimCooldown(
          `auth:alert:user:${event.user_id}:critical`,
          riskConstants.alerting.criticalUserCooldownSeconds,
        );
        if (allowed) {
          await sendNotification({
            event,
            userId: event.user_id,
            recipientType: "user",
            recipient: user.email,
            notificationType: "critical_risk",
            dedupeKey: `user:${event.user_id}:critical:${Math.floor(Date.now() / (riskConstants.alerting.criticalUserCooldownSeconds * 1000))}`,
            subject: "Security Alert: Suspicious Sign-in Blocked",
            message:
              "We blocked a suspicious sign-in attempt to your account. If this was not you, reset your password and review your active sessions immediately.",
          });
        }
      }

      if (repeatedChallenge && user?.email) {
        const allowed = await claimCooldown(
          `auth:alert:user:${event.user_id}:repeated-challenge`,
          riskConstants.alerting.repeatedChallengeWindowSeconds,
        );
        if (allowed) {
          await sendNotification({
            event,
            userId: event.user_id,
            recipientType: "user",
            recipient: user.email,
            notificationType: "repeated_challenge",
            dedupeKey: `user:${event.user_id}:repeated-challenge:${Math.floor(Date.now() / (riskConstants.alerting.repeatedChallengeWindowSeconds * 1000))}`,
            subject: "Security Alert: Repeated Sign-in Verification",
            message:
              "We detected repeated unusual sign-in attempts requiring additional verification. If this activity was not yours, reset your password and review your active sessions.",
          });
        }
      }

      if (isSuspicious && user?.email) {
        const allowed = await claimCooldown(
          `auth:alert:user:${event.user_id}:suspicious`,
          riskConstants.alerting.suspiciousUserCooldownSeconds,
        );
        if (allowed) {
          await sendNotification({
            event,
            userId: event.user_id,
            recipientType: "user",
            recipient: user.email,
            notificationType: "suspicious_activity",
            dedupeKey: `user:${event.user_id}:suspicious:${Math.floor(Date.now() / (riskConstants.alerting.suspiciousUserCooldownSeconds * 1000))}`,
            subject: "Security Alert: Unusual Account Activity",
            message:
              "We detected unusual activity associated with a recent sign-in. If you do not recognize it, reset your password and review your active sessions.",
          });
        }
      }

      if (isCritical || repeatedChallenge || isSuspicious) {
        const operatorMessage = [
          `Risk event ${event.event_id}`,
          `User ID: ${event.user_id}`,
          `Score: ${event.score}`,
          `Level: ${event.level}`,
          `Decision: ${event.decision}`,
          `Signals: ${(event.signals || []).map((signal) => signal.type).join(", ") || "none"}`,
          `IP: ${sessionContext.ipAddress || "unknown"}`,
          `Device: ${sessionContext.deviceId || "unknown"}`,
        ].join("\n");

        for (const recipient of getOperatorRecipients()) {
          await sendNotification({
            event,
            userId: event.user_id,
            recipientType: "operator",
            recipient,
            notificationType: isCritical
              ? "critical_risk_operator"
              : "suspicious_activity_operator",
            dedupeKey: `operator:${recipient}:${event.event_id}`,
            subject: `Risk Alert: ${event.level} authentication activity`,
            message: operatorMessage,
          });
        }
      }
    } catch (error) {
      logger.error(`Risk alert processing failed: ${error.message}`);
    }
  },
};

export default riskAlertService;
