import type { Config } from "./config.js";

export interface JiraTicket {
  key: string;
  title: string;
  status: string;
}

interface JiraIssue {
  key: string;
  fields: { summary: string; status: { name: string } };
}

export async function fetchMyTickets(
  cfg: Config,
  fetchImpl: typeof fetch = fetch
): Promise<JiraTicket[]> {
  const jql = "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC";
  const url = `${cfg.jiraBaseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,status&maxResults=100`;
  const auth = Buffer.from(`${cfg.jiraEmail}:${cfg.jiraApiToken}`).toString("base64");
  const res = await fetchImpl(url, {
    headers: { Authorization: `Basic ${auth}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Jira request failed: ${res.status}`);
  const body = (await res.json()) as { issues: JiraIssue[] };
  return body.issues.map((i) => ({
    key: i.key,
    title: i.fields.summary,
    status: i.fields.status.name,
  }));
}
