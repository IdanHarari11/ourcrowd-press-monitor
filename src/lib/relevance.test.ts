import { test } from "node:test";
import assert from "node:assert/strict";
import { toCompany } from "./companies";
import {
  applyRelevanceGate,
  assessLexicalRelevance,
  contradictsClaimedRelevance,
  isAmbiguousCompanyName,
} from "./relevance";

const futureFamily = toCompany({ name: "Future Family", searchName: "Future Family", aliases: [] });
const hailo = toCompany({ name: "Hailo", searchName: "Hailo", aliases: [] });

test("Future Family celebrity copy is rejected", () => {
  const celebrity = assessLexicalRelevance(
    futureFamily,
    'Michelle Le from "Married At First Sight" Season 20 Shares Hysterectomy Journey and Future Family Plans',
    "",
  );
  assert.equal(celebrity.ok, false);

  const feud = assessLexicalRelevance(
    futureFamily,
    "Dolly Parton Fears Future Family Feuds Over Her $650M Fortune: ‘Her Worst Nightmare’",
    "",
  );
  assert.equal(feud.ok, false);

  const medicine = assessLexicalRelevance(
    futureFamily,
    "JABSOM Family Medicine Interest Group Earns National Recognition",
    "",
  );
  assert.equal(medicine.ok, false);
});

test("a real Future Family company article still passes the lexical gate", () => {
  const real = assessLexicalRelevance(
    futureFamily,
    "Future Family raises funding to expand fertility financing",
    "The startup Future Family announced a new product for IVF patients.",
  );
  assert.equal(real.ok, true);
});

test("ambiguous single-token names reject a different proper noun", () => {
  const astra = toCompany({ name: "Astra", searchName: "Astra", aliases: [] });
  const mining = assessLexicalRelevance(astra, "Astra Exploration Begins Trading on OTCQX Best Market", "");
  assert.equal(mining.ok, false);
  const construction = assessLexicalRelevance(astra, "Astra Engineering & Construction", "");
  assert.equal(construction.ok, false);
  const own = assessLexicalRelevance(astra, "Astra raises a seed round", "OurCrowd portfolio company Astra.");
  assert.equal(own.ok, true);
});

test("Hailo matches stay relevant when the company is named", () => {
  const hit = assessLexicalRelevance(hailo, "Hailo ships new AI chip", "Hailo announced a processor.");
  assert.equal(hit.ok, true);
  const miss = assessLexicalRelevance(hailo, "Weather hits a new hail record", "");
  assert.equal(miss.ok, false);
});

test("LLM rationale that denies the company overrides relevant=true", () => {
  assert.equal(contradictsClaimedRelevance("Article is about a medical interest group, not Future Family", "Future Family"), true);
  const gated = applyRelevanceGate(futureFamily, {
    title: "JABSOM Family Medicine Interest Group Earns National Recognition",
    snippet: "",
    url: "https://example.com",
    relevant: true,
    rationale: "Article is about a medical interest group, not Future Family",
  });
  assert.equal(gated.relevant, false);
});

test("isAmbiguousCompanyName covers collocations and short names", () => {
  assert.equal(isAmbiguousCompanyName("Future Family"), true);
  assert.equal(isAmbiguousCompanyName("Peak"), true);
  assert.equal(isAmbiguousCompanyName("Ro"), true);
  assert.equal(isAmbiguousCompanyName("Hailo"), false);
});
