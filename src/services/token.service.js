import jwt from "jsonwebtoken";
import defaults from "../constants/defaults.js";
import jwtConfig from "../config/jwt.js";
import crypto from "crypto";

const tokenService = {
  generateAccessToken: (user) => {
    try {
      const payload = {
        sub: String(user.id),
        username: user.username,
        role: user.role,
        jti: crypto.randomUUID(),
        type: "access",
      };
      return jwt.sign(payload, jwtConfig.access.secret, {
        algorithm: jwtConfig.algorithm,
        expiresIn: jwtConfig.access.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch (error) {
      throw new Error("Error generating access token");
    }
  },
  verifyAccessToken: (token) => {
    try {
      const decoded = jwt.verify(token, jwtConfig.access.secret, {
        algorithms: [jwtConfig.algorithm],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
      });
      if (decoded.type !== "access" || !decoded.sub || !decoded.jti) {
        throw new Error("Invalid access token claims");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid access token: ${error.message}`);
    }
  },
  generateRefreshToken: (user,sessionId) => {
    try {
      const payload = {
        sub: String(user.id),
        sid: sessionId,
        jti: crypto.randomUUID(),
        type: "refresh",
      };

      return jwt.sign(payload, jwtConfig.refresh.secret, {
        algorithm: jwtConfig.algorithm,
        expiresIn: jwtConfig.refresh.expiresIn,
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch (error) {
      throw new Error(`Error generating refresh token: ${error.message}`);
    }
  },
  verifyRefreshToken: (token) => {
    try {
      const decoded = jwt.verify(token, jwtConfig.refresh.secret, {
        algorithms: [jwtConfig.algorithm],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
      });
      if (decoded.type !== "refresh" || !decoded.sub || !decoded.jti) {
        throw new Error("Invalid refresh token claims");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid refresh token: ${error.message}`);
    }
  },
};

export default tokenService;
