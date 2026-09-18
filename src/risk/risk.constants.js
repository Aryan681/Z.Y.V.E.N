const riskConstants = {
  levels: {
    low: "low",
    medium: "medium",
    high: "high",
    critical: "critical",
  },
  decisions: {
    allow: "allow",
    monitor: "monitor",
    require2FA: "require_2fa",
    deny: "deny",
  },
  thresholds: {
    medium: 25,
    high: 50,
    critical: 80,
  },
  weights: {
    newDevice: 30,
    newIpAddress: 25,
    impossibleTravel: 45,
    suspiciousIpReputation: 30,
    unfamiliarUserAgent: 10,
  },
  impossibleTravel: {
    minimumDistanceKm: 500,
    minimumHours: 1,
  },
  velocity: {
    windowMinutes: 10,
    loginThreshold: 5,
    deviceThreshold: 3,
    rapidLoginScore: 25,
    rapidDeviceScore: 25,
  },
  verification: {
    codeTtlSeconds: 600,
    maximumAttempts: 3,
  },
};

export default riskConstants;
