import crypto from "crypto";
import deviceConstants from "../constants/device.constants.js";

const FINGERPRINT_FIELDS = [
  "userAgent",
  "acceptLanguage",
  "secChUa",
  "secChUaPlatform",
  "secChUaMobile",
];

const normalize = (value) => String(value || "").trim().toLowerCase();

const getFingerprintSecret = () =>
  process.env.DEVICE_FINGERPRINT_SECRET ||
  process.env.JWT_ACCESS_SECRET ||
  "development-device-fingerprint-secret";

const buildFingerprintPayload = ({
  userAgent,
  acceptLanguage,
  secChUa,
  secChUaPlatform,
  secChUaMobile,
} = {}) =>
  FINGERPRINT_FIELDS.map((field) => `${field}=${normalize({
    userAgent,
    acceptLanguage,
    secChUa,
    secChUaPlatform,
    secChUaMobile,
  }[field])}`).join("|");

const createDeviceFingerprint = (signals = {}) =>
  crypto
    .createHmac("sha256", getFingerprintSecret())
    .update(`${deviceConstants.fingerprintVersion}:${buildFingerprintPayload(signals)}`)
    .digest("hex");

const getDeviceSignals = ({ userAgent, deviceHeaders = {} } = {}) => ({
  userAgent,
  acceptLanguage: deviceHeaders.acceptLanguage || deviceHeaders["accept-language"],
  secChUa: deviceHeaders.secChUa || deviceHeaders["sec-ch-ua"],
  secChUaPlatform: deviceHeaders.secChUaPlatform || deviceHeaders["sec-ch-ua-platform"],
  secChUaMobile: deviceHeaders.secChUaMobile || deviceHeaders["sec-ch-ua-mobile"],
});

export { buildFingerprintPayload, createDeviceFingerprint, getDeviceSignals };
