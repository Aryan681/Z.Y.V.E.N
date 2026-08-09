import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const sessionRepo = {
  createSession: async ({
    userId,
    refreshTokenHash,
    deviceId,
    deviceName,
    ipAddress,
    userAgent,
    expiresAt,
  }) => {
    try {
      const query = `
                INSERT INTO sessions (
                    user_id,
                    refresh_token_hash,
                    device_id,
                    device_name,
                    ip_address,
                    user_agent,
                    last_active,
                    expires_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    CURRENT_TIMESTAMP,
                    $7
                )
                RETURNING
                    id,
                    user_id,
                    device_id,
                    device_name,
                    expires_at,
                    created_at
            `;

      const values = [
        userId,
        refreshTokenHash,
        deviceId,
        deviceName,
        ipAddress,
        userAgent,
        expiresAt,
      ];

      const result = await pool.query(query, values);

      return result.rows[0];
    } catch (error) {
      logger.error("Error creating user session", error);

      throw error;
    }
  },
};

export default sessionRepo;
