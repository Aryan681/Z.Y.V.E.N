import "./config/env.js";
import app from "./app.js" ;
import "./config/db.js" ;
import Profile from "./models/user/user.js";
Profile();

const PORT = process.env.PORT || 8080 ;

app.listen(PORT, ( )=> {
    console.log(`Server is running on port ${PORT}`) ;
})