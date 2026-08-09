import userRepo from "../repos/user/user.js";
import logger from "../config/logger.js";
import passwordHelper from "../utils/password.js";
import tokenHelper from "../utils/token.js";
import emailService from "./email.service.js";
import urlHelper from "../utils/url.js";
import tokenService from "../services/token.service.js";
import sessionRepo from "../repos/user/session.js";
import { UAParser } from "ua-parser-js";
import crypto from "crypto";
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
      const generatedUrl =
        await urlHelper.generateVerificationUrl(verificationToken);
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
        logger.warn(`Invalid verification token`);

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
  resendVerificationUrl: async (email) => {
    try {
      const user = await userRepo.findUserByEmail(email);

      if (!user) {
        logger.warn(`Resend verification failed. User not found: ${email}`);

        return {
          success: false,
          message: "User does not exist",
        };
      }

      if (user.is_verified) {
        logger.warn(`User already verified: ${email}`);

        return {
          success: false,
          message: "User is already verified",
        };
      }

      const verificationToken = tokenHelper.generateVerificationToken();
      const tokenExpire = new Date(Date.now() + 10 * 60 * 1000);
      await userRepo.updateToken(user.id, verificationToken, tokenExpire);
      const generatedUrl = urlHelper.generateVerificationUrl(verificationToken);
      await emailService.sendVerificationMail(email, generatedUrl);
      logger.info(`Verification email resent successfully: ${email}`);
      return {
        success: true,
        message: "Verification email sent successfully",
      };
    } catch (error) {
      logger.error("Resend verification service error", error);

      throw error;
    }
  },
  login: async (email, password, sessionContext) => {
    try {
      const user = await userRepo.findUserByEmail(email);
      if (!user) {
        logger.warn(`user not found with email ${email}`);
        return {
          success: false,
          message: "user not found",
        };
      }
      if (!user.is_verified) {
        logger.warn(`user not verified with email ${email}`);
        return {
          success: false,
          message: "user not verified",
        };
      }
      const isPasswordMatch = await passwordHelper.verifyPassword(
        password,
        user.password,
      );
      if (!isPasswordMatch) {
        logger.warn(`password not match with the user ${email}`);
        return {
          success: false,
          message: "password not match",
        };
      }
      const sessionId = crypto.randomUUID();
      const accessToken = tokenService.generateAccessToken(user);
      const refreshToken = tokenService.generateRefreshToken(user, sessionId);
      const hashedRefreshToken =
        await passwordHelper.hashPassword(refreshToken);

      const parser = new UAParser(sessionContext.userAgent);
      const parsedDevice = parser.getResult();
      const deviceName = [parsedDevice.browser.name, parsedDevice.os.name]
        .filter(Boolean)
        .join(" on ") || "unknown";

      const createSession = await sessionRepo.createSession({
        id: sessionId,
        userId: user.id,
        refreshTokenHash: hashedRefreshToken,
        deviceId: sessionContext.deviceId,
        deviceName: deviceName,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      if (!createSession) {
        return {
          success: false,
          message: "error in updating refresh token",
        };
      }

      return {
        success: true,
        user: user,
        accessToken: accessToken,
        refreshToken: refreshToken,
        session: createSession,
      };
    } catch (error) {
      logger.error(`verify password service  ${error}`);
      throw error;
    }
  },
};
export default authService;
