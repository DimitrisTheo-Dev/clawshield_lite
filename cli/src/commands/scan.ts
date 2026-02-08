import { sha256Hex } from "../core/hashing";
import { parseAndLoadInput } from "../core/io";
import { formatHumanOutput, receiptToCompactJson } from "../core/output";
import { loadPolicy } from "../core/policy";
import { evaluateContent } from "../core/rules_engine";
import type { ScanExecution, ScanReceipt, SuiNetwork } from "../core/types";
import { recordReceiptOnSui } from "../integrations/sui";
import { storeJsonToWalrus } from "../integrations/walrus_cli";

function envEnabled(name: string): boolean {
  return process.env[name] === "1";
}

function parseNetwork(value: string | undefined): SuiNetwork {
  return value === "testnet" ? "testnet" : "devnet";
}

function parseWalrusEpochs(value: string | undefined): number {
  if (value === undefined || value.trim().length === 0) {
    return 1;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

export function executeScan(inputArgs: string[], allowPosting: boolean): ScanExecution {
  const loadedPolicy = loadPolicy();
  const resolvedInput = parseAndLoadInput(inputArgs);
  const evaluation = evaluateContent(resolvedInput.raw_content, loadedPolicy.policy);
  const network = parseNetwork(process.env.CLAWSHIELD_SUI_NETWORK);
  const packageId = process.env.CLAWSHIELD_SUI_PACKAGE_ID ?? "";

  const receipt: ScanReceipt = {
    tool: "clawshield_lite",
    version: "0.1.0",
    policy_version: loadedPolicy.policy.policy_version,
    policy_hash: loadedPolicy.policy_hash,
    input: resolvedInput.input,
    content_hash: sha256Hex(evaluation.normalized_content),
    timestamp_ms: Date.now(),
    risk_score: evaluation.risk_score,
    verdict: evaluation.verdict,
    matched_rules: evaluation.matched_rules,
    sanitized_text: evaluation.sanitized_text,
    sui: {
      posted: false,
      network,
      package_id: packageId,
      tx_digest: ""
    },
    walrus: {
      stored: false,
      blob_id: ""
    }
  };

  const notes: string[] = [];
  const postingEnabled = allowPosting;

  if (postingEnabled && envEnabled("CLAWSHIELD_POST_TO_WALRUS")) {
    const walrusResult = storeJsonToWalrus(
      JSON.stringify(receipt, null, 2),
      parseWalrusEpochs(process.env.CLAWSHIELD_WALRUS_EPOCHS)
    );

    if (walrusResult.stored) {
      receipt.walrus.stored = true;
      receipt.walrus.blob_id = walrusResult.blob_id;
      notes.push(`walrus blob id: ${walrusResult.blob_id}`);
    } else {
      notes.push(walrusResult.message);
    }
  }

  if (postingEnabled && envEnabled("CLAWSHIELD_POST_TO_SUI")) {
    if (packageId.length === 0) {
      notes.push("CLAWSHIELD_SUI_PACKAGE_ID is empty; skipping Sui posting");
    } else {
      try {
        const posted = recordReceiptOnSui({
          receipt,
          packageId,
          network
        });
        receipt.sui.posted = true;
        receipt.sui.tx_digest = posted.tx_digest;
        notes.push(`sui tx digest: ${posted.tx_digest || "(not found in output)"}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        notes.push(`sui post failed: ${message}`);
      }
    }
  }

  return {
    receipt,
    notes
  };
}

export function runScanCommand(args: string[]): void {
  try {
    const result = executeScan(args, true);
    // The scan command prints both human summary and full receipt JSON.
    process.stdout.write(`${formatHumanOutput(result.receipt, result.notes)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`scan failed: ${message}\n`);
    process.exitCode = 1;
  }
}

export function runScanJsonCommand(args: string[]): void {
  try {
    const result = executeScan(args, true);
    process.stdout.write(`${receiptToCompactJson(result.receipt)}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`scan_json failed: ${message}\n`);
    process.exitCode = 1;
  }
}
