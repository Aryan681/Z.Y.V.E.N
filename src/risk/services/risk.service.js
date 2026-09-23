import logger from "../../config/logger.js";
import riskRepo from "../repo/risk.repo.js";
import evaluateRisk from "../core/risk.engine.js";
import failedLoginVelocityService from "./failedLoginVelocity.service.js";
import riskEventRepo from "../repo/riskEvent.repo.js";
import riskAlertService from "../../services/riskAlert.service.js";
import riskConstants from "../constants/risk.constants.js";

const riskService = {
  recordFailedLoginActivity: async (userId, sessionContext, attemptCount) => {
    if (
      !userId ||
      attemptCount !== riskConstants.velocity.failedAttemptThreshold
    ) {
      return;
    }

    try {
      const riskEvent = await riskEventRepo.createRiskEvent({
        userId,
        eventType: "failed_login_activity",
        score: riskConstants.velocity.failedAttemptScore,
        level: riskConstants.levels.medium,
        decision: riskConstants.decisions.monitor,
        signals: [
          {
            type: "failed_login_velocity",
            score: riskConstants.velocity.failedAttemptScore,
            details: {
              attemptCount,
              windowMinutes: riskConstants.velocity.windowMinutes,
            },
          },
        ],
        deviceId: sessionContext.deviceId,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
      });

      void riskAlertService.processRiskEvent({
        event: riskEvent,
        sessionContext,
      });
    } catch (error) {
      logger.error(`Failed-login risk event unavailable: ${error.message}`);
    }
  },

  evaluateLoginRisk: async (userId, sessionContext) => {
    try {
      const [sessions, failedAttemptVelocity] = await Promise.all([
        riskRepo.findRecentUserSessions(userId),
        failedLoginVelocityService.getVelocity(sessionContext),
      ]);
      const riskAssessment = evaluateRisk(
        {
          ...sessionContext,
          failedAttemptVelocity,
          now: sessionContext.now || new Date(),
        },
        sessions,
      );

      if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development") {
        logger.debug(
          {
            userId,
            score: riskAssessment.score,
            level: riskAssessment.level,
            decision: riskAssessment.decision,
            signals: riskAssessment.signals.map((signal) => signal.type),
          },
          "Risk engine login assessment",
        );
      }

      try {
        const riskEvent = await riskEventRepo.createRiskEvent({
          userId,
          score: riskAssessment.score,
          level: riskAssessment.level,
          decision: riskAssessment.decision,
          signals: riskAssessment.signals,
          deviceId: sessionContext.deviceId,
          ipAddress: sessionContext.ipAddress,
          userAgent: sessionContext.userAgent,
        });
        void riskAlertService.processRiskEvent({
          event: riskEvent,
          sessionContext,
        });
      } catch (error) {
        // Audit persistence is valuable, but it must not turn a database
        // audit outage into an authentication outage.
        logger.error(`Risk event persistence unavailable: ${error.message}`);
      }

      return riskAssessment;
    } catch (error) {
      logger.error(`Risk evaluation unavailable for user ${userId}: ${error.message}`);
      return {
        score: 0,
        level: "unknown",
        decision: "allow",
        signals: [],
        degraded: true,
      };
    }
  },
};

export default riskService;
