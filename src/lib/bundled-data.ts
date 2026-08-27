import companies from "../../data/companies.json";
import mentions from "../../data/mentions.json";
import statuses from "../../data/company-status.json";
import meta from "../../data/pipeline-meta.json";
import snapshotIds from "../../data/mention-snapshot.json";
import latestAlert from "../../data/alerts/latest.json";
import runStatus from "../../data/pipeline-run.json";
import type {
  AlertPayload,
  Company,
  CompanyStatus,
  Mention,
  PipelineMeta,
  PipelineRun,
} from "./types";

export const bundledCompanies = companies as Company[];
export const bundledMentions = mentions as Mention[];
export const bundledStatuses = statuses as CompanyStatus[];
export const bundledMeta = meta as PipelineMeta;
export const bundledSnapshotIds = snapshotIds as string[];
export const bundledLatestAlert = latestAlert as AlertPayload;
export const bundledRunStatus = runStatus as PipelineRun;
