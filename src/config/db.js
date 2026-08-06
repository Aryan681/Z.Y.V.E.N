import { Pool } from "pg";

let connected = false;
const pool = new Pool({
 user: process.env.DB_USER,
 host: process.env.DB_HOST,
 database: process.env.DB_NAME,
 password: process.env.DB_PASSWORD,
 port: process.env.DB_PORT,
}) ;
// console.log('pool:', pool);s
pool.query("SELECT NOW()")
    .then(() => console.log("✅ PostgreSQL connected"))
    .catch(err => console.error("❌ DB Error:", err));
export default pool ;