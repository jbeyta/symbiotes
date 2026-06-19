export interface Config {
  jiraBaseUrl: string;
  jiraEmail: string;
  jiraApiToken: string;
  githubToken: string;
  port: number;
}

const REQUIRED = [
  "JIRA_BASE_URL",
  "JIRA_EMAIL",
  "JIRA_API_TOKEN",
  "GITHUB_TOKEN",
] as const;

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
  return {
    jiraBaseUrl: env.JIRA_BASE_URL!.replace(/\/$/, ""),
    jiraEmail: env.JIRA_EMAIL!,
    jiraApiToken: env.JIRA_API_TOKEN!,
    githubToken: env.GITHUB_TOKEN!,
    port: (() => {
      if (!env.PORT) return 3000;
      const n = Number(env.PORT);
      if (isNaN(n)) throw new Error("PORT must be a number, got: " + env.PORT);
      return n;
    })(),
  };
}
