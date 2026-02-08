# ARCHITECTURE.md

## Overview

ClawShield Lite is a deterministic scanner pipeline with optional Sui and Walrus sinks.

```text
          +---------------------+
Input --> | Normalize + Hashing | --> content_hash
(file/text) +----------+--------+
                      |
                      v
              +---------------+
              | Rules Engine  |
              | substring+re  |
              +-------+-------+
                      |
            +---------+---------+
            |                   |
            v                   v
       verdict/risk        sanitized_text
            |
            v
   +--------------------+
   | Receipt Assembler  |
   | stable JSON schema |
   +----+-----------+---+
        |           |
        v           v
   Walrus (opt)   Sui Move event (opt)
   blob_id        ReceiptEmitted
```

## Data flow

1. Load `policy/policy.json` and hash raw bytes (`policy_hash`).
2. Read input (`file:` or `text:`) and normalize content.
3. Match deterministic rules (substring + optional per-rule regex).
4. Compute risk score, apply bonuses, cap at 100.
5. Produce verdict using policy thresholds.
6. Create receipt JSON with stable keys.
7. Optionally store receipt JSON via Walrus CLI and attach `blob_id`.
8. Optionally call Sui Move `record_receipt` and capture `tx_digest`.

## Components

- `cli/src/core/*`: policy load, normalization, matching, sanitization, hashing, output
- `cli/src/integrations/sui.ts`: `sui` CLI publish/call wrappers
- `cli/src/integrations/walrus_cli.ts`: `walrus` CLI wrapper with graceful degradation
- `move/sources/clawshield_receipts.move`: event-only receipt module
- `policy/policy.json`: deterministic scoring + enforcement semantics

## Security properties

- Deterministic classification from pinned policy.
- Tamper-evident receipts via content/policy hashes.
- Optional immutable audit trail via Sui event emission.
- No automatic execution path from untrusted input.
