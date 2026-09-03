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
            refresh_token,
            is_2fa_enabled
        FROM users
        WHERE email = $1
        AND isActive = true
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
        AND isActive = true
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
        AND isActive = true
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
        AND isActive = true
        RETURNING id
    `;

    const values = [verificationToken, tokenExpire, userId];

    const result = await pool.query(query, values);

    return result.rows[0];
  },
  findUserByGoogleId: async (googleId) => {
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
        WHERE google_id = $1
    `;
      const values = [googleId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  linkGoogle: async (userId, googleId) => {
    try {
      const query = `
                UPDATE users
                SET
                    google_id = $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                AND isActive = true
                RETURNING id
            `;
      const values = [googleId, userId];
      const result = await pool.query(query, values);
      return result.rows[0]|| null;
    } catch (error) {
    throw error;
    }
  },
  createGoogleUser: async (name, email, googleId) => {
    try {
      const query = `
                INSERT INTO users (name, email, google_id,is_verified)
                VALUES ($1, $2, $3,TRUE)
                RETURNING email, name ,id
            `;
      const values = [name, email, googleId];
      const result = await pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  },
  findUserById: async (userId) => {
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
        refresh_token,
        twofa_secret,
        is_2fa_enabled
        FROM users
        WHERE id = $1
        AND isActive = true
 
      `;
      const values = [userId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  updatePassword: async (userId, hashedPassword) => {
    try {
      const query =`
      Update users 
      set password = $1
      where id =$2
      AND isActive = true
       RETURNING id
      `
      const values = [hashedPassword,userId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error occur in  the password update userrepo ${error}`);
      throw error;
    }
  },
  updateResetToken: async (userId, resetToken, tokenExpire) => {
    const query = `
        UPDATE users
        SET
            reset_token = $1,
            reset_token_expires = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        AND isActive = true
        RETURNING id
    `;

    const values = [resetToken, tokenExpire, userId];

    const result = await pool.query(query, values);

    return result.rows[0];
  },
  findUserByResetToken: async (token) => {
    const query = `
        SELECT
            id,
            email,
            is_verified,
            reset_token_expires
        FROM users
        WHERE reset_token = $1
        AND isActive = true
    `;
    const values = [token];
    const result = await pool.query(query, values);
    return result.rows[0] || null;
  },
  updateEmail: async (userId, email) => {
    try {
      const query = `
        UPDATE users
        SET email = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        AND isActive = true
        RETURNING id, name, email
      `;
      const values = [email, userId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error in updateEmail userRepo: ${error}`);
      throw error;
    }
  },
  updateTwofaSecret: async (userId, twofaSecret) => {
    try {
      const query = `
        UPDATE users
        SET
            twofa_secret = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        AND isActive = true
        RETURNING id
      `;
      const values = [twofaSecret, userId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      logger.error(`Error in updateTwofaSecret userRepo: ${error}`);
      throw error;
    }
  },
  update2faStatus: async (userId, isEnabled) => {
    try {
      const query = `
        UPDATE users
        SET
            is_2fa_enabled = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        AND isActive = true
        RETURNING id
      `;
      const values = [isEnabled, userId];
      const result = await pool.query(query, values);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  },
  softDeleteUser:async(userId,reason)=>{
      const client = await pool.connect();

    try{
      await client.query('BEGIN');

      const UserQuery = `
      update users
      set isActive = false,
         reason = $1,
         updated_at = CURRENT_TIMESTAMP,
         email = CONCAT(email, '_deleted_', NOW()::text),
         twofa_secret = NULL,
         google_id = NULL
        where id = $2
        and isActive = true
        RETURNING id, email, isActive;
      `;
      const values = [reason,userId];
      const userResult = await client.query(UserQuery, values);
        if (userResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return null;
      }
      const sessionQuery = `
      UPDATE sessions 
      SET revoked_at = CURRENT_TIMESTAMP, 
          updated_at = CURRENT_TIMESTAMP 
      WHERE user_id = $1 
        AND revoked_at IS NULL;
    `;
    await client.query(sessionQuery, [userId]);
    await client.query('COMMIT');

    return userResult.rows[0] || null;
    }catch(error){
      await client.query('ROLLBACK');
      throw error;
      
    }finally{
       client.release();
    }
  },
};
export default userRepo;
