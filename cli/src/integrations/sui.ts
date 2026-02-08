import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { hexToByteArray, toSuiVectorArg, utf8Bytes, verdictToCode } from "../core/hashing";
import type { ScanReceipt, SuiNetwork, SuiPublishResult, SuiRecordResult } from "../core/types";

interface JsonObject {
  [key: string]: unknown;
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null;
}

function extractJsonObject(raw: string): JsonObject {
  const first = raw.indexOf("{");
  const last = raw.lastIndexOf("}");
  if (first < 0 || last <= first) {
    throw new Error(`unable to parse sui JSON output: ${raw.trim()}`);
  }
  const candidate = raw.slice(first, last + 1);
  const parsed = JSON.parse(candidate) as unknown;
  if (!isJsonObject(parsed)) {
    throw new Error("sui JSON output is not an object");
  }
  return parsed;
}

function runSui(args: string[]): { stdout: string; stderr: string } {
  const proc = spawnSync("sui", args, { encoding: "utf8" });

  if (proc.error !== undefined) {
    throw new Error(`sui CLI execution failed: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    const errorText = `${proc.stderr ?? ""}${proc.stdout ?? ""}`.trim();
    throw new Error(`sui command failed (${proc.status}): ${errorText}`);
  }

  return {
    stdout: proc.stdout ?? "",
    stderr: proc.stderr ?? ""
  };
}

function readPath(obj: JsonObject, pathSegments: string[]): unknown {
  let cursor: unknown = obj;
  for (const segment of pathSegments) {
    if (!isJsonObject(cursor)) {
      return undefined;
    }
    cursor = cursor[segment];
  }
  return cursor;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function extractTxDigest(parsed: JsonObject): string {
  const candidates = [
    readPath(parsed, ["effects", "V2", "transaction_digest"]),
    readPath(parsed, ["effects", "V1", "transactionDigest"]),
    readPath(parsed, ["effects", "transaction_digest"]),
    readPath(parsed, ["digest"]),
    readPath(parsed, ["effects", "transactionDigest"]),
    readPath(parsed, ["transactionDigest"]),
    readPath(parsed, ["result", "digest"])
  ];

  for (const candidate of candidates) {
    const digest = asString(candidate);
    if (digest.length > 0) {
      return digest;
    }
  }

  return "";
}

function extractPackageId(parsed: JsonObject): string {
  const direct = asString(readPath(parsed, ["packageId"]));
  if (direct.length > 0) {
    return direct;
  }

  const changes = readPath(parsed, ["objectChanges"]);
  if (Array.isArray(changes)) {
    for (const change of changes) {
      if (!isJsonObject(change)) {
        continue;
      }
      const type = asString(change.type);
      if (type !== "published") {
        continue;
      }
      const packageId = asString(change.packageId);
      if (packageId.length > 0) {
        return packageId;
      }
    }
  }

  const changedObjects = readPath(parsed, ["changed_objects"]);
  if (Array.isArray(changedObjects)) {
    for (const change of changedObjects) {
      if (!isJsonObject(change)) {
        continue;
      }
      const objectType = asString(change.objectType);
      if (objectType !== "package") {
        continue;
      }
      const objectId = asString(change.objectId);
      if (objectId.length > 0) {
        return objectId;
      }
    }
  }

  return "";
}

function resolveMovePackagePath(explicitPath?: string): string {
  if (explicitPath !== undefined && explicitPath.length > 0) {
    return explicitPath;
  }
  return path.resolve(__dirname, "../../../move");
}

function ensureNetwork(network: SuiNetwork): void {
  runSui(["client", "switch", "--env", network]);
}

function shouldFallbackToTestPublish(message: string): boolean {
  return (
    message.includes("not present in `Move.toml`") ||
    message.includes("not present in Move.toml") ||
    message.includes("package is already published")
  );
}

function publishWithFallback(movePath: string, network: SuiNetwork): { stdout: string; stderr: string } {
  const publishArgs = ["client", "publish", movePath, "--json", "--gas-budget", "100000000"];

  try {
    return runSui(publishArgs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!shouldFallbackToTestPublish(message)) {
      throw error;
    }

    const pubfilePath = path.join(
      os.tmpdir(),
      `clawshield-pub-${network}-${Date.now()}-${Math.floor(Math.random() * 100000)}.toml`
    );

    const testPublishArgs = [
      "client",
      "test-publish",
      movePath,
      "--build-env",
      network,
      "--pubfile-path",
      pubfilePath,
      "--json",
      "--gas-budget",
      "100000000"
    ];
    return runSui(testPublishArgs);
  }
}

export function publishSuiPackage(network: SuiNetwork, explicitMovePath?: string): SuiPublishResult {
  const movePath = resolveMovePackagePath(explicitMovePath);
  ensureNetwork(network);

  const run = publishWithFallback(movePath, network);
  const parsed = extractJsonObject(run.stdout);
  const packageId = extractPackageId(parsed);
  if (packageId.length === 0) {
    throw new Error(`publish succeeded but package id not found in output: ${run.stdout}`);
  }

  return {
    package_id: packageId,
    tx_digest: extractTxDigest(parsed),
    raw_output: run.stdout
  };
}

export function recordReceiptOnSui(params: {
  receipt: ScanReceipt;
  packageId: string;
  network: SuiNetwork;
}): SuiRecordResult {
  ensureNetwork(params.network);

  const contentHash = toSuiVectorArg(hexToByteArray(params.receipt.content_hash));
  const policyHash = toSuiVectorArg(hexToByteArray(params.receipt.policy_hash));
  const walrusBlob = toSuiVectorArg(utf8Bytes(params.receipt.walrus.blob_id));
  const verdictCode = verdictToCode(params.receipt.verdict);

  const args = [
    "client",
    "call",
    "--json",
    "--package",
    params.packageId,
    "--module",
    "clawshield_receipts",
    "--function",
    "record_receipt",
    "--args",
    contentHash,
    policyHash,
    String(verdictCode),
    String(params.receipt.risk_score),
    String(params.receipt.policy_version),
    String(params.receipt.timestamp_ms),
    walrusBlob,
    "--gas-budget",
    "10000000"
  ];

  const run = runSui(args);
  const parsed = extractJsonObject(run.stdout);
  const txDigest = extractTxDigest(parsed);

  return {
    tx_digest: txDigest,
    raw_output: run.stdout
  };
}
