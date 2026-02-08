import path from "node:path";
import { executeScan } from "./scan";
import { formatHumanOutput } from "../core/output";

interface DemoCase {
  label: string;
  expected: "ALLOW" | "SANITIZE" | "BLOCK";
  samplePath: string;
}

function resolveSamplePath(fileName: string): string {
  return path.resolve(__dirname, "../../../policy/samples", fileName);
}

function runDemoCase(entry: DemoCase): boolean {
  const target = `file:${entry.samplePath}`;
  const result = executeScan([target], false);
  const ok = result.receipt.verdict === entry.expected;

  process.stdout.write(`\n[${ok ? "PASS" : "FAIL"}] ${entry.label} => ${result.receipt.verdict} (expected ${entry.expected})\n`);
  process.stdout.write(`${formatHumanOutput(result.receipt, result.notes)}\n`);
  return ok;
}

export function runDemoCommand(): void {
  const cases: DemoCase[] = [
    {
      label: "Benign sample",
      expected: "ALLOW",
      samplePath: resolveSamplePath("benign.txt")
    },
    {
      label: "Ambiguous sample",
      expected: "SANITIZE",
      samplePath: resolveSamplePath("ambiguous.txt")
    },
    {
      label: "Malicious sample",
      expected: "BLOCK",
      samplePath: resolveSamplePath("malicious.txt")
    }
  ];

  const passed = cases.map((entry) => runDemoCase(entry)).every((value) => value);

  const postToSui = process.env.CLAWSHIELD_POST_TO_SUI === "1";
  const packageId = process.env.CLAWSHIELD_SUI_PACKAGE_ID ?? "";

  if (postToSui && packageId.length > 0) {
    process.stdout.write("\n[INFO] CLAWSHIELD_POST_TO_SUI=1 detected. Re-running malicious sample with posting enabled.\n");
    const rerun = executeScan([`file:${resolveSamplePath("malicious.txt")}`], true);
    process.stdout.write(`${formatHumanOutput(rerun.receipt, rerun.notes)}\n`);
  } else {
    process.stdout.write("\n[INFO] Sui posting disabled or package id missing; skipping on-chain post in demo command.\n");
  }

  if (!passed) {
    process.exitCode = 1;
  }
}
