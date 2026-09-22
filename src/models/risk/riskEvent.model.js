import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const RiskEvent = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS risk_events (
        event_id UUID PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        event_type VARCHAR(64) NOT NULL,
        score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
        level VARCHAR(32) NOT NULL,
        decision VARCHAR(32) NOT NULL,
        signals JSONB NOT NULL DEFAULT '[]'::jsonb,
        device_id VARCHAR(255),
        ip_address INET,
        user_agent VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_risk_events_user_created_at
       ON risk_events(user_id, created_at DESC)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_risk_events_decision_created_at
       ON risk_events(decision, created_at DESC)`,
    );
    logger.info("risk_events table and indexes created");
  } catch (error) {
    logger.error(`Error creating risk_events table: ${error.message}`);
  }
};

export default RiskEvent;
