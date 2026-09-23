import deviceRepo from "../repo/device.repo.js";
import redisService from "../../services/redis.service.js";
import { createDeviceFingerprint, getDeviceSignals } from "../utils/deviceFingerprint.js";

const getDeviceProfile = async (userId, sessionContext) => {
  const fingerprintHash = createDeviceFingerprint(
    getDeviceSignals(sessionContext),
  );
  const deviceById = await deviceRepo.findByDeviceId(
    userId,
    sessionContext.deviceId,
  );
  const deviceByFingerprint = await deviceRepo.findByFingerprint(
    userId,
    fingerprintHash,
  );
  const knownDevice = deviceById || deviceByFingerprint;

  return {
    fingerprintHash,
    known: Boolean(knownDevice),
    trusted: Boolean(knownDevice?.trusted_at),
    revoked: Boolean(deviceById?.revoked_at || deviceByFingerprint?.revoked_at),
    fingerprintMismatch: Boolean(
      deviceById && deviceById.fingerprint_hash !== fingerprintHash,
    ),
    record: knownDevice,
  };
};

const deviceService = {
  getFingerprintHash: (sessionContext) =>
    sessionContext.deviceProfile?.fingerprintHash ||
    createDeviceFingerprint(getDeviceSignals(sessionContext)),

  enrichRiskContext: async (userId, sessionContext) => ({
    ...sessionContext,
    deviceProfile: await getDeviceProfile(userId, sessionContext),
  }),

  recordSuccessfulAuthentication: async (userId, sessionContext, deviceName) => {
    const fingerprintHash = deviceService.getFingerprintHash(sessionContext);
    return deviceRepo.upsertSeen({
      userId,
      deviceId: sessionContext.deviceId,
      fingerprintHash,
      deviceName,
      ipAddress: sessionContext.ipAddress,
      userAgent: sessionContext.userAgent,
      trusted: true,
    });
  },

  listDevices: (userId) => deviceRepo.listByUserId(userId),
  trustDevice: (userId, deviceId) => deviceRepo.trust(userId, deviceId),
  revokeDevice: async (userId, deviceId) => {
    const result = await deviceRepo.revoke(userId, deviceId);
    const logoutTime = Math.floor(Date.now() / 1000);
    await Promise.all(
      result.revokedSessionIds.map((sessionId) =>
        redisService.setSessionLogout(sessionId, logoutTime, 7 * 24 * 60 * 60),
      ),
    );
    return result.device;
  },
};

export default deviceService;
