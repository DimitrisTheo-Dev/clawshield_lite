#!/usr/bin/env node

import { runDemoCommand } from "./commands/demo";
import { runPublishSuiCommand } from "./commands/publish_sui";
import { runScanCommand } from "./commands/scan";
import { runScanJson } from "./commands/scan_json";

function printUsage(): void {
  process.stdout.write(
    [
      "ClawShield Lite CLI",
      "Usage:",
      "  clawshield scan file:PATH",
      "  clawshield scan text:YOUR_TEXT",
      "  clawshield scan_json file:PATH",
      "  clawshield scan_json text:YOUR_TEXT",
      "  clawshield demo",
      "  clawshield publish_sui"
    ].join("\n") + "\n"
  );
}

function main(): void {
  const [, , command, ...rest] = process.argv;

  switch (command) {
    case "scan":
      runScanCommand(rest);
      return;
    case "scan_json":
      runScanJson(rest);
      return;
    case "demo":
      runDemoCommand();
      return;
    case "publish_sui":
      runPublishSuiCommand();
      return;
    default:
      printUsage();
      process.exitCode = 1;
  }
}

main();
