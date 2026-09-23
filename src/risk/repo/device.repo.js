import crypto from "crypto";
import pool from "../../config/db.js";
import logger from "../../config/logger.js";
import deviceConstants from "../constants/device.constants.js";

const deviceProjection = `
  device_record_id,
  user_id,
  device_id,
  fingerprint_hash,
  fingerprint_version,
  device_name,
  first_seen_at,
  last_seen_at,
  last_ip_address,
  last_user_agent,
  trusted_at,
  revoked_at,
  revoked_reason
`;

const deviceRepo = {
  findByFingerprint: async (userId, fingerprintHash) => {
    const result = await pool.query(
      `SELECT ${deviceProjection}
       FROM user_devices
       WHERE user_id = $1 AND fingerprint_hash = $2
       LIMIT 1`,
      [userId, fingerprintHash],
    );
    return result.rows[0] || null;
  },

  findByDeviceId: async (userId, deviceId) => {
    const result = await pool.query(
      `SELECT ${deviceProjection}
       FROM user_devices
       WHERE user_id = $1 AND device_id = $2
       LIMIT 1`,
      [userId, deviceId],
    );
    return result.rows[0] || null;
  },

  listByUserId: async (userId) => {
    const result = await pool.query(
      `SELECT ${deviceProjection}
       FROM user_devices
       WHERE user_id = $1
       ORDER BY revoked_at NULLS FIRST, last_seen_at DESC`,
      [userId],
    );
    return result.rows;
  },

  upsertSeen: async ({
    userId,
    deviceId,
    fingerprintHash,
    deviceName,
    ipAddress,
    userAgent,
    trusted = true,
  }) => {
    const result = await pool.query(
      `INSERT INTO user_devices (
        device_record_id, user_id, device_id, fingerprint_hash,
        fingerprint_version, device_name, last_ip_address, last_user_agent,
        trusted_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CASE WHEN $9 THEN CURRENT_TIMESTAMP ELSE NULL END)
      ON CONFLICT (user_id, device_id) DO UPDATE SET
        fingerprint_hash = EXCLUDED.fingerprint_hash,
        fingerprint_version = EXCLUDED.fingerprint_version,
        device_name = EXCLUDED.device_name,
        last_seen_at = CURRENT_TIMESTAMP,
        last_ip_address = EXCLUDED.last_ip_address,
        last_user_agent = EXCLUDED.last_user_agent,
        trusted_at = CASE
          WHEN user_devices.revoked_at IS NULL AND ($9 OR user_devices.trusted_at IS NOT NULL)
          THEN COALESCE(user_devices.trusted_at, CURRENT_TIMESTAMP)
          ELSE user_devices.trusted_at
        END,
        updated_at = CURRENT_TIMESTAMP
      RETURNING ${deviceProjection}`,
      [
        crypto.randomUUID(),
        userId,
        deviceId,
        fingerprintHash,
        deviceConstants.fingerprintVersion,
        String(deviceName || "unknown").slice(0, deviceConstants.maxDeviceNameLength),
        ipAddress || null,
        String(userAgent || "unknown").slice(0, deviceConstants.maxDeviceNameLength),
        trusted,
      ],
    );
    return result.rows[0];
  },

  trust: async (userId, deviceId) => {
    const result = await pool.query(
      `UPDATE user_devices
       SET trusted_at = CURRENT_TIMESTAMP,
           revoked_at = NULL,
           revoked_reason = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND device_id = $2
       RETURNING ${deviceProjection}`,
      [userId, deviceId],
    );
    return result.rows[0] || null;
  },

  revoke: async (userId, deviceId, reason = "user_revoked") => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const deviceResult = await client.query(
        `UPDATE user_devices
         SET revoked_at = CURRENT_TIMESTAMP,
             revoked_reason = $3,
             trusted_at = NULL,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND device_id = $2
         RETURNING ${deviceProjection}`,
        [userId, deviceId, reason],
      );
      const sessionsResult = await client.query(
        `UPDATE sessions
         SET revoked_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $1 AND device_id = $2 AND revoked_at IS NULL
         RETURNING session_id`,
        [userId, deviceId],
      );
      await client.query("COMMIT");
      return {
        device: deviceResult.rows[0] || null,
        revokedSessionIds: sessionsResult.rows.map((row) => row.session_id),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error(`Error revoking device: ${error.message}`);
      throw error;
    } finally {
      client.release();
    }
  },
};

export default deviceRepo;
