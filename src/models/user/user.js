import pool from "../../config/db.js" ;

const Profile = async()=> {
    try {
        await pool.query(
            `CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) ,
                name VARCHAR(255) NOT NULL,
                refresh_token VARCHAR(255),
                role VARCHAR(50) DEFAULT 'user',
                provider VARCHAR(50) DEFAULT 'email',
                google_id VARCHAR(255),
                is_verified BOOLEAN DEFAULT false,
                verification_token VARCHAR(255) UNIQUE,
                verification_token_expires TIMESTAMP,
                reset_token VARCHAR(255) UNIQUE,
                reset_token_expires TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`
        )
       console.log('users table is created:');

    } catch (error) {
        console.error("Error creating users table:", error);
    }
}
Profile() ;