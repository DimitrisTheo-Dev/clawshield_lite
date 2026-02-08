import { readFileSync } from "node:fs";
import path from "node:path";
import type { ResolvedInput } from "./types";

const INPUT_HELP = "expected input as file:PATH or text:YOUR_TEXT";

export function parseAndLoadInput(inputParts: string[]): ResolvedInput {
  const first = inputParts.at(0);
  if (first === undefined) {
    throw new Error(INPUT_HELP);
  }

  if (first.startsWith("file:")) {
    const suffix = first.slice("file:".length);
    const rest = inputParts.slice(1).join(" ");
    const candidate = `${suffix}${rest.length > 0 ? ` ${rest}` : ""}`.trim();
    if (candidate.length === 0) {
      throw new Error(INPUT_HELP);
    }

    const fullPath = path.resolve(process.cwd(), candidate);
    const raw = readFileSync(fullPath, "utf8");

    return {
      input: {
        kind: "file",
        source: fullPath,
        trust_zone: "untrusted"
      },
      raw_content: raw
    };
  }

  if (first.startsWith("text:")) {
    const firstChunk = first.slice("text:".length);
    const remainder = inputParts.slice(1).join(" ");
    const text = `${firstChunk}${remainder.length > 0 ? ` ${remainder}` : ""}`;

    return {
      input: {
        kind: "text",
        source: "inline",
        trust_zone: "untrusted"
      },
      raw_content: text
    };
  }

  throw new Error(INPUT_HELP);
}
