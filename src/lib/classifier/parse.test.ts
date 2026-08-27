import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson } from "./ollama";

test("extractJson reads a raw object", () => {
  const value = extractJson('{"items":[{"id":"1"}]}');
  assert.deepEqual(value, { items: [{ id: "1" }] });
});

test("extractJson reads a fenced block with prose around it", () => {
  const value = extractJson('Sure.\n```json\n{"items":[]}\n```\n');
  assert.deepEqual(value, { items: [] });
});
