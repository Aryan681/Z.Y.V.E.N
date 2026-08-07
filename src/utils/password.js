import bcrypt from "bcrypt";
import logger from "../config/logger.js" ;
import defaults from "../constants/defaults.js" ;
const passwordHelper = {
    hashPassword : async (password) => {
        try {
            let saltRounds = defaults.BCRYPT_SALT_ROUNDS;
            const hashedPassword = await bcrypt.hash(password,saltRounds) ;
            return hashedPassword ;

        } catch (error) {
            logger.error("Password Hashing Error", error);
            throw error ;
        }
    } ,
}
export default passwordHelper ;