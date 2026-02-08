<p align="center">
  <img src="assets/logo.png" alt="ClawShield Lite logo" width="720" />
</p>

# ClawShield Lite - DeepSurge Submission Text

## One-paragraph pitch
ClawShield Lite is a local-first safety layer for high-privilege AI agents that treats all external content as untrusted, detects prompt injection and social engineering patterns deterministically, and produces a machine-verifiable verdict (`ALLOW`, `SANITIZE`, `BLOCK`) before action. Every scan emits a tamper-evident receipt; when enabled, the receipt is posted on Sui via a Move event for immutable auditability, with optional Walrus blob logging for extended forensics.

## Track selected
Track 1: Safety and Security, Fighting Magic with Magic.

## Sui Stack components used
- Sui Move package (`move/sources/clawshield_receipts.move`)
- On-chain event emission (`ReceiptEmitted`) per posted scan receipt
- Optional Walrus CLI blob storage for extended audit logging

## One-minute demo script
```bash
cd clawshield_lite/cli
npm install
npm run build
./scripts/demo.sh
```

Required on-chain proof step:
```bash
export PATH="$HOME/.local/bin:$PATH"
sui client switch --env devnet
sui client faucet
sui client gas

node dist/main.js publish_sui
export CLAWSHIELD_SUI_NETWORK=devnet
export CLAWSHIELD_SUI_PACKAGE_ID=0xb9c0c2186049afe7d513b7b14c56783b20f4d9fcb723357e860fbe1d88b4f62f
export CLAWSHIELD_POST_TO_SUI=1
export CLAWSHIELD_POST_TO_WALRUS=1
export CLAWSHIELD_WALRUS_EPOCHS=1
node dist/main.js scan_json file:../policy/samples/malicious.txt
sui client tx-block HrJdKVJK1QpQa4Fn9bZmw358kEHgeA45y6EqjQXQiSsH --json
```

## Proof fields to include after running demo
Latest captured proof (fill `Repo URL` and `Commit hash` before paste):

- Repo URL: `<REPO_URL>`
- Commit hash: `<COMMIT_HASH>`
- Sui network: `devnet`
- Published package id: `0xb9c0c2186049afe7d513b7b14c56783b20f4d9fcb723357e860fbe1d88b4f62f`
- Receipt tx digest: `HrJdKVJK1QpQa4Fn9bZmw358kEHgeA45y6EqjQXQiSsH`
- Event type: `ReceiptEmitted`
- Sample scanned: `policy/samples/malicious.txt`
- Output verdict: `BLOCK`
- Receipt content hash: `908ddbc622167c9d16b7a662875bfcfdae0fed0aec95a91fd0b33f7b7c325e0f`
- Receipt policy hash: `2fe2212a255d1b0f59491b949a972aaf160bc60925f3634e2182ca92ad3b2b4b`
- Optional Walrus blob id: `FBtKYKt1GHzsWyRlZ43id0kAsa9_PH8wVXIUDhIObOY`

## Repo structure overview
- `cli/`: TypeScript CLI scanner and integrations
- `policy/`: deterministic policy and sample inputs
- `move/`: Sui Move receipt event module
- `integrations/openclaw_skill/`: OpenClaw preflight skill artifact
- Root docs: architecture, security policy, threat model, AI build log, submission text

## Safety impact summary
ClawShield Lite reduces agent compromise risk by forcing deterministic, auditable classification of untrusted input before high-impact actions. It directly targets instruction override attempts, secret exfiltration persuasion, wallet-drain prompts, command execution lures, and self-modification attacks, while requiring explicit human approval for wallet/system actions.
