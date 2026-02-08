# SECURITY.md

## Security posture

ClawShield Lite is a guardrail and auditor. It does not execute untrusted commands; it classifies input and emits receipts for review and audit.

## Operating rules

- Treat all external content as `untrusted` by default.
- Run `clawshield scan` or `clawshield scan_json` before downstream agent use.
- Require explicit human approval for wallet actions and system commands.
- Block self-modification flows (`self_modification: blocked`).
- Require review for skill installation (`skill_installation: require_review`).

## Verdict policy

- `ALLOW`: content can proceed as-is.
- `SANITIZE`: use only `sanitized_text`; discard unsafe lines and redacted terms.
- `BLOCK`: stop autonomous flow; escalate to human review.

## Extending rules safely

1. Add a new deterministic rule to `policy/policy.json`.
2. Keep patterns specific; avoid broad terms that cause blanket matching.
3. Use severity proportional to expected impact.
4. Re-run `./cli/scripts/demo.sh` and add/update sample cases.

## Handling false positives

- Prefer contextual policy refinements over disabling whole rules.
- Reduce severity when a pattern is high-noise but still useful as weak signal.
- Add target-specific exceptions only after documented review.
- Keep a changelog of policy decisions in pull requests.

## Incident response workflow

1. Save scan JSON receipt.
2. Record matched rules and risk score.
3. If available, capture Sui `tx_digest` and Walrus `blob_id`.
4. Open a human-reviewed incident issue with remediation actions.

## Wallet safety rule

Wallet execution requires explicit human approval. ClawShield Lite outputs proposal artifacts (`scan_json`) but does not sign transactions.
