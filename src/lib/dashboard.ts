import { loadCompanies, loadLatestAlert, loadMentions, loadMeta, loadSnapshotIds, loadStatuses } from "./storage";
import type { DashboardData } from "./types";

export async function loadDashboardData(): Promise<DashboardData> {
  const [companies, statuses, mentions, meta, alert, snapshotIds] = await Promise.all([
    loadCompanies(),
    loadStatuses(),
    loadMentions(),
    loadMeta(),
    loadLatestAlert(),
    loadSnapshotIds(),
  ]);

  return { companies, statuses, mentions, meta, alert, snapshotIds };
}
