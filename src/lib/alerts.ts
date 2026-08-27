import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { diffNewMentions, getNewCoverage } from "./coverage-diff";
import type { AlertPayload, Mention, Sentiment } from "./types";

export { diffNewMentions, getNewCoverage };

export function buildAlert(newMentions: Mention[], now = new Date()): AlertPayload {
  const byCompany = new Map<string, Mention[]>();
  for (const mention of newMentions) {
    const list = byCompany.get(mention.companyName) ?? [];
    list.push(mention);
    byCompany.set(mention.companyName, list);
  }

  const lines = [...byCompany.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .map(([companyName, mentions]) => {
      const mix = summarizeSentiment(mentions);
      return `- ${companyName}: ${mentions.length} new mention${mentions.length === 1 ? "" : "s"} (${mix})`;
    });

  const summary =
    newMentions.length === 0
      ? "No new press mentions since the last snapshot."
      : `New press coverage for ${byCompany.size} compan${byCompany.size === 1 ? "y" : "ies"} (${newMentions.length} mention${newMentions.length === 1 ? "" : "s"}):\n${lines.join("\n")}`;

  return {
    generatedAt: now.toISOString(),
    newMentionCount: newMentions.length,
    companiesAffected: byCompany.size,
    summary,
    mentions: newMentions.map((mention) => ({
      companyName: mention.companyName,
      title: mention.title,
      url: mention.url,
      sentiment: mention.sentiment,
      publishedAt: mention.publishedAt,
    })),
  };
}

function summarizeSentiment(mentions: Mention[]): string {
  const counts: Record<Sentiment, number> = { positive: 0, negative: 0, neutral: 0 };
  for (const mention of mentions) {
    if (mention.sentiment) counts[mention.sentiment] += 1;
  }
  return Object.entries(counts)
    .filter(([, count]) => count > 0)
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");
}

export async function notifyAlert(alert: AlertPayload, webhookUrl?: string): Promise<void> {
  const banner = "=== OurCrowd daily press alert ===";
  process.stdout.write(`\n${banner}\n${alert.summary}\n${banner}\n\n`);

  await mkdir(path.join(process.cwd(), "data", "alerts"), { recursive: true });
  await writeFile(
    path.join(process.cwd(), "data", "alerts", "latest.txt"),
    `${banner}\n${alert.summary}\n${banner}\n`,
    "utf8",
  );

  if (!webhookUrl) return;

  const body = webhookUrl.includes("hooks.slack.com")
    ? { text: alert.summary }
    : alert;

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Alert webhook failed: ${response.status} ${await response.text()}`);
  }
}
