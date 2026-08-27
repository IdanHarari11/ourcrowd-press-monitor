export type Sentiment = "positive" | "negative" | "neutral";

export interface Company {
  id: string;
  name: string;
  searchName: string;
  aliases: string[];
  domain?: string;
  notes?: string;
  isAmbiguous: boolean;
}

export interface Mention {
  id: string;
  companyId: string;
  companyName: string;
  title: string;
  sourceName: string;
  url: string;
  publishedAt: string;
  snippet: string;
  collectedAt: string;
  relevant: boolean | null;
  sentiment: Sentiment | null;
  rationale: string | null;
  classifiedAt: string | null;
  model: string | null;
}

export interface CompanyStatus {
  companyId: string;
  companyName: string;
  lastMentionedAt: string | null;
  lastMentionTitle: string | null;
  lastMentionUrl: string | null;
  daysSinceLastMention: number | null;
  statusLabel: string;
  recency: "hot" | "warm" | "cold" | "none";
  mentionCountQuarter: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

export interface PipelineMeta {
  generatedAt: string;
  quarterStart: string;
  quarterEnd: string;
  model: string;
  companiesTracked: number;
  mentionsCollected: number;
  mentionsClassified: number;
  relevantMentions: number;
  collectionErrors: number;
}

export interface AlertPayload {
  generatedAt: string;
  newMentionCount: number;
  companiesAffected: number;
  summary: string;
  mentions: Array<{
    companyName: string;
    title: string;
    url: string;
    sentiment: Sentiment | null;
    publishedAt: string;
  }>;
}

export type RunPhase = "running" | "success" | "failed";

export interface PipelineRun {
  status: RunPhase;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  newMentionCount: number | null;
  companiesAffected: number | null;
  pid: number | null;
}

export interface DashboardData {
  meta: PipelineMeta | null;
  companies: Company[];
  statuses: CompanyStatus[];
  mentions: Mention[];
  snapshotIds: string[];
  alert: AlertPayload | null;
}

export interface DailyCheckResponse extends PipelineRun {
  dashboard?: DashboardData;
  persisted?: boolean;
}
