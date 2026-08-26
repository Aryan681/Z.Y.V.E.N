import crypto from "crypto";

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
};

export default tokenHelper;