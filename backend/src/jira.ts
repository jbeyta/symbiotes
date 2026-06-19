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
  const url = `${cfg.jiraBaseUrl}/rest/api/3/search/jql`;
  const auth = Buffer.from(`${cfg.jiraEmail}:${cfg.jiraApiToken}`).toString("base64");
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jql: "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC",
      fields: ["summary", "status"],
      maxResults: 100,
    }),
  });
  if (!res.ok) throw new Error(`Jira request failed: ${res.status}`);
  const body = (await res.json()) as { issues: JiraIssue[]; nextPageToken?: string; isLast?: boolean };
  return body.issues.map((i) => ({
    key: i.key,
    title: i.fields.summary,
    status: i.fields.status.name,
  }));
}
