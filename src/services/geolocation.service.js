import logger from "../config/logger.js";

const GEOLOCATION_TIMEOUT_MS = 1500;
const DEFAULT_GEOLOCATION_API_URL = "https://ipapi.co/{ip}/json/";

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

const normalizeIpAddress = (ipAddress) => {
  if (!ipAddress) return null;
  const normalizedIpAddress = ipAddress.trim().replace(/^::ffff:/i, "");
  return normalizedIpAddress === "::1" ? "127.0.0.1" : normalizedIpAddress;
};

const isPublicIpAddress = (ipAddress) => {
  const normalizedIpAddress = normalizeIpAddress(ipAddress);
  if (!normalizedIpAddress || isPrivateIpv4(normalizedIpAddress)) return false;
  return normalizedIpAddress.includes(".");
};

const normalizeCoordinates = (payload) => {
  const latitude = Number(payload?.latitude ?? payload?.lat);
  const longitude = Number(payload?.longitude ?? payload?.lon);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  return { latitude, longitude };
};

const geolocationService = {
  resolveIpLocation: async (ipAddress) => {
    const normalizedIpAddress = normalizeIpAddress(ipAddress);
    if (!isPublicIpAddress(normalizedIpAddress)) return null;

    const apiUrlTemplate =
      process.env.GEOLOCATION_API_URL || DEFAULT_GEOLOCATION_API_URL;
    const apiUrl = apiUrlTemplate.replace(
      "{ip}",
      encodeURIComponent(normalizedIpAddress),
    );
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), GEOLOCATION_TIMEOUT_MS);

    try {
      const response = await fetch(apiUrl, {
        headers: { Accept: "application/json" },
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Geolocation provider returned HTTP ${response.status}`);
      }

      return normalizeCoordinates(await response.json());
    } catch (error) {
      logger.warn(`Geolocation lookup unavailable: ${error.message}`);
      return null;
    } finally {
      clearTimeout(timeout);
    }
  },
};

export { normalizeCoordinates, isPublicIpAddress };
export default geolocationService;
