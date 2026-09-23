import sessionRepo from "../../repos/user/session.js";

const riskRepo = {
  findRecentUserSessions: async (userId) => {
    const sessions = await sessionRepo.findByUserId(userId);
    return (sessions || [])
      .map((session) => ({
        ...session,
        geo:
          session.latitude !== null && session.longitude !== null
            ? { latitude: Number(session.latitude), longitude: Number(session.longitude) }
            : null,
      }))
      .filter((session) => !session.revoked_at)
      .sort(
        (firstSession, secondSession) =>
          new Date(secondSession.last_active || secondSession.created_at).getTime() -
          new Date(firstSession.last_active || firstSession.created_at).getTime(),
      );
  },
};

export default riskRepo;
