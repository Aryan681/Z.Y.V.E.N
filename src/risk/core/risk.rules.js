import riskConstants from "../constants/risk.constants.js";
import deviceConstants from "../constants/device.constants.js";
import {
  calculateDistanceKm,
  calculateHoursBetween,
  normalizeIpReputation,
} from "../utils/risk.utils.js";

const createSignal = (type, score, details) => ({ type, score, details });

const evaluateNewDevice = (context, sessions) => {
  if (!sessions.length) return null;

  const knownDevice = sessions.some(
    (session) => session.device_id && session.device_id === context.deviceId,
  );
  return knownDevice
    ? null
    : createSignal("new_device", riskConstants.weights.newDevice, {
        deviceId: context.deviceId,
      });
};

const evaluateNewIpAddress = (context, sessions) => {
  if (!sessions.length) return null;

  const knownIpAddress = sessions.some(
    (session) => session.ip_address && session.ip_address === context.ipAddress,
  );
  return knownIpAddress
    ? null
    : createSignal("new_ip_address", riskConstants.weights.newIpAddress, {
        ipAddress: context.ipAddress,
      });
};

const evaluateUserAgent = (context, sessions) => {
  const knownUserAgent = sessions.some(
    (session) => session.user_agent && session.user_agent === context.userAgent,
  );
  return knownUserAgent || !sessions.length
    ? null
    : createSignal("unfamiliar_user_agent", riskConstants.weights.unfamiliarUserAgent);
};

const evaluateImpossibleTravel = (context, sessions) => {
  if (!context.geo || !sessions.length) return null;

  const latestSession = sessions[0];
  if (!latestSession.geo || !latestSession.created_at) return null;

  const distanceKm = calculateDistanceKm(latestSession.geo, context.geo);
  const elapsedHours = calculateHoursBetween(
    latestSession.created_at,
    context.now,
  );

  if (
    distanceKm === null ||
    elapsedHours === null ||
    elapsedHours > riskConstants.impossibleTravel.minimumHours ||
    distanceKm < riskConstants.impossibleTravel.minimumDistanceKm
  ) {
    return null;
  }

  return createSignal(
    "impossible_travel",
    riskConstants.weights.impossibleTravel,
    { distanceKm: Math.round(distanceKm), elapsedHours: Number(elapsedHours.toFixed(2)) },
  );
};

const evaluateIpReputation = (context) => {
  const reputation = normalizeIpReputation(context.ipReputation);
  return reputation < 0.7
    ? null
    : createSignal(
        "suspicious_ip_reputation",
        Math.round(riskConstants.weights.suspiciousIpReputation * reputation),
        { reputation },
      );
};

const evaluateFailedAttemptVelocity = (context) => {
  const count = Number(context.failedAttemptVelocity?.count || 0);
  if (count < riskConstants.velocity.failedAttemptThreshold) return null;

  return createSignal(
    "failed_login_velocity",
    riskConstants.velocity.failedAttemptScore,
    {
      attemptCount: count,
      windowMinutes: riskConstants.velocity.windowMinutes,
    },
  );
};

const evaluateDeviceTrust = (context) => {
  const profile = context.deviceProfile;
  if (!profile) return [];

  const signals = [];
  if (profile.revoked) {
    signals.push(
      createSignal("revoked_device", deviceConstants.signals.revokedDeviceScore),
    );
  } else if (profile.fingerprintMismatch) {
    signals.push(
      createSignal(
        "device_fingerprint_mismatch",
        deviceConstants.signals.fingerprintMismatchScore,
      ),
    );
  }
  return signals;
};

const getRecentSessions = (context, sessions) => {
  const now = new Date(context.now || Date.now()).getTime();
  const windowMilliseconds =
    riskConstants.velocity.windowMinutes * 60 * 1000;

  return sessions.filter((session) => {
    const createdAt = new Date(session.created_at).getTime();
    return Number.isFinite(createdAt) && now - createdAt >= 0 && now - createdAt <= windowMilliseconds;
  });
};

const evaluateVelocity = (context, sessions) => {
  const recentSessions = getRecentSessions(context, sessions);
  const recentDeviceIds = new Set(
    recentSessions.map((session) => session.device_id).filter(Boolean),
  );
  if (context.deviceId) recentDeviceIds.add(context.deviceId);

  const signals = [];
  if (recentSessions.length + 1 >= riskConstants.velocity.loginThreshold) {
    signals.push(
      createSignal("rapid_login_velocity", riskConstants.velocity.rapidLoginScore, {
        loginCount: recentSessions.length + 1,
        windowMinutes: riskConstants.velocity.windowMinutes,
      }),
    );
  }

  if (recentDeviceIds.size >= riskConstants.velocity.deviceThreshold) {
    signals.push(
      createSignal("rapid_device_velocity", riskConstants.velocity.rapidDeviceScore, {
        deviceCount: recentDeviceIds.size,
        windowMinutes: riskConstants.velocity.windowMinutes,
      }),
    );
  }

  return signals;
};

const evaluateRiskSignals = (context, sessions = []) =>
  [
    evaluateNewDevice(context, sessions),
    evaluateNewIpAddress(context, sessions),
    evaluateUserAgent(context, sessions),
    evaluateImpossibleTravel(context, sessions),
    evaluateIpReputation(context),
    evaluateFailedAttemptVelocity(context),
    ...evaluateDeviceTrust(context),
    ...evaluateVelocity(context, sessions),
  ].filter(Boolean);

export default evaluateRiskSignals;
