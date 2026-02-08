import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import type { WalrusStoreResult } from "../core/types";

interface JsonObject {
  [key: string]: unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function isLikelyBlobId(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return false;
  }

  return /^z-[A-Za-z0-9_-]+$/.test(trimmed) || /^walrus:\/\/[A-Za-z0-9._:-]+$/i.test(trimmed);
}

function parseJsonValue(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) {
    return null;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

function extractBlobIdFromJson(value: unknown): string {
  if (typeof value === "string") {
    return isLikelyBlobId(value) ? value.trim() : "";
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const extracted = extractBlobIdFromJson(entry);
      if (extracted.length > 0) {
        return extracted;
      }
    }
    return "";
  }
  if (!isJsonObject(value)) {
    return "";
  }

  const directKeys = ["blob_id", "blobId", "blobID", "blob"];
  for (const key of directKeys) {
    const candidate = value[key];
    if (typeof candidate === "string" && isLikelyBlobId(candidate)) {
      return candidate.trim();
    }
  }

  for (const nested of Object.values(value)) {
    const extracted = extractBlobIdFromJson(nested);
    if (extracted.length > 0) {
      return extracted;
    }
  }

  return "";
}

function extractBlobId(stdout: string, combinedOutput: string): string {
  const parsedStdout = parseJsonValue(stdout);
  if (parsedStdout !== null) {
    const fromJson = extractBlobIdFromJson(parsedStdout);
    if (fromJson.length > 0) {
      return fromJson;
    }
  }

  const patterns: RegExp[] = [
    /"blobId"\s*:\s*"([^"]+)"/i,
    /"blob_id"\s*:\s*"([^"]+)"/i,
    /blob[_\s-]?id[:=\s"'`]+([A-Za-z0-9._:-]+)/i,
    /\b(z-[A-Za-z0-9_-]+)\b/,
    /(walrus:\/\/[A-Za-z0-9._:-]+)/i
  ];

  for (const regex of patterns) {
    const match = combinedOutput.match(regex);
    if (match !== null && match[1] !== undefined) {
      return match[1];
    }
  }

  return "";
}

function hasWalrusError(output: string): boolean {
  const errorPatterns = [
    "Error:",
    "[child] Error:",
    "max failovers exceeded",
    "client internal error",
    "transport error"
  ];

  const lower = output.toLowerCase();
  return errorPatterns.some((entry) => lower.includes(entry.toLowerCase()));
}

export function storeJsonToWalrus(jsonPayload: string, epochs: number): WalrusStoreResult {
  const check = spawnSync("walrus", ["--help"], { encoding: "utf8" });
  if (check.error !== undefined || check.status !== 0) {
    return {
      stored: false,
      blob_id: "",
      message: "walrus CLI not found; skipping walrus storage"
    };
  }

  const tempDir = mkdtempSync(path.join(os.tmpdir(), "clawshield-"));
  const payloadPath = path.join(tempDir, "receipt.json");

  try {
    writeFileSync(payloadPath, jsonPayload, "utf8");

    // Keep uploads in this process so failures return non-zero immediately.
    const run = spawnSync(
      "walrus",
      [
        "store",
        "--epochs",
        String(epochs),
        "--json",
        "--child-process-uploads=false",
        payloadPath
      ],
      {
        encoding: "utf8"
      }
    );

    const stdout = run.stdout ?? "";
    const stderr = run.stderr ?? "";
    const output = `${stdout}\n${stderr}`.trim();

    if (run.error !== undefined) {
      return {
        stored: false,
        blob_id: "",
        message: `walrus store failed: ${run.error.message}`
      };
    }

    if (run.status !== 0) {
      return {
        stored: false,
        blob_id: "",
        message: `walrus store failed (${run.status}): ${output}`
      };
    }

    if (hasWalrusError(output)) {
      return {
        stored: false,
        blob_id: "",
        message: `walrus reported an error: ${output}`
      };
    }

    const blobId = extractBlobId(stdout, output);
    if (blobId.length === 0) {
      return {
        stored: false,
        blob_id: "",
        message: `walrus store finished without a blob id in output: ${output}`
      };
    }

    return {
      stored: true,
      blob_id: blobId,
      message: "walrus receipt stored"
    };
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}
