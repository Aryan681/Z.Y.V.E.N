import responseHelper from "../utils/response.js";
import logger from "../config/logger.js";
import authService from "../services/auth.service.js";
import defaults from "../constants/defaults.js";
import googleService from "../services/google.service.js";
const authController = {
  registration: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const result = await authService.registration(name, email, password);

      if (!result) {
        logger.warn(`Registration failed. Email already exists: ${email}`);
        return responseHelper.customResponse(
          res,
          defaults.CONFLICT_CODE,
          "Registration failed",
          { error: "Email already exists" },
        );
      }
      req.log.info(`User registered successfully: ${email}`);

      return responseHelper.customResponse(
        res,
        defaults.CREATED_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: "User registered successfully" },
      );
    } catch (error) {
      logger.error("Registration Controller Error", error);

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: "An internal server error occurred",
        },
      );
    }
  },
  verify: async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "token is missing from the url or invalid Token" },
        );
      }
      const result = await authService.verification(token);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.CONFLICT_CODE,
          result.message,
          { error: result.message },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        {
          message: "User verified successfully",
        },
      );
    } catch (error) {
      logger.error(`error occur in the verification controller ${error} `);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  resendLink: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        logger.warn("user email is missing :", email);
        return responseHelper.customResponse(
          res,
          defaults.CONFLICT_CODE,
          defaults.ERROR_MESSAGE,
          { error: "user email is missing" },
        );
      }
      const resent = await authService.resendVerificationUrl(email);
      if (!resent.success) {
        return responseHelper.customResponse(
          res,
          defaults.CONFLICT_CODE,
          resent.message,
          { error: resent.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: "Verification email sent successfully." },
      );
    } catch (error) {
      logger.error(`Resend verification controller error ${error}`);

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "fail to sent the verification link" },
      );
    }
  },
  login: async (req, res) => {
    try {
      const { email, password, deviceId } = req.body;
      if (!email || !password) {
        logger.warn("one of the field is missing ");
        return responseHelper.customResponse(
          res,
          defaults.CONFLICT_CODE,
          defaults.ERROR_MESSAGE,
          { error: "please enter email and password" },
        );
      }
      const sessionContext = {
        deviceId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "unknown",
      };
      const verifying = await authService.login(
        email,
        password,
        sessionContext,
      );

      if (!verifying.success) {
        logger.warn(`Login failed for email: ${email}`);
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          "Authentication failed",
          {
            error: verifying.message,
          },
        );
      }
      if (verifying.requires2FA) {
        return responseHelper.customResponse(
          res,
          defaults.OK_CODE,
          defaults.SUCCESS_MESSAGE,
          {
            message: "2FA verification required",
            requires2FA: true,
            twoFaToken: `Bearer ${verifying.twoFaToken}`,
          },
        );
      }
      req.log.info(`User login successfully: ${email}`);
      res.cookie("refreshToken", verifying.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        {
          message: "user login successfully",
          accessToken: verifying.accessToken,
          session: verifying.session,
        },
      );
    } catch (error) {
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: "An internal server error occurred",
        },
      );
    }
  },
  rotateRefreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "refresh token is missing from or  invalid Token" },
        );
      }
      const result = await authService.rotateRefreshToken(refreshToken);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        {
          message: "Refresh token rotated successfully",
          accessToken: result.accessToken,
          session: result.session,
        },
      );
    } catch (error) {
      logger.error(
        `error occur in the rotation refresh token controller${error} `,
      );
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  googleRegistration: async (req, res) => {
    try {
      const result = await googleService.generateGoogleAuthUrl();
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(
        `error occur in the google registration controller${error} `,
      );
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  googleCallback: async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "code and state are missing from the url" },
        );
      }

      const sessionContext = {
        ipAddress: req.ip,
        userAgent: req.get("user-agent") || "unknown",
        deviceId: req.get("x-device-id") || "unknown",
      };

      const result = await googleService.handleGoogleCallback(
        code,
        state,
        sessionContext,
      );
      if (!result.success) {
        logger.warn(`Google callback failed for code: ${code}`);
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      logger.info(`Google callback successful for code`);
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error occur in the google callback controller${error} `);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  googleLink: async (req, res) => {
    try {
      const userId = req.user.sub;

      const result = await googleService.generateGoogleLinkAuthUrl(userId);

      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          {
            error: result.message,
          },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error({ error }, "Error in Google link controller");

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: "An internal server error occurred",
        },
      );
    }
  },
  googleLinkCallback: async (req, res) => {
    try {
      const { code, state } = req.query;
      if (!code || !state) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "code and state are missing from the url" },
        );
      }

      const result = await googleService.handleGoogleLinkCallback(code, state);

      if (!result.success) {
        logger.warn(`Google link callback failed for code: ${code}`);
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error({ error }, "Error in Google link callback controller");

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: defaults.SERVER_ERROR_MESSAGE,
        },
      );
    }
  },
  passwordReset: async (req, res) => {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "old password and new password are missing from the url" },
        );
      }
      const result = await authService.passwordReset(
        oldPassword,
        newPassword,
        req.user.sub,
      );
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error occur in the password reset controller${error} `);

      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: "An internal server error occurred",
        },
      );
    }
  },
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      const result = await authService.forgotPassword(email);

      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the fogotPassword contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.INTERNAL_SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  changePassword: async (req, res) => {
    try {
      const { token } = req.query;
      if (!token) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          defaults.ERROR_MESSAGE,
          { error: "token is missing from the url or invalid Token" },
        );
      }
      const { newPassword } = req.body;

      const result = await authService.changePassword(newPassword, token);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the change password contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.INTERNAL_SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  emailChange: async (req, res) => {
    try {
      const { email } = req.body;

      const result = await authService.changeEmail(email,req.user.sub);

      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }

      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    }catch (error) {
      logger.error(`error Occure in the change email contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.INTERNAL_SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  emailChangeVerify: async (req, res) => {
    try{
      const { old_code, new_code } = req.body;
      const restult  = await authService.changeEmailVerify(old_code,new_code,req.user.sub);
      if (!restult.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          restult.message,
          { error: restult.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: restult },
      );

    }catch (error) {
      logger.error(`error Occure in the change email contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.INTERNAL_SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  logout: async (req, res) => {
    try{
      const userId = req.user.sub;
      const {scope ,  session_id,current_session_id } = req.body;
       const result = await authService.logout(userId,scope,session_id, current_session_id);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      )

    } catch (error) {
      logger.error(`error Occure in the logout contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  allSessions: async (req, res) => {
    try{
      const userId = req.user.sub;
      const result = await authService.allSessions(userId);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the allSessions contorller${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  twofaSetup: async (req,res) => {
    try{
      const userId = req.user.sub;
      const result = await authService.twofaSetup(userId);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the enableTwofa controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  enableTwofa: async (req,res) => {
    try{
      const userId = req.user.sub;
      const {otp} = req.body;
      const result = await authService.enableTwofa(userId,otp);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the twofaSetup controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  twofaStatus: async (req,res) => {
    try{
      const userId = req.user.sub;
      const result = await authService.twofaStatus(userId);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the twofaStatus controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  disableTwofa: async (req,res) => {
    try{
      const userId = req.user.sub;
      const {otp} = req.body;
      const result = await authService.disableTwofa(userId,otp);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the disableTwofa controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },
  twofaVerify: async (req,res) => {
    try{
      const {otp,token,deviceId} = req.body;
      const sessionContext = {
        deviceId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"] || "unknown",
      };
      const result = await authService.twofaVerify(token, otp,sessionContext);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the twofaVerify controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },   
  deleteAccount: async (req, res) => {
    try{
      const userId = req.user.sub;
      const {reason} = req.body;
      const result = await authService.deleteAccount(userId,reason);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.BAD_REQUEST_CODE,
          result.message,
          { error: result.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: result },
      );
    } catch (error) {
      logger.error(`error Occure in the deleteAccount controller ${error}`);
      return responseHelper.customResponse(
        res,
        defaults.INTERNAL_SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An internal server error occurred" },
      );
    }
  },


};

export default authController;
