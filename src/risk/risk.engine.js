import riskConstants from "./risk.constants.js";
import evaluateRiskSignals from "./risk.rules.js";
import { clampScore } from "./risk.utils.js";

const getRiskLevel = (score) => {
  if (score >= riskConstants.thresholds.critical) return riskConstants.levels.critical;
  if (score >= riskConstants.thresholds.high) return riskConstants.levels.high;
  if (score >= riskConstants.thresholds.medium) return riskConstants.levels.medium;
  return riskConstants.levels.low;
};

const getRiskDecision = (level) => {
  if (level === riskConstants.levels.critical) return riskConstants.decisions.deny;
  if (level === riskConstants.levels.high) return riskConstants.decisions.require2FA;
  if (level === riskConstants.levels.medium) return riskConstants.decisions.monitor;
  return riskConstants.decisions.allow;
};

const evaluateRisk = (context, sessions = []) => {
  const signals = evaluateRiskSignals(context, sessions);
  const score = clampScore(signals.reduce((total, signal) => total + signal.score, 0));
  const level = getRiskLevel(score);

  return {
    score,
    level,
    decision: getRiskDecision(level),
    signals,
  };
};

export { getRiskDecision, getRiskLevel };
export default evaluateRisk;
