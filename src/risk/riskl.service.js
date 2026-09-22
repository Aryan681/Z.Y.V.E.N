import logger from "../config/logger.js";
import riskRepo from "./risk.repo.js";
import evaluateRisk from "./risk.engine.js";
import failedLoginVelocityService from "./failedLoginVelocity.service.js";
import riskEventRepo from "./riskEvent.repo.js";

const riskService = {
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
        await riskEventRepo.createRiskEvent({
          userId,
          score: riskAssessment.score,
          level: riskAssessment.level,
          decision: riskAssessment.decision,
          signals: riskAssessment.signals,
          deviceId: sessionContext.deviceId,
          ipAddress: sessionContext.ipAddress,
          userAgent: sessionContext.userAgent,
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
