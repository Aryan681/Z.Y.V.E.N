import pool from "../../config/db.js";
const userRepo = {
  findUserByEmail: async (email) => {
    try {
      const query = `
        SELECT
            id,
            name,
            email,
            password,
            role,
            provider,
            is_verified,
            verification_token,
            verification_token_expires,
            refresh_token
        FROM users
        WHERE email = $1
    `;
      const values = [email];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  createUser: async (
    name,
    email,
    hashedPassword,
    verificationToken,
    tokenExpire,
  ) => {
    try {
      const query = `
                INSERT INTO users (name, email, password, verification_token,verification_token_expires)
                VALUES ($1, $2, $3, $4,$5)
                RETURNING email, name`;
      const values = [
        name,
        email,
        hashedPassword,
        verificationToken,
        tokenExpire,
      ];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },
  findUserByVerificationToken: async (token) => {
    const query = `
        SELECT
            id,
            email,
            is_verified,
            verification_token_expires
        FROM users
        WHERE verification_token = $1
    `;
    const values = [token];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
  verifyUser: async (userId) => {
    const query = `
        UPDATE users
        SET
            is_verified = true,
            verification_token = NULL,
            verification_token_expires = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, name, email, is_verified
    `;

    const values = [userId];
    const result = await pool.query(query, values);
    return result.rows[0];
  },
  updateToken: async (userId, verificationToken, tokenExpire) => {
    const query = `
        UPDATE users
        SET
            verification_token = $1,
            verification_token_expires = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id
    `;

    const values = [verificationToken, tokenExpire, userId];

    const result = await pool.query(query, values);

    return result.rows[0];
  },

};
export default userRepo;
