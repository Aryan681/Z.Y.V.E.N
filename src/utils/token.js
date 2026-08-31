import crypto from "crypto";
import { generateSecret } from 'otplib';
const tokenHelper = {
    generateVerificationToken() {
        return crypto.randomBytes(32).toString("hex");
    },
    hashToken(token) {
        return crypto.createHash("sha256").update(token).digest("hex");
    },
    generateVerificationCode() {
        return crypto.randomBytes(6).toString("hex");
    },
    generateSecret(){
            return generateSecret();
    },
};

export default tokenHelper;