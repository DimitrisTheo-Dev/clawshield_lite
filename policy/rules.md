# ClawShield Lite Rules

This folder defines deterministic policy behavior for untrusted input scanning.

## Trust model

- `trusted`: Local repository code and pinned policy files.
- `untrusted`: Web pages, emails, skill markdown, pasted text, and copied snippets.

## Rule matching

- Input is normalized to lowercase with collapsed whitespace.
- Each rule pattern is matched as a substring.
- Optional regex patterns can be added per rule using `regex_patterns`.

## Scoring

- Base score: sum of severities for matched rules.
- Bonus `+10`: at least 2 distinct rules match.
- Bonus `+10`: `wallet_signing` rule matches.
- Score is capped to `100`.

## Verdict thresholds

- `BLOCK` if score >= `70`
- `SANITIZE` if score >= `40`
- `ALLOW` otherwise

## Enforcement semantics

- Guardrail and auditor only: classify and log, no direct execution.
- Wallet/system actions require explicit human approval.
- Self-modification is blocked.
- Skill installation requires review.

## Extension process

1. Add a new rule object in `policy.json`.
2. Keep severity and patterns specific and testable.
3. Add sample text in `policy/samples/`.
4. Run `clawshield demo` and verify expected verdict changes.
