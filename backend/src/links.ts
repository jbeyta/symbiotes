// Warning: This shared instance is only safe with String.prototype.match
// (which resets lastIndex). Callers must not use .exec() or .matchAll()
// on it because the g flag carries lastIndex state.
export const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;

export function extractJiraKey(
  ...texts: (string | null | undefined)[]
): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.toUpperCase().match(JIRA_KEY_RE);
    if (match) return match[0];
  }
  return null;
}
