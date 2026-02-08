import { normalizeLineEndings } from "./normalize";
import type { MatchedRule } from "./types";

const SECRET_AND_SIGNING_TERMS: RegExp[] = [
  /seed phrase/gi,
  /private key/gi,
  /mnemonic/gi,
  /api key/gi,
  /password/gi,
  /token/gi,
  /ssh key/gi,
  /sign this transaction/gi,
  /approve transaction/gi,
  /connect your wallet/gi,
  /confirm in wallet/gi,
  /claim by signing/gi,
  /send usdc/gi,
  /\btransfer\b/gi,
  /\bswap\b/gi
];

function matchedSubstrings(matchedRules: MatchedRule[]): string[] {
  const seen = new Set<string>();
  for (const rule of matchedRules) {
    for (const entry of rule.matches) {
      const normalized = entry.toLowerCase().trim();
      if (normalized.length > 0) {
        seen.add(normalized);
      }
    }
  }
  return Array.from(seen);
}

export function sanitizeText(content: string, matchedRules: MatchedRule[]): string {
  const normalizedLines = normalizeLineEndings(content).split("\n");
  const banned = matchedSubstrings(matchedRules);

  const keptLines = normalizedLines.filter((line) => {
    const lowerLine = line.toLowerCase();
    return !banned.some((needle) => lowerLine.includes(needle));
  });

  let sanitized = keptLines.join("\n");
  for (const re of SECRET_AND_SIGNING_TERMS) {
    sanitized = sanitized.replace(re, "[REDACTED]");
  }

  return sanitized.trim();
}
