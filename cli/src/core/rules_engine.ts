import { normalizeForMatching, normalizeLineEndings } from "./normalize";
import { sanitizeText } from "./sanitize";
import type { MatchedRule, PolicyFile, PolicyRule, RuleMatchSummary, Verdict } from "./types";

function matchRule(rule: PolicyRule, normalizedContent: string): MatchedRule | null {
  const collected = new Set<string>();

  for (const pattern of rule.patterns) {
    const normalizedPattern = pattern.toLowerCase().trim();
    if (normalizedPattern.length === 0) {
      continue;
    }
    if (normalizedContent.includes(normalizedPattern)) {
      collected.add(pattern);
    }
  }

  for (const regexPattern of rule.regex_patterns ?? []) {
    try {
      const regex = new RegExp(regexPattern, "i");
      const match = normalizedContent.match(regex);
      if (match !== null && match[0].length > 0) {
        collected.add(match[0]);
      }
    } catch {
      // Ignore invalid regex entries to keep scanning robust.
    }
  }

  if (collected.size === 0) {
    return null;
  }

  return {
    id: rule.id,
    title: rule.title,
    severity: rule.severity,
    matches: Array.from(collected).sort((a, b) => a.localeCompare(b))
  };
}

function scoreMatches(matchedRules: MatchedRule[]): number {
  let total = matchedRules.reduce((acc, rule) => acc + rule.severity, 0);

  if (matchedRules.length >= 2) {
    total += 10;
  }

  if (matchedRules.some((rule) => rule.id === "wallet_signing")) {
    total += 10;
  }

  if (total > 100) {
    return 100;
  }
  if (total < 0) {
    return 0;
  }
  return total;
}

function verdictForScore(score: number, policy: PolicyFile): Verdict {
  if (score >= policy.risk_scoring.block_threshold) {
    return "BLOCK";
  }
  if (score >= policy.risk_scoring.sanitize_threshold) {
    return "SANITIZE";
  }
  return "ALLOW";
}

export function evaluateContent(content: string, policy: PolicyFile): RuleMatchSummary {
  const normalizedContent = normalizeForMatching(content);
  const matchedRules: MatchedRule[] = [];

  for (const rule of policy.rules) {
    const match = matchRule(rule, normalizedContent);
    if (match !== null) {
      matchedRules.push(match);
    }
  }

  matchedRules.sort((a, b) => a.id.localeCompare(b.id));
  const riskScore = scoreMatches(matchedRules);
  const verdict = verdictForScore(riskScore, policy);

  const sanitizedText =
    verdict === "BLOCK"
      ? ""
      : verdict === "SANITIZE"
        ? sanitizeText(content, matchedRules)
        : normalizeLineEndings(content).trim();

  return {
    matched_rules: matchedRules,
    risk_score: riskScore,
    verdict,
    sanitized_text: sanitizedText,
    normalized_content: normalizedContent
  };
}
