import googleConfig from "../config/google.js";
import logger from "../config/logger.js";
import redisService from "./redis.service.js";
import crypto from "crypto";
import { google } from "googleapis";

import userRepo from "../repos/user/user.js";
import authService from "./auth.service.js";

// Create OAuth client

const createOAuthClient = (redirectUri) => {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    redirectUri,
  );
};

const googleService = {
  // Exchange Google authorization code for tokens

  exchangeCode: async (code, redirectUri) => {
    try {
      const oauth2Client = createOAuthClient(redirectUri);

      const { tokens } = await oauth2Client.getToken(code);

      if (!tokens.access_token) {
        throw new Error("Google access token was not returned");
      }

      return tokens;
    } catch (error) {
      logger.error(
        {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        },
        "Failed to exchange Google authorization code",
      );

      throw new Error(
        `Failed to exchange Google authorization code: ${error.message}`,
      );
    }
  },

  // Get Google user information

  getGoogleUser: async (accessToken) => {
    try {
      const oauth2Client = createOAuthClient(googleConfig.redirectUri);

      oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: "v2",
      });

      const { data } = await oauth2.userinfo.get();

      if (!data.id || !data.email) {
        throw new Error("Google account information is incomplete");
      }

      return {
        googleId: data.id,
        email: data.email,
        name: data.name || "",
        emailVerified: data.verified_email === true,
        picture: data.picture || null,
      };
    } catch (error) {
      logger.error(
        {
          message: error.message,
        },
        "Failed to get Google user information",
      );

      throw new Error("Failed to retrieve Google user information");
    }
  },

  // Generate Google Login Authorization URL

  generateGoogleAuthUrl: async () => {
    try {
      // 1. Generate secure random state
      const state = crypto.randomBytes(32).toString("hex");

      // 2. Redis key
      const redisKey = `google:login:state:${state}`;

      // 3. Store state for 10 minutes
      await redisService.setWithExpiry(redisKey, "1", 600);

      // 4. Google authorization parameters
      const params = new URLSearchParams({
        client_id: googleConfig.clientId,
        redirect_uri: googleConfig.redirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
      });

      // 5. Generate Google URL
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      logger.info("Google login authorization URL generated");

      return {
        success: true,
        authUrl,
      };
    } catch (error) {
      logger.error(
        {
          message: error.message,
          stack: error.stack,
        },
        "Google login authorization URL generation failed",
      );

      throw error;
    }
  },

  // Handle Google Login Callback

  handleGoogleCallback: async (code, state, sessionContext) => {
    try {
      logger.debug("Google login callback started");

      // 1. Verify OAuth state

      const stateKey = `google:login:state:${state}`;

      const storedState = await redisService.get(stateKey);

      if (!storedState) {
        logger.warn("Invalid or expired Google login state");

        return {
          success: false,
          message: "Invalid or expired OAuth request",
        };
      }

      // 2. Consume state

      await redisService.del(stateKey);

      logger.debug("Google login state consumed");

      // 3. Exchange code for Google tokens

      const tokens = await googleService.exchangeCode(
        code,
        googleConfig.redirectUri,
      );

      logger.debug("Google authorization code exchanged");

      // 4. Get Google user

      const googleUser = await googleService.getGoogleUser(tokens.access_token);

      logger.debug(
        {
          googleId: googleUser.googleId,
          email: googleUser.email,
        },
        "Google user retrieved",
      );

      // 5. Make sure Google email is verified

      if (!googleUser.emailVerified) {
        logger.warn(
          {
            email: googleUser.email,
          },
          "Google email is not verified",
        );

        return {
          success: false,
          message: "Google email is not verified",
        };
      }

      // 6. Find existing Google account

      let user = await userRepo.findUserByGoogleId(googleUser.googleId);

      // 7. If Google account doesn't exist

      if (!user) {
        // Check whether email already exists
        const existingUser = await userRepo.findUserByEmail(googleUser.email);

        // Existing local account
        if (existingUser) {
          logger.info(
            {
              email: googleUser.email,
            },
            "Google email already belongs to local account",
          );

          return {
            success: false,
            message:
              "An account with this email already exists. Please login and link Google.",
          };
        }

        // Create new local Google account
        user = await userRepo.createGoogleUser(
          googleUser.name,
          googleUser.email,
          googleUser.googleId,
        );

        if (!user) {
          throw new Error("Failed to create Google user");
        }

        logger.info(
          {
            userId: user.id,
            email: user.email,
          },
          "Google user created",
        );
      }

      // 8. Create application session

      logger.debug(
        {
          userId: user.id,
        },
        "Creating authenticated session",
      );

      const authResult = await authService.createAuthenticatedSession(
        user,
        sessionContext,
      );

      // 9. Return application credentials

      return {
        success: true,
        user,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        session: authResult.session,
      };
    } catch (error) {
      logger.error(
        {
          message: error.message,
          stack: error.stack,
        },
        "Google login callback service failed",
      );

      throw error;
    }
  },

  // Generate Google Link Authorization URL

  generateGoogleLinkAuthUrl: async (userId) => {
    try {
      // 1. Generate secure OAuth state

      const state = crypto.randomBytes(32).toString("hex");

      // 2. Store user ID against state

      const redisKey = `google:link:state:${state}`;

      await redisService.setWithExpiry(redisKey, String(userId), 600);

      // 3. Google authorization parameters

      const params = new URLSearchParams({
        client_id: googleConfig.clientId,
        redirect_uri: googleConfig.linkRedirectUri,
        response_type: "code",
        scope: "openid email profile",
        state,
      });

      // 4. Generate Google URL

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      logger.info(
        {
          userId,
        },
        "Google link authorization URL generated",
      );

      return {
        success: true,
        authUrl,
      };
    } catch (error) {
      logger.error(
        {
          message: error.message,
          stack: error.stack,
          userId,
        },
        "Google link authorization URL generation failed",
      );

      throw error;
    }
  },

  // Handle Google Link Callback

  handleGoogleLinkCallback: async (code, state) => {
    try {
      logger.debug("Google link callback started");

      // 1. Find user ID from Redis

      const redisKey = `google:link:state:${state}`;

      const userId = await redisService.get(redisKey);

      // 2. Verify state

      if (!userId) {
        logger.warn("Invalid or expired Google link state");

        return {
          success: false,
          message: "Invalid or expired Google link request",
        };
      }

      // 3. Consume state

      await redisService.del(redisKey);

      logger.debug(
        {
          userId,
        },
        "Google link state consumed",
      );

      // 4. Exchange code for Google tokens

      const tokens = await googleService.exchangeCode(
        code,
        googleConfig.linkRedirectUri,
      );

      logger.debug("Google link authorization code exchanged");

      // 5. Get Google user

      const googleUser = await googleService.getGoogleUser(tokens.access_token);

      logger.debug(
        {
          googleId: googleUser.googleId,
          email: googleUser.email,
        },
        "Google user retrieved for linking",
      );

      // 6. Verify Google email

      if (!googleUser.emailVerified) {
        return {
          success: false,
          message: "Google email is not verified",
        };
      }

      // 7. Check whether Google account
      //    is already linked

      const existingGoogleUser = await userRepo.findUserByGoogleId(
        googleUser.googleId,
      );

      if (existingGoogleUser) {
        // If it belongs to the same user
        if (Number(existingGoogleUser.id) === Number(userId)) {
          return {
            success: false,
            message: "This Google account is already linked to your account",
          };
        }

        // It belongs to another user
        return {
          success: false,
          message: "This Google account is already linked to another account",
        };
      }

      // 8. Verify local user exists

      const user = await userRepo.findUserById(Number(userId));

      if (!user) {
        logger.warn(
          {
            userId,
          },
          "User not found while linking Google account",
        );

        return {
          success: false,
          message: "Invalid email or password",
        };
      }

      // 9. Link Google account

      const linkedUser = await userRepo.linkGoogle(
        Number(userId),
        googleUser.googleId,
      );

      if (!linkedUser) {
        logger.error(
          {
            userId,
          },
          "Failed to link Google account",
        );

        return {
          success: false,
          message: "Unable to link Google account",
        };
      }

      // 10. Success

      logger.info(
        {
          userId,
          googleId: googleUser.googleId,
        },
        "Google account linked successfully",
      );

      return {
        success: true,
        userId: Number(userId),
      };
    } catch (error) {
      logger.error(`Google link callback service failed ${error}`);
    

      throw error;
    }
  },
};

export default googleService;
