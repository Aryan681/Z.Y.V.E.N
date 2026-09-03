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
import redisService from "../services/redis.service.js";
import qrCodeGenerator from "../utils/qrCode.js";
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
      const accessToken = tokenService.generateAccessToken(user,sessionId);

      const refreshToken = tokenService.generateRefreshToken(user, sessionId);

      // 3. Hash refresh token before storing it
      const hashedRefreshToken = tokenHelper.hashToken(refreshToken);

      // 4. Parse device information
      const parser = new UAParser(sessionContext.userAgent);

      const parsedDevice = parser.getResult();

      const deviceName =
        [parsedDevice.browser.name, parsedDevice.os.name]
          .filter(Boolean)
          .join(" on ") || "unknown";

      // 5. Create session
      const createSession = await sessionRepo.createSession({
        sessionId,
        userId: user.id,
        refreshTokenHash: hashedRefreshToken,
        deviceId: sessionContext.deviceId,
        deviceName,
        ipAddress: sessionContext.ipAddress,
        userAgent: sessionContext.userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
      logger.error({ error }, "Create authenticated session error");

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
          message: "Invalid email or password",
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
          message: "Invalid email or password",
        };
      }
      if (user.is_2fa_enabled) {
        const twoFaToken = await authService.generate2faToken(user);
        if (!twoFaToken) {
          return {
            success: false,
            message: "Error generating 2fa token",
          };
        }
        return {
          success: true,
          requires2FA: true,
          twoFaToken,
        };
      }
      // Everything after authentication is shared
      const result = await authService.createAuthenticatedSession(
        user,
        sessionContext,
      );
      return result;
    } catch (error) {
      logger.error(`verify password service  ${error}`);
      throw error;
    }
  },
  rotateRefreshToken: async (refreshToken) => {
    try {
      // 1. Verify the refresh JWT cryptographically
      const decoded = tokenService.verifyRefreshToken(refreshToken);
      const incomingTokenHash = tokenHelper.hashToken(refreshToken);

      // 2. Fetch the session directly by decoded.sid
      const session = await sessionRepo.findBySessionId(decoded.sid);

      // Case A: Session does not exist or was explicitly revoked
      if (
        !session ||
        session.revoked_at ||
        new Date() > new Date(session.expires_at)
      ) {
        return {
          success: false,
          message: "Session expired or invalid",
        };
      }

      // Case B: 🚨 REUSE DETECTION
      // The session exists, but the incoming token is NOT the current active token!
      if (session.refresh_token_hash !== incomingTokenHash) {
        logger.warn(
          `🚨 REFRESH TOKEN REUSE DETECTED for user ${decoded.sub} on session ${decoded.sid}`,
        );

        // 1. Terminate all active sessions for this compromised account
        await sessionRepo.revokeAllUserSessions(decoded.sub);

        // 2. Fetch user to send alert email
        const user = await userRepo.findUserById(decoded.sub);
        if (user) {
          try {
            await emailService.sendSecurityAlertMail(
              user.email,
              "Security Alert: Suspicious Session Activity Detected",
              "We detected an attempt to use an outdated session token on your account. As a precaution, all your active sessions have been terminated. If this was not you, please log in and change your password immediately.",
            );
          } catch (mailErr) {
            logger.error(`Failed to send breach notification: ${mailErr}`);
          }
        }

        return {
          success: false,
          message:
            "Suspicious activity detected. All active sessions have been terminated for security.",
        };
      }

      // Case C: Normal Rotation (Token matches current session)
      const newRefreshToken = tokenService.generateRefreshToken(
        { id: session.user_id },
        session.session_id,
      );
      const newAccessToken = tokenService.generateAccessToken({
        id: session.user_id,
        sessionId: session.session_id,
      });

      const newRefreshTokenHash = tokenHelper.hashToken(newRefreshToken);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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

      return {
        success: true,
        accessToken: `Bearer ${newAccessToken}`,
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
          message: "Invalid email or password",
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
          message: "Invalid email or password",
        };
      }
      const hashedPassword = await passwordHelper.hashPassword(newPasswrod);
      const updatedUser = await userRepo.updatePassword(userId, hashedPassword);
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
      const generatedUrl = urlHelper.generateResetPasswordUrl(resetToken);
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
  changeEmail: async (email, userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        logger.warn(`User not found with the user id ${userId}`);
        return {
          success: false,
          message: "If an account exists , a email reset link has been sent",
        };
      }
      if (user.email === email) {
        return {
          success: false,
          message: "New email must be different from current email",
        };
      }
      const emailExists = await userRepo.findUserByEmail(email);
      if (emailExists) {
        return {
          success: false,
          message: "Email already exists",
        };
      }
      const verificationCode = tokenHelper.generateVerificationCode();
      const hashedCode = tokenHelper.hashToken(verificationCode);

      const oldEmailVefificationCode = tokenHelper.generateVerificationCode();
      const oldEmailHashedCode = tokenHelper.hashToken(
        oldEmailVefificationCode,
      );

      const key = `email:change:${user.id}`;
      const emailChangeData = JSON.stringify({
        currentEmail: user.email,
        newEmail: email,
        newCodeHash: hashedCode,
        oldCodeHash: oldEmailHashedCode,
        attempts: 0,
      });
      await redisService.setWithExpiry(key, emailChangeData, 600);
      const newMailVerification = await emailService.sendEmailChangeMail(
        email,
        verificationCode,
        true,
      );
      const oldMailVerification = await emailService.sendEmailChangeMail(
        user.email,
        oldEmailVefificationCode,
        false,
      );

      if (!newMailVerification || !oldMailVerification) {
        logger.warn(`Email change failed for email: ${email}`);
        await redisService.del(key);
        return {
          success: false,
          message: "Email change failed",
        };
      }
      return {
        success: true,
        message: "verification code sent successfully",
      };
    } catch (error) {
      logger.error(`Error occur in the change email service${error} `);
      throw error;
    }
  },
  changeEmailVerify: async (old_code, new_code, userId) => {
    try {
      const key = `email:change:${userId}`;
      const emailChangeData = await redisService.get(key);
      if (!emailChangeData) {
        return {
          success: false,
          message: "Email change request expired or not found",
        };
      }

      const data = JSON.parse(emailChangeData);
      
      const inputOldHash = tokenHelper.hashToken(old_code);
      const inputNewHash = tokenHelper.hashToken(new_code);

      if (data.attempts >= 3) {
        await redisService.del(key);
        return {
          success: false,
          message: "Too many failed attempts. Please request a new code.",
        };
      }

      if (
        inputOldHash !== data.oldCodeHash ||
        inputNewHash !== data.newCodeHash
      ) {
        data.attempts += 1;
        // Re-save with remaining TTL
        await redisService.setWithExpiry(key, JSON.stringify(data), 600);
        return {
          success: false,
          message: `Invalid code. ${3 - data.attempts} attempts remaining.`,
        };
      }

      const emailExists = await userRepo.findUserByEmail(
       data.newEmail,
      );
      if (emailExists && emailExists.id !== userId) {
        await redisService.del(key);
        return {
          success: false,
          message: "Email already taken by another account",
        };
      }

      // Notify the old email address about the change before updating
      try {
        await emailService.sendEmailChangeNotification(
         data.currentEmail,
         data.newEmail,
        );
      } catch (notifyErr) {
        logger.error(
          `Failed to send email change notification to old email: ${notifyErr}`,
        );
      }

      const updatedEmail = await userRepo.updateEmail(
        userId,
       data.newEmail,
      );
      if (!updatedEmail) {
        logger.error("Failed to update user email");

        return {
          success: false,
          message: "Unable to update user email",
        };
      }
      await sessionRepo.revokeAllUserSessions(userId);
      await redisService.del(key);
      return {
        success: true,
        message: "Email updated successfully",
      };
    } catch (error) {
      logger.error(`Error occur in the change email verify service${error} `);
      throw error;
    }
  },
  logout: async(userId ,scope, sessionId,currentSessionId)=>{
    try{
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!scope) {
        return {
          success: false,
          message: "Invalid scope",
        };
      }
      if (scope === "currentSession" && !currentSessionId) {
        return {
          success: false,
          message: "Current session ID is required",
        };
      }
      if (scope === "sessionId" && !sessionId) {
        return {
          success: false,
          message: "Session ID is required",
        };
      }
      if(scope === "currentSession"){
        const revoke = await sessionRepo.revokeSession(currentSessionId,userId);
        if(!revoke){
          return {
            success: false,
            message: "Failed to revoke session",
          };
        }
        const logoutTime = new Date()/1000;
        await redisService.setSessionLogout(currentSessionId,logoutTime,1200);
        logger.info(`revokeSession ${revoke}`);

      }else if(scope === "allSessions"){
        const revoke = await sessionRepo.revokeAllUserSessions(userId);
        const logoutTime = new Date()/1000;
        await redisService.setUserLogout(userId,logoutTime,1200);
        if(!revoke){
          return {
            success: false,
            message: "Failed to revoke all sessions",
          };
        }
        logger.info(`revokeSession ${revoke}`);

      }else if(scope === "sessionId"){
        const revoke = await sessionRepo.revokeSession(sessionId,userId);
        const logoutTime = new Date()/1000;
        await redisService.setSessionLogout(sessionId,logoutTime,1200);
        if(!revoke){
          return {
            success: false,
            message: "Failed to revoke session",
          };
        }
        logger.info(`revokeSession ${revoke}`);

      }else if(scope === "allExceptCurrent"){
        const revokedSessions = await sessionRepo. revokeAllSessionsExceptCurrent(userId,currentSessionId);
        if(!revoke){
          return {
            success: false,
            message: "Failed to revoke all sessions",
          };
        }
        const logoutTime = Math.floor(
          Date.now() / 1000,
        );

        // session that was revoked.
        for (const session of revokedSessions) {
          await redisService.setSessionLogout(
            session.session_id,
            logoutTime,
            1200, 
          );
        }
        logger.info(`revokeSession ${revoke}`);

      }else{
        return {
          success: false,
          message: "Invalid scope",
        };
      }
      await  emailService.sendLogoutMail(
        user.email,
        "Your  have been from your account successfully",
      );

      return {
        success: true,
        message: "Successfully revoked session",
      };
      

    } catch (error) {
      logger.error(`Error occur in the logout service${error} `);
      throw error;
    }
  },
  allSessions: async (userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.is_verified) {
        return {
          success: false,
          message: "User not verified",
        };
      }
      const sessions = await sessionRepo.findByUserId(userId);
      if (!sessions) {
        return {
          success: false,
          message: "No active sessions",
        };
      }
      return {
        success: true,
        sessions,
      };
    } catch (error) {
      logger.error(`Error occur in the allSessions service${error} `);
      throw error;
    } 
  },
  twofaSetup: async (userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.is_verified) {
        return {
          success: false,
          message: "User not verified",
        };
      }
      const twofaSecret = tokenHelper.generateSecret();
      const hashedSecret = tokenHelper.encryptSecret(twofaSecret);
      const twofaQrCodeUrl = urlHelper.generateQrCodeUrl(twofaSecret,user.email);
      console.log("adfasdfasdfdsfasdf");
      const qrCode = await qrCodeGenerator.generateQrCode(twofaQrCodeUrl);
      await userRepo.updateTwofaSecret(userId, hashedSecret);
      return {
        success: true,
        qrCode,
      };
    } catch (error) {
      logger.error(`Error occur in the twofaSetup service${error} `);
      throw error;
    } 
  },
  enableTwofa: async (userId,otp) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.is_verified) {
        return {
          success: false,
          message: "User not verified",
        };
      }
      if (!user.twofa_secret) {
        return {
          success: false,
          message: "Complete 2FA setup before enabling 2FA",
        };
      }
      const decryptedSecret = tokenHelper.decryptSecret(user.twofa_secret);
      if (!decryptedSecret) {
        return {
          success: false,
          message: "Invalid secret",
        };
      }
      const valid = await tokenHelper.verifyOtp(decryptedSecret, otp);
      if (!valid) {
        return {
          success: false,
          message: "Invalid OTP",
        };
      }
     
      await userRepo.update2faStatus(userId,true);
      return {
        success: true,
        message: "Twofa enabled successfully",
      };
    }catch (error) {
      logger.error(`Error occur in the twofaEnable service${error} `);
      throw error;  
   }
  },
  twofaStatus: async (userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.is_verified) {
        return {
          success: false,
          message: "User not verified",
        };
      }
      if (!user.twofa_secret) {
        return {
          success: false,
          message: "Complete 2FA setup before enabling 2FA",
        };
      }
      return {
        success: user.is_2fa_enabled,
        message: `2FA is ${user.is_2fa_enabled ? "enabled" : "disabled"}`,
      };
    }catch (error) {
      logger.error(`Error occur in the twofaStatus service${error} `);
      throw error;  
   }
  },  
  disableTwofa: async (userId,otp) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.is_verified) {
        return {
          success: false,
          message: "User not verified",
        };
      }
      if (!user.twofa_secret && !user.is_2fa_enabled) {
        return {
          success: false,
          message: "alredy disabled or havednt setup 2FA",
        };
      }
      const decryptedSecret = tokenHelper.decryptSecret(user.twofa_secret);
      if (!decryptedSecret) {
        return {
          success: false,
          message: "Invalid secret",
        };
      }
      const valid = await tokenHelper.verifyOtp(decryptedSecret, otp);
      if (!valid) {
        return {
          success: false,
          message: "Invalid OTP",
        };
      }
      await userRepo.update2faStatus(userId,false);
      return {
        success: true,
        message: "Twofa disabled successfully",
      };
    }catch (error) {
      logger.error(`Error occur in the twofaDisable service${error} `);
      throw error;  
   }
  }, 
  twofaVerify: async (token,otp,sessionContext) => {
    try {
      const decoded = tokenService.verifyTwofaToken(token);
      if (!decoded.success) {
        return {
          success: decoded.success,
          message: decoded.message || "token is invalid",
        };
      }
      const user = await userRepo.findUserById(decoded.sub);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.twofa_secret) {
        return {
          success: false,
          message: "Complete 2FA setup  ",
        };
      }
      const decryptedSecret = tokenHelper.decryptSecret(user.twofa_secret);
      if (!decryptedSecret) {
        return {
          success: false,
          message: "Invalid secret",
        };
      }
      const valid = await tokenHelper.verifyOtp(decryptedSecret, otp);
      if (!valid) {
        return {
          success: false,
          message: "Invalid OTP",
        };
      }
       const result = await authService.createAuthenticatedSession(
        user,
        sessionContext,
      );
      return {
        success: true,
        result,
      };
    }catch (error) {
      logger.error(`Error occur in the twofaVerify service${error} `);
      throw error;  
   }
  },
  generate2faToken: async (user) => {
    try {

      // 2. Generate your application JWTs
      const twoFaToken = tokenService.generateTwofaToken(user);
      if (!twoFaToken) {
        return {
          success: false,
          message: "Error generating 2fa token",
        };
      }
      return twoFaToken;

    } catch (error) {
      logger.error(`Error occur in the generate2faToken service${error} `);
      throw error;
    }
  },
  deleteAccount: async (userId,reason) => {
    try{
      const user = await userRepo.findUserById(userId);
      if (!user) { 
        return {
          success: false,
          message: "Invalid user",
        };
      }
      const softDelete = await userRepo.softDeleteUser(userId,reason);
      if (!softDelete) {
        return {
          success: false,
          message: "Failed to soft delete user",
        };
      }
      const logoutTime = new Date()/1000;
      await redisService.setUserLogout(userId,logoutTime,1200);
    

      return {
        success: true,
        message: "User soft deleted successfully",
      };

    } catch (error) {
      logger.error(`Error occur in the deleteAccount service: ${error} `);
      throw error;
    }
  },
  generateRecoveryCodes: async (userId) => {
    try {
      const user = await userRepo.findUserById(userId);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      const recoveryCodes = tokenHelper.generateRecoveryCodes();
      const hashedRecoveryCodes = tokenHelper.encryptSecret(recoveryCodes);
      await userRepo.updateRecoveryCodes(userId, hashedRecoveryCodes);
      return {
        success: true,
        recoveryCodes,
      };
    } catch (error) {
      logger.error(`Error occur in the generateRecoveryCodes service: ${error} `);
      throw error;
    }
  },
  twofaRecoveryVerify: async (token, recoveryCode,sessionContext) => {
    try {
       const decoded = tokenService.verifyTwofaToken(token);
      if (!decoded) {
        return {
          success: false,
          message: "token is invalid",
        };
      }
      const user = await userRepo.findUserById(decoded.sub);
      if (!user) {
        return {
          success: false,
          message: "Invalid user",
        };
      }
      if (!user.twofa_secret) {
        return {
          success: false,
          message: "Complete 2FA setup  ",
        };
      }
      let recoveryCodes = user.recovery_codes; //encrypted recovery codes
      const decryptedCodes = tokenHelper.decryptSecret(recoveryCodes);//decrypted recovery codes
      const matchedIndex = decryptedCodes.indexOf(recoveryCode);
      if (matchedIndex === -1) { 
        return {
          success: false, 
          message: "Invalid recovery code",
        };
      }
      decryptedCodes.splice(matchedIndex, 1); 
      recoveryCodes.splice(matchedIndex, 1);
      await userRepo.updateRecoveryCodes(decoded.sub, recoveryCodes); //update recovery codes 
      const result = await authService.createAuthenticatedSession(
        user,
        sessionContext,
      );
      return {
        success: true,
        result,
      };
    } catch (error) {
      logger.error(`Error occur in the twofaRecoveryVerify service: ${error} `);
      throw error;
    }
  },  
};
export default authService;
