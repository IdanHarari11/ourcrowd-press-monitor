import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeArticleUrl, parseHttpUrl } from "./url";

test("parseHttpUrl accepts http and https", () => {
  assert.equal(parseHttpUrl("https://news.google.com/rss")?.hostname, "news.google.com");
  assert.equal(parseHttpUrl("http://example.com/feed")?.protocol, "http:");
});

test("parseHttpUrl rejects empty, invalid, and non-http protocols", () => {
  assert.equal(parseHttpUrl(""), null);
  assert.equal(parseHttpUrl("   "), null);
  assert.equal(parseHttpUrl("not a url"), null);
  assert.equal(parseHttpUrl("javascript:alert(1)"), null);
  assert.equal(parseHttpUrl("file:///etc/passwd"), null);
});

test("parseHttpUrl trims whitespace and uses WHATWG URL", () => {
  const parsed = parseHttpUrl("  https://example.com/path?q=1#hash  ");
  assert.ok(parsed);
  assert.equal(parsed.pathname, "/path");
  assert.equal(parsed.search, "?q=1");
});

test("normalizeArticleUrl drops query, hash, and trailing slash", () => {
  assert.equal(normalizeArticleUrl("https://Example.com/Story/?utm=1#top"), "https://example.com/story");
  assert.equal(normalizeArticleUrl("https://example.com/a/"), "https://example.com/a");
});

test("normalizeArticleUrl falls back for non-http values", () => {
  assert.equal(normalizeArticleUrl("Not A URL"), "not a url");
});
