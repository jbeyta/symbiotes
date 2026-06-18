import type { Config } from "./config.js";

export interface Pr {
  number: number;
  title: string;
  repo: string;
  url: string;
  branch: string;
}

interface SearchItem {
  number: number;
  title: string;
  html_url: string;
  repository_url: string;
  pull_request?: { html_url: string };
}

export async function fetchMyOpenPrs(
  cfg: Config,
  fetchImpl: typeof fetch = fetch
): Promise<Pr[]> {
  const q = encodeURIComponent("is:pr is:open author:@me");
  const url = `https://api.github.com/search/issues?q=${q}&per_page=100`;
  const res = await fetchImpl(url, {
    headers: {
      Authorization: `Bearer ${cfg.githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "symbiotes",
    },
  });
  if (!res.ok) throw new Error(`GitHub request failed: ${res.status}`);
  const body = (await res.json()) as { items: SearchItem[] };
  return body.items.map((it) => ({
    number: it.number,
    title: it.title,
    repo: it.repository_url.replace("https://api.github.com/repos/", ""),
    url: it.html_url,
    branch: "",
  }));
}
