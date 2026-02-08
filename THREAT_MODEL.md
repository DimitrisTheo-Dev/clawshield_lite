# THREAT_MODEL.md

## Scope

ClawShield Lite protects local agents with high privileges from prompt injection and social engineering delivered via untrusted content.

Protected input channels include:

- web pages and fetched content
- emails and chat transcripts
- markdown skills and docs
- copied/pasted snippets
- local files from unknown origin

## Assets at risk

- secrets (seed phrases, private keys, API keys, tokens)
- wallet permissions and transaction authority
- local system command execution surface
- agent state files and behavior controls

Common state files to protect from poisoning attempts:

- `config` files
- `memory` files/stores
- `personality` definitions
- skill markdown files (`SKILL.md`)

## Concrete attacks and mitigations

### 1) Prompt instruction override

Attack: Untrusted text says "ignore previous instructions" or "you are now ..." to override policy.
Mitigation: `override` rule detects these patterns and raises risk score.

### 2) Skill file poisoning

Attack: Malicious markdown skill introduces hidden directives like "do not tell the user".
Mitigation: Inputs are treated as untrusted and scanned before being adopted; high-risk directives trigger `SANITIZE` or `BLOCK`.

### 3) Secret exfiltration persuasion

Attack: Input requests seed phrase/private key export under fake verification pretext.
Mitigation: `secrets` rule with high severity; sanitization redacts sensitive terms; likely `BLOCK` when combined with other malicious cues.

### 4) Wallet drain persuasion

Attack: Input requests transaction signing ("claim by signing", "confirm in wallet").
Mitigation: `wallet_signing` rule and bonus scoring quickly escalate to `SANITIZE`/`BLOCK`; policy requires explicit human approval for wallet actions.

### 5) Command execution escalation

Attack: Social engineering lure to run shell payloads (`curl ... | bash`, `sudo`).
Mitigation: `command_exec` rule flags command-lure patterns and drives blocking thresholds.

### 6) Agent self-persistence modification

Attack: Input asks agent to disable safety or rewrite memory/system prompt.
Mitigation: `self_modify` rule heavily scores these attempts; enforcement policy marks self-modification as blocked.

## Residual risk

- Novel phrasing outside rule patterns may evade detection.
- Context-blind substring matching can create false positives.

## Planned hardening

- Add contextual allowlists and richer regex signatures.
- Add URL/HTML ingestion with parser-based extraction.
- Add policy signature verification and receipt verifier tooling.
