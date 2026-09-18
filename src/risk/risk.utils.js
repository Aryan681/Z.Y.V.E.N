const toRadians = (value) => (value * Math.PI) / 180;

const clampScore = (score) => Math.max(0, Math.min(100, Math.round(score)));

const isValidCoordinate = (coordinate) =>
  coordinate &&
  Number.isFinite(Number(coordinate.latitude)) &&
  Number.isFinite(Number(coordinate.longitude));

const calculateDistanceKm = (firstCoordinate, secondCoordinate) => {
  if (!isValidCoordinate(firstCoordinate) || !isValidCoordinate(secondCoordinate)) {
    return null;
  }

  const latitudeDelta = toRadians(
    Number(secondCoordinate.latitude) - Number(firstCoordinate.latitude),
  );
  const longitudeDelta = toRadians(
    Number(secondCoordinate.longitude) - Number(firstCoordinate.longitude),
  );
  const firstLatitude = toRadians(Number(firstCoordinate.latitude));
  const secondLatitude = toRadians(Number(secondCoordinate.latitude));
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(firstLatitude) *
      Math.cos(secondLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

const calculateHoursBetween = (firstDate, secondDate) => {
  const firstTime = new Date(firstDate).getTime();
  const secondTime = new Date(secondDate).getTime();

  if (!Number.isFinite(firstTime) || !Number.isFinite(secondTime)) {
    return null;
  }

  return Math.abs(secondTime - firstTime) / (60 * 60 * 1000);
};

const normalizeIpReputation = (reputation) => {
  if (reputation === undefined || reputation === null) return 0;
  return Math.max(0, Math.min(1, Number(reputation) || 0));
};

export {
  calculateDistanceKm,
  calculateHoursBetween,
  clampScore,
  normalizeIpReputation,
};
