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
  createAuthenticatedSession: async (user, sessionContext) => {
  try {
    // 1. Generate session ID
    const sessionId = crypto.randomUUID();

    // 2. Generate your application JWTs
    const accessToken = tokenService.generateAccessToken(user);

    const refreshToken = tokenService.generateRefreshToken(
      user,
      sessionId,
    );

    // 3. Hash refresh token before storing it
    const hashedRefreshToken =
      tokenHelper.hashToken(refreshToken);

    // 4. Parse device information
    const parser = new UAParser(
      sessionContext.userAgent,
    );

    const parsedDevice = parser.getResult();

    const deviceName =
      [
        parsedDevice.browser.name,
        parsedDevice.os.name,
      ]
        .filter(Boolean)
        .join(" on ") || "unknown";

    // 5. Create session
    const createSession =
      await sessionRepo.createSession({
        sessionId,
        userId: user.id,
        refreshTokenHash: hashedRefreshToken,
        deviceId: sessionContext.deviceId,
        deviceName,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        expiresAt: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ),
      });

    if (!createSession) {
      return {
        success: false,
        message: "Error creating user session",
      };
    }

    return {
      success: true,
      user,
      accessToken: `Bearer ${accessToken}`,
      refreshToken,
      session: createSession,
    };
  } catch (error) {
    logger.error(
      { error },
      "Create authenticated session error",
    );

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
    

      // Everything after authentication is shared
    const result =await authService.createAuthenticatedSession(
      user,
      sessionContext,
    );
      return result
    } catch (error) {
      logger.error(`verify password service  ${error}`);
      throw error;
    }
  },
  rotateRefreshToken: async (refreshToken) => {
    try {
      // 1. Verify the refresh JWT
      const decoded = tokenService.verifyRefreshToken(refreshToken);

      // 2. Hash the incoming refresh token
      const refreshTokenHash = tokenHelper.hashToken(refreshToken);

      // 3. Find the active session
      const session =
        await sessionRepo.findByRefreshTokenHash(refreshTokenHash);

      if (!session) {
        logger.warn("Invalid refresh token or refresh token reuse detected");

        return {
          success: false,
          message: "Invalid refresh token",
        };
      }

      // 4. Make sure the token belongs to this session
      if (decoded.sid !== session.session_id) {
        logger.warn("Refresh token session mismatch");

        return {
          success: false,
          message: "Invalid refresh token",
        };
      }

      // 5. Generate a NEW refresh token
      const newRefreshToken = tokenService.generateRefreshToken(
        { id: session.user_id },
        session.session_id,
      );

      logger.info(`New refresh token generated`);

      // 6. Hash the NEW refresh token
      const newRefreshTokenHash = tokenHelper.hashToken(newRefreshToken);

      // 7. Set the new refresh-token expiry
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // 8. Replace the old refresh-token hash
      const updatedSession = await sessionRepo.updateRefreshToken(
        session.session_id,
        newRefreshTokenHash,
        expiresAt,
      );

      if (!updatedSession) {
        logger.error("Failed to update session during refresh-token rotation");

        return {
          success: false,
          message: "Unable to rotate refresh token",
        };
      }

      // 9. Generate a NEW access token
      const accessToken = tokenService.generateAccessToken({
        id: session.user_id,
      });

      // 10. Return new credentials
      return {
        success: true,
        accessToken:`Bearer ${accessToken}`,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      logger.error("Rotate refresh token service error", error);

      throw error;
    }
  },
  passwordReset: async (oldPassword, newPasswrod, userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        logger.warn(`User not found with the user id ${userId}`);
        return {
          success: false,
          message: "User not found",
        };
      }
      const passwordMatch = await passwordHelper.verifyPassword(
        oldPassword,
        user.password,
      );
      if (!passwordMatch) {
        logger.warn(`Password not match with the user ${user.email}`);
        return {
          success: false,
          message: "Password not match",
        };
      }
      const hashedPassword = await passwordHelper.hashPassword(newPasswrod);
      const updatedUser = await userRepo.updatePassword(
        userId,
        hashedPassword,
      );
      if (!updatedUser) {
        logger.error("Failed to update user password");

        return {
          success: false,
          message: "Unable to update user password",
        };
      }
      await sessionRepo.revokeAllUserSessions(user.id);
      return {
        success: true,
        message: "Password updated successfully",
      };
    } catch (error) {
      logger.error(`Error occur in the password reset service${error} `);
      throw error;
    }
  },
  forgotPassword: async (email) => {
    try {
      const user = await userRepo.findUserByEmail(email);
      if (!user) {
        logger.warn(`User not found with the email ${email}`);
        return {
          success: true,
          message:
            "If an account exists with this email, a reset link has been sent",
        };
      }
      const resetToken = tokenHelper.generateVerificationToken();
      const tokenExpire = new Date(Date.now() + 10 * 60 * 1000);
      await userRepo.updateResetToken(user.id, resetToken, tokenExpire);
      const generatedUrl =
        urlHelper.generateResetPasswordUrl(resetToken);
      await emailService.sendPasswordResetMail(email, generatedUrl);
      logger.info(`Reset password link sent successfully: ${email}`);
      return {
        success: true,
        message: "Reset password link sent successfully",
      };
    } catch (error) {
      logger.error(`Error occur in the forgot password service${error} `);
      throw error;
    }
  },
  changePassword: async (newPassword, token) => {
    try {
      const user = await userRepo.findUserByResetToken(token);
      if (!user) {
        logger.warn(`User not found with the token ${token}`);
        return {
          success: false,
          message: "Invalid or expired token",
        };
      }
      if (new Date() > new Date(user.reset_token_expires)) {
        return {
          success: false,
          message: "Reset token expired",
        };
      }
      await userRepo.updateResetToken(user.id, null, null);
      const hashedPassword = await passwordHelper.hashPassword(newPassword);
      const updatedUser = await userRepo.updatePassword(
        user.id,
        hashedPassword,
      );
      if (!updatedUser) {
        logger.error("Failed to update user password");

        return {
          success: false,
          message: "Unable to update user password",
        };
      }
      await sessionRepo.revokeAllUserSessions(user.id);
      return {
        success: true,
        message: "Password updated successfully",
      };
    } catch (error) {
      logger.error(`Error occur in the change password service${error} `);
      throw error;
    }
  },
};
export default authService;