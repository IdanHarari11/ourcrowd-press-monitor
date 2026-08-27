import { test } from "node:test";
import assert from "node:assert/strict";
import { extractJson, publicClassifierError } from "./parse";
import { hasCloudClassifierKey, resolveClassifierProvider } from "./provider";

test("extractJson reads a raw object", () => {
  const value = extractJson('{"items":[{"id":"1"}]}');
  assert.deepEqual(value, { items: [{ id: "1" }] });
});

test("extractJson reads a fenced block with prose around it", () => {
  const value = extractJson('Sure.\n```json\n{"items":[]}\n```\n');
  assert.deepEqual(value, { items: [] });
});

test("publicClassifierError redacts API keys", () => {
  const message = publicClassifierError(new Error("Unauthorized sk-abc123xyz Bearer tok_secret"));
  assert.equal(message.includes("sk-abc123xyz"), false);
  assert.equal(message.includes("tok_secret"), false);
  assert.equal(message.includes("[redacted]"), true);
});

test("default classifier provider is ollama when no cloud env is set", () => {
  const previousProvider = process.env.CLASSIFIER_PROVIDER;
  const previousOpenAi = process.env.OPENAI_API_KEY;
  const previousGateway = process.env.AI_GATEWAY_API_KEY;
  const previousVercel = process.env.VERCEL;
  delete process.env.CLASSIFIER_PROVIDER;
  delete process.env.OPENAI_API_KEY;
  delete process.env.AI_GATEWAY_API_KEY;
  delete process.env.VERCEL;
  try {
    assert.equal(resolveClassifierProvider(), "ollama");
    assert.equal(hasCloudClassifierKey(), false);
  } finally {
    restoreEnv("CLASSIFIER_PROVIDER", previousProvider);
    restoreEnv("OPENAI_API_KEY", previousOpenAi);
    restoreEnv("AI_GATEWAY_API_KEY", previousGateway);
    restoreEnv("VERCEL", previousVercel);
  }
});

test("explicit openai provider is selected even locally", () => {
  const previous = process.env.CLASSIFIER_PROVIDER;
  process.env.CLASSIFIER_PROVIDER = "openai";
  try {
    assert.equal(resolveClassifierProvider(), "openai");
  } finally {
    restoreEnv("CLASSIFIER_PROVIDER", previous);
  }
});

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
