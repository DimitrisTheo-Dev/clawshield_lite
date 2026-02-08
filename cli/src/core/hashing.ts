import { createHash } from "node:crypto";
import type { Verdict } from "./types";

export function sha256Hex(input: Buffer | string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hexToByteArray(hex: string): number[] {
  const clean = hex.trim().toLowerCase();
  if (clean.length % 2 !== 0) {
    throw new Error("hex string must have an even length");
  }

  const bytes: number[] = [];
  for (let i = 0; i < clean.length; i += 2) {
    const pair = clean.slice(i, i + 2);
    const parsed = Number.parseInt(pair, 16);
    if (Number.isNaN(parsed)) {
      throw new Error(`invalid hex byte: ${pair}`);
    }
    bytes.push(parsed);
  }
  return bytes;
}

export function utf8Bytes(input: string): number[] {
  return Array.from(Buffer.from(input, "utf8"));
}

export function verdictToCode(verdict: Verdict): number {
  switch (verdict) {
    case "ALLOW":
      return 0;
    case "SANITIZE":
      return 1;
    case "BLOCK":
      return 2;
    default: {
      const exhaustive: never = verdict;
      throw new Error(`unsupported verdict: ${String(exhaustive)}`);
    }
  }
}

export function toSuiVectorArg(values: number[]): string {
  return `[${values.join(",")}]`;
}
