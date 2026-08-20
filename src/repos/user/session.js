import pool from "../../config/db.js";
import logger from "../../config/logger.js";

const sessionRepo = {
  createSession: async ({
    sessionId,
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
                session_id,
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
                    $7,
                    CURRENT_TIMESTAMP,
                    $8
                )
                RETURNING
                    session_id,
                    user_id,
                    device_id,
                    device_name,
                    expires_at,
                    created_at
            `;

      const values = [
        sessionId,
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
      logger.error(`Error creating user session: ${error.message}`);

      throw error;
    }
  },
  updateRefreshToken: async (sessionId, refreshTokenHash, expiresAt) => { 
    const query = `
                UPDATE sessions
                SET
                    refresh_token_hash = $1,
                    expires_at = $2
                WHERE session_id = $3
                RETURNING
                    session_id,
                    user_id,
                    device_id,
                    device_name,
                    expires_at,
                    created_at
            `;

    const values = [
      refreshTokenHash,
      expiresAt,
      sessionId,
    ];  

    const result = await pool.query(query, values);

    return result.rows[0];
  },
findByRefreshTokenHash: async (refreshTokenHash) => {
  try {
    const query = `
      SELECT
        session_id,
        user_id,
        device_id,
        device_name,
        ip_address,
        user_agent,
        last_active,
        revoked_at,
        expires_at,
        created_at
      FROM sessions
      WHERE refresh_token_hash = $1
        AND revoked_at IS NULL
        AND expires_at > CURRENT_TIMESTAMP
      LIMIT 1
    `;

    const values = [refreshTokenHash];

    const result = await pool.query(query, values);

    return result.rows[0] || null;

  } catch (error) {
    logger.error(
      `Error finding session by refresh token hash: ${error.message}`
    );

    throw error;
  }
},
  revokeAllUserSessions: async (userId) => {
    try {
      const query = `
        UPDATE sessions
        SET
          revoked_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND revoked_at IS NULL
      `;
      const values = [userId];
      const result = await pool.query(query, values);
      return result.rowCount;
    } catch (error) {
      logger.error(`Error revoking user sessions: ${error.message}`);
      throw error;
    }
  },
};

export default sessionRepo;
