import logger from "../config/logger.js";
import defaults from "../constants/defaults.js";
import tokenService from "../services/token.service.js";
import responseHelper from "../utils/response.js";

const authMiddleware = {
  extractToken: (req) => {
    // 1. Check Authorization header
    const authHeader = req.headers.authorization;

    if (authHeader) {
      const [scheme, token] = authHeader.split(" ");

      if (scheme === "Bearer" && token) {
        return {
          token,
          source: "header",
        };
      }
    }

    // 2. Check cookie
    const cookieToken = req.cookies?.accessToken;

    if (cookieToken) {
      return {
        token: cookieToken,
        source: "cookie",
      };
    }

    return null;
  },
  verifyToken: (req, res, next) => {
    try {
      const tokenData = authMiddleware.extractToken(req);

      if (!tokenData) {
        return responseHelper.customResponse(
          res,
          defaults.UNAUTHORIZED_CODE,
          "Authentication failed",
          {
            error: "Unauthorized",
          },
        );
      }

      const { token, source } = tokenData;
      const decodedToken = tokenService.verifyAccessToken(token);
      req.user = decodedToken;

      next();
    } catch (error) {
      logger.error("Error verifying access token", error);

      return responseHelper.customResponse(
        res,
        defaults.SERVICE_UNAVAILABLE_CODE,
        defaults.SERVICE_UNAVAILABLE_MESSAGE,
        {
          error: "An internal server error occurred",
        },
      );
    }
  },
};

export default authMiddleware;
