import { date } from "zod";
import userRepo from "../repos/user/user.js";
import logger from "../utils/logger.js";
import passwordHelper from "../utils/password.js";
import tokenHelper from "../utils/token.js";
import emailService from "./email.service.js";
import urlHelper from "../utils/url.js";
const authService = {
  registration: async (name, email, password) => {
    try {
      const emailExists = await userRepo.findUserByEmail(email);
      if (emailExists) {
        return null;
      }
      const hashedPassword = await passwordHelper.hashPassword(password);
      const verificationToken = await tokenHelper.generateVerificationToken();
      const tokenExpire = new Date(Date.now() + 10 * 60 * 1000);
      const generatedUrl = await urlHelper.generateVerificationUrl(verificationToken);
      const user = await userRepo.createUser(
        name,
        email,
        hashedPassword,
        verificationToken,
        tokenExpire,
      );
      const mailSend = await emailService.sendVerificationMail(
        email,
        generatedUrl,
      );

      return user;
    } catch (error) {
      logger.error("Registration Service Error", error);
      throw error;
    }
  },
  verification: async (token) => {
    try {
      const user = await userRepo.findUserByVerificationToken(token);

      if (!user) {
        logger.warn(`Invalid verification token: ${token}`);

        return {
          success: false,
          message: "Invalid verification token",
        };
      }

      if (user.is_verified) {
        return {
          success: false,
          message: "User already verified",
        };
      }

      if (new Date() > new Date(user.verification_token_expires)) {
        return {
          success: false,
          message: "Verification token expired",
        };
      }

      const verifiedUser = await userRepo.verifyUser(user.id);

      logger.info(`User verified successfully: ${verifiedUser.email}`);

      return {
        success: true,
        user: verifiedUser,
      };
    } catch (error) {
      logger.error("Verification Service Error", error);

      throw error;
    }
  },
};
export default authService;
