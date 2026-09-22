import crypto from "crypto";
import pool from "../config/db.js";
import logger from "../config/logger.js";

const riskEventRepo = {
  createRiskEvent: async ({
    userId,
    eventType = "login_risk_assessment",
    score,
    level,
    decision,
    signals,
    deviceId,
    ipAddress,
    userAgent,
  }) => {
    try {
      const result = await pool.query(
        `INSERT INTO risk_events (
          event_id,
          user_id,
          event_type,
          score,
          level,
          decision,
          signals,
          device_id,
          ip_address,
          user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
        RETURNING event_id, user_id, event_type, score, level, decision, created_at`,
        [
          crypto.randomUUID(),
          userId || null,
          eventType,
          score,
          level,
          decision,
          JSON.stringify(signals || []),
          deviceId || null,
          ipAddress || null,
          userAgent || null,
        ],
      );

      return result.rows[0];
    } catch (error) {
      logger.error(`Error creating risk event: ${error.message}`);
      throw error;
    }
  },
};

export default riskEventRepo;
