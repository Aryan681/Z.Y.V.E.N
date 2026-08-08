import responseHelper from "../utils/response.js";
import logger from "../config/logger.js";
import authService from "../services/auth.service.js";
import defaults from "../constants/defaults.js";

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
            {error: "Email already exists"},
        );
    }
      req.log.info(`User registered successfully: ${email}`);

      return responseHelper.customResponse(
        res,
        defaults.CREATED_CODE,
        defaults.SUCCESS_MESSAGE,
        {message: "User registered successfully",});
    } catch (error) {
      logger.error("Registration Controller Error", error);

      return responseHelper.customResponse(
        res,
        defaults.SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        {
          error: "An unexpected error occurred",
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
          defaults.ERROR_CODE,
          defaults.ERROR_MESSAGE,
          { error: "token is missing from the url or invalid Token" },
        );
      }
      const result = await authService.verification(token);
      if (!result.success) {
        return responseHelper.customResponse(
          res,
          defaults.ERROR_CODE,
          result.message,
          { error: result.message },
        );
      }
      req.log.info(`User email verified: ${email}`);

      return responseHelper.customResponse(
        res,
        defaults. OK_CODE,
        defaults.SUCCESS_MESSAGE,
        {
          message: "User verified successfully",
        },
      );
    } catch (error) {
      logger.error("error occur in the verification ", error);
      return responseHelper.customResponse(
        res,
        defaults.SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "error in verifying user" },
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
          defaults.ERROR_CODE,
          defaults.ERROR_MESSAGE,
          { error: "user email is missing" },
        );
      }
      const resent = await authService.resendVerificationUrl(email);
      if (!resent.success) {
        return responseHelper.customResponse(
          res,
          defaults.ERROR_CODE,
          defaults.SERVER_ERROR_MESSAGE,
          { error: resent.message },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults. OK_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: "Verification email sent successfully." },
      );
    } catch (error) {
      logger.error("Resend verification controller error", error);

      return responseHelper.customResponse(
        res,
        defaults.SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "fail to sent the verification link" },
      );
    }
  },
  login : async(req,res)=>{
    try {
    const {email,password} = req.body ;
    if(!email || !password){
      logger.warn("one of the field is missing ");
      return responseHelper.customResponse(
        res,
        defaults.ERROR_CODE,
        defaults.ERROR_MESSAGE,
        {error:"please enter email and password"}
      );
    }
    const verifying = await authService.verifyPassword(email, password);

    if (!verifying.success) {
        logger.warn(`Login failed for email: ${email}`);
        return responseHelper.customResponse(
            res,
            defaults.UNAUTHORIZED_CODE,
            "Authentication failed",
            {
                error: "Invalid email or password",
            },
        );
    }
    return responseHelper.customResponse(
      res,
      defaults. OK_CODE,
      defaults.SUCCESS_MESSAGE,
      {message:"user login successfully"}
    )
    } catch (error) {
      
    }
  }
};

export default authController;
