import jwt from "jsonwebtoken";
import defaults from "../constants/defaults.js";
import jwtConfig from "../config/jwt.js";
import crypto from "crypto";

const tokenService = {
  generateAccessToken: (user,sessionId) => {
    try {
      const payload = {
        sub: String(user.id),
        sid: sessionId,
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
      if (decoded.type !== "access" || !decoded.sub || !decoded.jti || !decoded.sid ) {
        throw new Error("Invalid access token claims");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid access token`);
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
  generateTwofaToken: (user) => {
    try {
      const payload = {
        sub: String(user.id),
        jti: crypto.randomUUID(),
        type: "2fa-login",
      };

      return jwt.sign(payload, jwtConfig.access.secret, {
        algorithm: jwtConfig.algorithm,
        expiresIn: "5m",
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
    } catch (error) {
      throw new Error(`Error generating 2fa token: ${error.message}`);
    }
  },
  verifyTwofaToken: (token) => {
    try {
      const rawToken = token?.replace(/^Bearer\s+/i, "").trim();
      const decoded = jwt.verify(rawToken, jwtConfig.access.secret, {
        algorithms: [jwtConfig.algorithm],
        audience: jwtConfig.audience,
        issuer: jwtConfig.issuer,
      });
      if (decoded.type !== "2fa-login" || !decoded.sub || !decoded.jti) {
        throw new Error("Invalid 2fa token claims");
      }
      return decoded;
    } catch (error) {
      throw new Error(`Invalid 2fa token: ${error.message}`);
    }
  },
};

export default tokenService;
