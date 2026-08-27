import { test } from "node:test";
import assert from "node:assert/strict";
import { buildSearchQuery, parseCompanyLine, parseCompanyList, toCompany } from "./companies";

test("parseCompanyLine reads a plain name", () => {
  const parsed = parseCompanyLine("Stripe");
  assert.equal(parsed?.name, "Stripe");
  assert.deepEqual(parsed?.aliases, []);
});

test("parseCompanyLine extracts former names", () => {
  const parsed = parseCompanyLine("Lifeward (formerly known as ReWalk)");
  assert.equal(parsed?.name, "Lifeward");
  assert.deepEqual(parsed?.aliases, ["ReWalk"]);
});

test("parseCompanyLine extracts a domain", () => {
  const parsed = parseCompanyLine("Lambda (lambda.ai)");
  assert.equal(parsed?.name, "Lambda");
  assert.equal(parsed?.domain, "lambda.ai");
});

test("parseCompanyList skips blanks and dedupes slugs", () => {
  const companies = parseCompanyList("Stripe\n\nStripe\nHailo\n");
  assert.equal(companies.length, 2);
  assert.equal(companies[0].id, "stripe");
});

test("ambiguous companies get a tighter search query", () => {
  const company = toCompany({ name: "Peak", searchName: "Peak", aliases: [] });
  assert.equal(company.isAmbiguous, true);
  assert.match(buildSearchQuery(company), /startup/);
});

test("Future Family is treated as an ambiguous collocation name", () => {
  const company = toCompany({ name: "Future Family", searchName: "Future Family", aliases: [] });
  assert.equal(company.isAmbiguous, true);
  assert.match(buildSearchQuery(company), /startup/);
});
