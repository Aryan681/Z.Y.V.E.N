import pool from "../../config/db.js" ;
import logger from "../../config/logger.js";
const Profile = async()=> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password TEXT,
            name VARCHAR(255) NOT NULL,
            refresh_token TEXT,
            role VARCHAR(50) DEFAULT 'user',
            provider VARCHAR(50) DEFAULT 'email',
            google_id VARCHAR(255) UNIQUE,
            is_verified BOOLEAN DEFAULT false,
            verification_token VARCHAR(255),
            verification_token_expires TIMESTAMP,
            reset_token VARCHAR(255),
            reset_token_expires TIMESTAMP,
            twofa_secret TEXT,
            is_2fa_enabled BOOLEAN DEFAULT false,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id
            ON users(google_id)
            WHERE google_id IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_verification_token
            ON users(verification_token)
            WHERE verification_token IS NOT NULL;

        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_reset_token
            ON users(reset_token)
            WHERE reset_token IS NOT NULL;
`);
        
      logger.info('users table is created');

    } catch (error) {
        logger.error(`Error creating users table:${error}`);
    }
}
export default Profile ;