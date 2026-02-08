export function normalizeLineEndings(input: string): string {
  return input.replace(/\r\n?/g, "\n");
}

export function collapseWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

export function normalizeForMatching(input: string): string {
  const withUnixNewlines = normalizeLineEndings(input);
  const lowered = withUnixNewlines.toLowerCase();
  return collapseWhitespace(lowered);
}
