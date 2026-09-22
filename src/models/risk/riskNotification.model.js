import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const RiskNotification = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS risk_notifications (
        notification_id UUID PRIMARY KEY,
        event_id UUID REFERENCES risk_events(event_id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        recipient_type VARCHAR(32) NOT NULL,
        recipient VARCHAR(255) NOT NULL,
        notification_type VARCHAR(64) NOT NULL,
        dedupe_key VARCHAR(255) UNIQUE NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        sent_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_risk_notifications_status
       ON risk_notifications(status, created_at)`,
    );
    logger.info("risk_notifications table and indexes created");
  } catch (error) {
    logger.error(`Error creating risk_notifications table: ${error.message}`);
  }
};

export default RiskNotification;
