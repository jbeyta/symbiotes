export const JIRA_KEY_RE = /\b[A-Z][A-Z0-9]+-\d+\b/g;

export function extractJiraKey(
  ...texts: (string | null | undefined)[]
): string | null {
  for (const text of texts) {
    if (!text) continue;
    const match = text.toUpperCase().match(JIRA_KEY_RE);
    if (match && match.length > 0) return match[0];
  }
  return null;
}
