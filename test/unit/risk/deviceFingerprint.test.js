import {
  createDeviceFingerprint,
  getDeviceSignals,
} from "../../../src/risk/utils/deviceFingerprint.js";
import evaluateRiskSignals from "../../../src/risk/core/risk.rules.js";

const browserSignals = {
  userAgent: "ExampleBrowser/1.0",
  deviceHeaders: {
    "accept-language": "en-US",
    "sec-ch-ua": '"ExampleBrowser";v="1"',
    "sec-ch-ua-platform": "Windows",
    "sec-ch-ua-mobile": "?0",
  },
};

describe("device fingerprinting", () => {
  it("creates the same fingerprint for normalized server signals", () => {
    expect(createDeviceFingerprint(getDeviceSignals(browserSignals))).toBe(
      createDeviceFingerprint(
        getDeviceSignals({
          userAgent: "  examplebrowser/1.0 ",
          deviceHeaders: {
            "accept-language": "EN-US",
            "sec-ch-ua": browserSignals.deviceHeaders["sec-ch-ua"],
            "sec-ch-ua-platform": "WINDOWS",
            "sec-ch-ua-mobile": "?0",
          },
        }),
      ),
    );
  });

  it("adds a critical signal for a revoked device", () => {
    const signals = evaluateRiskSignals({
      deviceProfile: { revoked: true },
    });

    expect(signals).toContainEqual(
      expect.objectContaining({ type: "revoked_device", score: 100 }),
    );
  });
});
