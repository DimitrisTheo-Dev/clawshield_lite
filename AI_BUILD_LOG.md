# AI_BUILD_LOG.md

This project was built primarily by an AI coding agent during the hackathon window, with human direction and verification.

## Major prompts and outputs

1. Prompt: Build a complete Track 1 submission with deterministic scanner, Sui receipt logging, optional Walrus, full docs, and demo.
   Output: Complete repository scaffold, TypeScript CLI, Move package, policy files, and hackathon-ready documentation.

2. Prompt: Implement strict TypeScript core with no `any`, deterministic matching, scoring, verdicting, and sanitization.
   Output: `core/` modules (`policy.ts`, `normalize.ts`, `rules_engine.ts`, `sanitize.ts`, `hashing.ts`, `io.ts`, `types.ts`, `output.ts`).

3. Prompt: Add Sui and Walrus integrations using local CLIs only.
   Output: `integrations/sui.ts` and `integrations/walrus_cli.ts` with graceful failure handling.

4. Prompt: Produce human demo path and DeepSurge submission text.
   Output: `cli/scripts/demo.sh`, `SUBMISSION.md`, and updated `README.md` with proof capture instructions.

5. Prompt: Add OpenClaw conceptual skill integration artifact.
   Output: `integrations/openclaw_skill/SKILL.md` with preflight usage and verdict handling workflow.
