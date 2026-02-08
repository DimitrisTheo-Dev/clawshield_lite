import type { ScanReceipt } from "./types";

export function receiptToPrettyJson(receipt: ScanReceipt): string {
  return JSON.stringify(receipt, null, 2);
}

export function receiptToCompactJson(receipt: ScanReceipt): string {
  return JSON.stringify(receipt);
}

function truncate(input: string, max: number): string {
  if (input.length <= max) {
    return input;
  }
  return `${input.slice(0, max)}...`;
}

export function formatHumanOutput(receipt: ScanReceipt, notes: string[]): string {
  const lines: string[] = [];
  lines.push("=== ClawShield Lite Scan ===");
  lines.push(`Input: ${receipt.input.kind}:${receipt.input.source}`);
  lines.push(`Verdict: ${receipt.verdict}`);
  lines.push(`Risk score: ${receipt.risk_score}/100`);
  lines.push(`Matched rules: ${receipt.matched_rules.length}`);

  for (const rule of receipt.matched_rules) {
    lines.push(`- ${rule.id} (${rule.severity}): ${rule.title}`);
    lines.push(`  matches: ${rule.matches.join(", ")}`);
  }

  if (receipt.verdict === "SANITIZE") {
    lines.push("Sanitized preview:");
    lines.push(truncate(receipt.sanitized_text.replace(/\n/g, " "), 240));
  }

  lines.push(
    `Sui receipt: ${receipt.sui.posted ? "posted" : "not posted"} (network=${receipt.sui.network}, package=${receipt.sui.package_id || "unset"}, tx=${receipt.sui.tx_digest || ""})`
  );
  lines.push(
    `Walrus log: ${receipt.walrus.stored ? "stored" : "not stored"} (blob_id=${receipt.walrus.blob_id || ""})`
  );

  for (const note of notes) {
    lines.push(`Note: ${note}`);
  }

  lines.push("Receipt JSON:");
  lines.push(receiptToPrettyJson(receipt));

  return lines.join("\n");
}
