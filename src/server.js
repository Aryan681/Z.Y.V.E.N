import "./config/env.js";
import app from "./app.js" ;
import "./config/db.js" ;
import redisClient from './config/redis.js';
import Profile from "./models/user/user.js";
import Session from "./models/user/session.model.js";
Profile();
Session();

const PORT = process.env.PORT || 8080 ;

app.listen(PORT, ( )=> {
    console.log(`Server is running on port ${PORT}`) ;
})