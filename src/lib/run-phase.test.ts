import { test } from "node:test";
import assert from "node:assert/strict";
import { lastRunFrom } from "./format";
import {
  STALE_RUNNING_MS,
  failRun,
  failedRun,
  isRunStale,
  reconcileRun,
} from "./run-phase";
import type { PipelineMeta, PipelineRun } from "./types";

const running: PipelineRun = {
  status: "running",
  startedAt: "2026-08-27T12:00:00.000Z",
  finishedAt: null,
  error: null,
  newMentionCount: null,
  companiesAffected: null,
  pid: 42,
};

test("isRunStale is false for a fresh running job", () => {
  const now = Date.parse(running.startedAt) + 30_000;
  assert.equal(isRunStale(running, now), false);
});

test("isRunStale is true after the TTL", () => {
  const now = Date.parse(running.startedAt) + STALE_RUNNING_MS + 1;
  assert.equal(isRunStale(running, now), true);
});

test("reconcileRun marks stale running as failed", () => {
  const now = Date.parse(running.startedAt) + STALE_RUNNING_MS + 1;
  const next = reconcileRun(running, now, () => true);
  assert.equal(next.status, "failed");
  assert.match(next.error ?? "", /timed out/);
});

test("reconcileRun marks a dead local pid as failed", () => {
  const now = Date.parse(running.startedAt) + 1_000;
  const next = reconcileRun(running, now, () => false);
  assert.equal(next.status, "failed");
  assert.match(next.error ?? "", /exited unexpectedly/);
});

test("reconcileRun keeps a live fresh running job", () => {
  const now = Date.parse(running.startedAt) + 1_000;
  const next = reconcileRun(running, now, () => true);
  assert.equal(next.status, "running");
});

test("lastRunFrom does not keep stale running in the header", () => {
  const now = new Date(Date.parse(running.startedAt) + STALE_RUNNING_MS + 1);
  const derived = lastRunFrom(null, running, now);
  assert.equal(derived.status, "failed");
});

test("lastRunFrom uses meta when there is no run record", () => {
  const meta = { generatedAt: "2026-08-27T11:00:00.000Z" } as PipelineMeta;
  const derived = lastRunFrom(meta, null);
  assert.equal(derived.status, "success");
  assert.equal(derived.at, meta.generatedAt);
});

test("failRun and failedRun always produce a finished failed record", () => {
  const failed = failRun(running, "boom", new Date("2026-08-27T12:05:00.000Z"));
  assert.equal(failed.status, "failed");
  assert.equal(failed.finishedAt, "2026-08-27T12:05:00.000Z");
  const created = failedRun("nope", running.startedAt, new Date("2026-08-27T12:06:00.000Z"));
  assert.equal(created.status, "failed");
  assert.equal(created.startedAt, running.startedAt);
});
