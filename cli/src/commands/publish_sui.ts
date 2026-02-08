import { publishSuiPackage } from "../integrations/sui";
import type { SuiNetwork } from "../core/types";

function parseNetwork(value: string | undefined): SuiNetwork {
  return value === "testnet" ? "testnet" : "devnet";
}

export function runPublishSuiCommand(): void {
  try {
    const network = parseNetwork(process.env.CLAWSHIELD_SUI_NETWORK);
    const result = publishSuiPackage(network);

    process.stdout.write("ClawShield Lite Move package published.\n");
    process.stdout.write(`network=${network}\n`);
    process.stdout.write(`package_id=${result.package_id}\n`);
    process.stdout.write(`tx_digest=${result.tx_digest}\n`);
    process.stdout.write(
      "Set CLAWSHIELD_SUI_PACKAGE_ID to this package_id before posting scan receipts.\n"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`publish_sui failed: ${message}\n`);
    process.exitCode = 1;
  }
}
