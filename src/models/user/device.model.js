import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const Device = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_devices (
        device_record_id UUID PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        device_id VARCHAR(255) NOT NULL,
        fingerprint_hash VARCHAR(64) NOT NULL,
        fingerprint_version INTEGER NOT NULL DEFAULT 1,
        device_name VARCHAR(255) NOT NULL DEFAULT 'unknown',
        first_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        last_ip_address INET,
        last_user_agent VARCHAR(255),
        trusted_at TIMESTAMP,
        revoked_at TIMESTAMP,
        revoked_reason VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, device_id)
      )
    `);
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_user_devices_user_active
       ON user_devices(user_id, revoked_at, last_seen_at DESC)`,
    );
    await pool.query(
      `CREATE INDEX IF NOT EXISTS idx_user_devices_fingerprint
       ON user_devices(user_id, fingerprint_hash)`,
    );
    await pool.query(`ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS fingerprint_version INTEGER NOT NULL DEFAULT 1`);
    await pool.query(`ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS trusted_at TIMESTAMP`);
    await pool.query(`ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMP`);
    await pool.query(`ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS revoked_reason VARCHAR(255)`);
    await pool.query(`ALTER TABLE user_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`);
    logger.info("user_devices table and indexes created");
  } catch (error) {
    logger.error(`Error creating user_devices table: ${error.message}`);
  }
};

export default Device;
