import crypto from "crypto";
import logger from "../config/logger.js";
import redisService from "./redis.service.js";

const DEFAULT_CACHE_TTL_SECONDS = 3600;
const LOOKUP_TIMEOUT_MS = 1500;
const MAX_MEMORY_ENTRIES = 1000;
const memoryCache = new Map();
const inFlightLookups = new Map();

const logDevelopment = (details, message) => {
  if (process.env.NODE_ENV === "dev" || process.env.NODE_ENV === "development") {
    logger.debug(details, message);
  }
};

const normalizeIpAddress = (ipAddress) => {
  if (!ipAddress) return null;
  return ipAddress.trim().replace(/^::ffff:/i, "").replace(/^::1$/, "127.0.0.1");
};

const isPrivateIpv4 = (ipAddress) => {
  const octets = ipAddress.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) {
    return false;
  }

  return (
    octets[0] === 10 ||
    octets[0] === 127 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168) ||
    (octets[0] === 169 && octets[1] === 254)
  );
};

const isPublicIpAddress = (ipAddress) => {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);
  return Boolean(
    normalizedIpAddress &&
    normalizedIpAddress.includes(".") &&
    !isPrivateIpv4(normalizedIpAddress),
  );
};

const normalizeReputation = (payload) => {
  if (!payload || payload.error) return null;
  if (payload.malicious === true || payload.fraud === true) return 1;

  const rawScore =
    payload.reputation ??
    payload.riskScore ??
    payload.risk_score ??
    payload.fraud_score ??
    payload.abuse_score ??
    payload.score;
  const numericScore = Number(rawScore);

  if (!Number.isFinite(numericScore)) return null;
  return Math.max(0, Math.min(1, numericScore > 1 ? numericScore / 100 : numericScore));
};

const getCacheKey = (ipAddress) =>
  `risk:ip-reputation:${crypto.createHash("sha256").update(ipAddress).digest("hex")}`;

const getMemoryValue = (cacheKey) => {
  const entry = memoryCache.get(cacheKey);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(cacheKey);
    return undefined;
  }
  return entry.value;
};

const setMemoryValue = (cacheKey, value, ttlSeconds) => {
  if (memoryCache.size >= MAX_MEMORY_ENTRIES && !memoryCache.has(cacheKey)) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }

  memoryCache.set(cacheKey, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const fetchReputation = async (ipAddress) => {
  const apiUrlTemplate = process.env.IP_REPUTATION_API_URL;
  if (!apiUrlTemplate) return null;

  const apiUrl = apiUrlTemplate.replace("{ip}", encodeURIComponent(ipAddress));
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), LOOKUP_TIMEOUT_MS);

  try {
    const headers = { Accept: "application/json" };
    if (process.env.IP_REPUTATION_API_KEY) {
      headers.Authorization = `Bearer ${process.env.IP_REPUTATION_API_KEY}`;
      headers["X-API-Key"] = process.env.IP_REPUTATION_API_KEY;
      headers["ipqs-key"] = process.env.IP_REPUTATION_API_KEY;
    }

    const response = await fetch(apiUrl, {
      headers,
      signal: abortController.signal,
    });
    if (!response.ok) {
      throw new Error(`IP reputation provider returned HTTP ${response.status}`);
    }

    return normalizeReputation(await response.json());
  } catch (error) {
    logger.warn(`IP reputation lookup unavailable: ${error.message}`);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

const ipReputationService = {
  resolveIpReputation: async (ipAddress) => {
    const normalizedIpAddress = normalizeIpAddress(ipAddress);
    if (!process.env.IP_REPUTATION_API_URL) {
      logDevelopment({ enabled: false }, "IP reputation provider disabled");
      return null;
    }
    if (!isPublicIpAddress(normalizedIpAddress)) {
      logDevelopment(
        { skipped: true, reason: "private_or_local_ip" },
        "IP reputation lookup skipped",
      );
      return null;
    }

    const cacheKey = getCacheKey(normalizedIpAddress);
    const memoryValue = getMemoryValue(cacheKey);
    if (memoryValue !== undefined) {
      logDevelopment(
        { source: "memory", reputation: memoryValue },
        "IP reputation cache hit",
      );
      return memoryValue;
    }

    if (inFlightLookups.has(cacheKey)) {
      logDevelopment({ source: "in_flight" }, "IP reputation lookup coalesced");
      return inFlightLookups.get(cacheKey);
    }

    const lookupPromise = (async () => {
      try {
        try {
          const cachedValue = await redisService.get(cacheKey);
          if (cachedValue !== null) {
            const parsedValue = JSON.parse(cachedValue);
            setMemoryValue(cacheKey, parsedValue.reputation, DEFAULT_CACHE_TTL_SECONDS);
            logDevelopment(
              { source: "redis", reputation: parsedValue.reputation },
              "IP reputation cache hit",
            );
            return parsedValue.reputation;
          }
        } catch (error) {
          logger.warn(`IP reputation Redis cache unavailable: ${error.message}`);
        }

        const reputation = await fetchReputation(normalizedIpAddress);
        setMemoryValue(cacheKey, reputation, DEFAULT_CACHE_TTL_SECONDS);
        logDevelopment(
          {
            source: "provider",
            available: reputation !== null,
            reputation,
          },
          "IP reputation provider lookup completed",
        );

        try {
          await redisService.setWithExpiry(
            cacheKey,
            JSON.stringify({ reputation }),
            DEFAULT_CACHE_TTL_SECONDS,
          );
        } catch (error) {
          logger.warn(`IP reputation Redis cache write unavailable: ${error.message}`);
        }

        return reputation;
      } finally {
        inFlightLookups.delete(cacheKey);
      }
    })();

    inFlightLookups.set(cacheKey, lookupPromise);
    return lookupPromise;
  },
};

export { normalizeReputation, isPublicIpAddress };
export default ipReputationService;
