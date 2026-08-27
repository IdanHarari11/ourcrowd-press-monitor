import { isRelevantMention } from "./relevance";
import type { Mention } from "./types";

/**
 * New coverage = relevant mentions whose IDs are not in the last daily-check snapshot.
 * This is discovery (new IDs since the last successful alert job), not "recently published".
 */
export function getNewCoverage(
  mentions: Mention[],
  snapshotIds: ReadonlySet<string> | readonly string[],
): Mention[] {
  return diffNewMentions(mentions, snapshotIds instanceof Set ? snapshotIds : new Set(snapshotIds));
}

export function diffNewMentions(current: Mention[], previousIds: Set<string>): Mention[] {
  return current.filter((mention) => isRelevantMention(mention) && !previousIds.has(mention.id));
}
