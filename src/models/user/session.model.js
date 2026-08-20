import Pool from "../../config/db.js";
import logger from "../../config/logger.js";
const Session = async () => {
  try {
    await Pool.query(
      `CREATE TABLE IF NOT EXISTS sessions (
        session_id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) UNIQUE NOT NULL,
        device_id VARCHAR(255) NOT NULL,
        device_name VARCHAR(255) NOT NULL,
        ip_address INET NOT NULL,
        user_agent VARCHAR(255) NOT NULL,
        last_active TIMESTAMP NOT NULL,
        revoked_at TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
    );
    await Pool.query(
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`
    );
    logger.info("sessions table and indexes created");
  } catch (error) {
    logger.error(`Error creating sessions table: ${error.message}`);
  }
};
export default Session;