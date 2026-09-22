import evaluateRiskSignals from "../../../src/risk/risk.rules.js";

describe("failed login velocity", () => {
  it("adds a separate signal from Redis-provided failed-attempt counts", () => {
    const signals = evaluateRiskSignals(
      {
        failedAttemptVelocity: { count: 5 },
      },
      [],
    );

    expect(signals).toContainEqual(
      expect.objectContaining({
        type: "failed_login_velocity",
        score: 25,
        details: expect.objectContaining({ attemptCount: 5 }),
      }),
    );
  });

  it("does not treat failed attempts as successful-session velocity", () => {
    const signals = evaluateRiskSignals(
      { failedAttemptVelocity: { count: 5 } },
      [],
    );

    expect(signals.map((signal) => signal.type)).not.toContain(
      "rapid_login_velocity",
    );
  });
});
