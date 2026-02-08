import { readFileSync } from "node:fs";
import path from "node:path";
import { sha256Hex } from "./hashing";
import type { PolicyFile } from "./types";

export interface LoadedPolicy {
  policy: PolicyFile;
  raw_bytes: Buffer;
  policy_hash: string;
  policy_path: string;
}

export function getProjectRoot(): string {
  return path.resolve(__dirname, "../../../");
}

export function getPolicyPath(): string {
  return path.join(getProjectRoot(), "policy", "policy.json");
}

function assertValidPolicy(policy: PolicyFile): void {
  if (policy.tool !== "clawshield_lite") {
    throw new Error(`policy tool mismatch: expected clawshield_lite, got ${policy.tool}`);
  }
  if (!Array.isArray(policy.rules) || policy.rules.length === 0) {
    throw new Error("policy.rules must be a non-empty array");
  }
  if (policy.risk_scoring.block_threshold < policy.risk_scoring.sanitize_threshold) {
    throw new Error("policy thresholds are invalid: block_threshold must be >= sanitize_threshold");
  }
}

export function loadPolicy(policyPath = getPolicyPath()): LoadedPolicy {
  const raw = readFileSync(policyPath);
  const parsed = JSON.parse(raw.toString("utf8")) as PolicyFile;
  assertValidPolicy(parsed);

  return {
    policy: parsed,
    raw_bytes: raw,
    policy_hash: sha256Hex(raw),
    policy_path: policyPath
  };
}
