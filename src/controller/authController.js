import responseHelper from "../helper/response.helper";
import logger from "../utils/logger.js";
import authService from "../services/authService.js";
import defaults from "../constants/defaults.js";
const authController = {
  registration: async (req, res) => {
    try {
      const { name, email, password } = req.body;
      const result = await authService.registration(name, email, password);
      if (!result) {
        return responseHelper.customResponse(
          res,
          defaults.ERROR_CODE,
          "Registration failed",
          { error: "Unable to register user" },
        );
      }
      return responseHelper.customResponse(
        res,
        defaults.CREATED_CODE,
        defaults.SUCCESS_MESSAGE,
        { message: "User registered successfully" },
      );
    } catch (error) {
      logger.info("registration controllererror:" + error.message);
      return responseHelper.customResponse(
        res,
        defaults.SERVER_ERROR_CODE,
        defaults.SERVER_ERROR_MESSAGE,
        { error: "An unexpected error occurred" },
      );
    }
  },
};
