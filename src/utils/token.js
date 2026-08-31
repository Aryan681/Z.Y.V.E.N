import crypto from "crypto";
import { generateSecret,verify } from "otplib";

const ALGORITHM = "aes-256-gcm";

const KEY = Buffer.from(process.env.TWO_FA_ENCRYPTION_KEY, "hex");
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
  generateSecret() {
    return generateSecret();
  },
  encryptSecret(secret) {
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(
      ALGORITHM,
      KEY,
      iv
    );

    const encrypted = Buffer.concat([
      cipher.update(secret, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString("hex"),
      authTag.toString("hex"),
      encrypted.toString("hex"),
    ].join(":");
  },
  decryptSecret(encryptedSecret) {
    if (!encryptedSecret) {
      throw new Error(
        "2FA secret is not configured for this user"
      );
    }

    const [ivHex, authTagHex, encryptedHex] =
      encryptedSecret.split(":");

    if (!ivHex || !authTagHex || !encryptedHex) {
      throw new Error("Invalid encrypted 2FA secret");
    }

    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      KEY,
      Buffer.from(ivHex, "hex")
    );

    decipher.setAuthTag(
      Buffer.from(authTagHex, "hex")
    );

    const decrypted = Buffer.concat([
      decipher.update(
        Buffer.from(encryptedHex, "hex")
      ),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  },
  async verifyOtp(decryptedSecret, otp) {
    const result = await verify({
      secret: decryptedSecret,
      token: otp,
    });

    return result.valid;
  },

};

export default tokenHelper;