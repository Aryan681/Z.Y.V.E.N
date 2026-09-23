import crypto from "crypto";
import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const riskNotificationRepo = {
  createPending: async ({
    eventId,
    userId,
    recipientType,
    recipient,
    notificationType,
    dedupeKey,
  }) => {
    try {
      const result = await pool.query(
        `INSERT INTO risk_notifications (
          notification_id,
          event_id,
          user_id,
          recipient_type,
          recipient,
          notification_type,
          dedupe_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (dedupe_key) DO NOTHING
        RETURNING *`,
        [
          crypto.randomUUID(),
          eventId,
          userId || null,
          recipientType,
          recipient,
          notificationType,
          dedupeKey,
        ],
      );
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error creating risk notification: ${error.message}`);
      throw error;
    }
  },

  markSent: async (notificationId) => {
    await pool.query(
      `UPDATE risk_notifications
       SET status = 'sent', sent_at = CURRENT_TIMESTAMP,
           attempts = attempts + 1, last_error = NULL
       WHERE notification_id = $1`,
      [notificationId],
    );
  },

  markFailed: async (notificationId, errorMessage) => {
    await pool.query(
      `UPDATE risk_notifications
       SET status = 'failed', attempts = attempts + 1, last_error = $2
       WHERE notification_id = $1`,
      [notificationId, String(errorMessage).slice(0, 1000)],
    );
  },
};

export default riskNotificationRepo;
