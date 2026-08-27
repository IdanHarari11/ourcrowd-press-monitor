# OurCrowd Press Monitor

Quarterly press-mentions dashboard, sentiment classification via a **local Ollama model**, and a daily alert job for OurCrowd portfolio / fund companies.

This is the 2026 Full Stack Developer take-home: it tracks the seed company list, collects recent coverage, classifies each mention as positive / negative / neutral, surfaces “last mentioned X days ago”, and alerts when new coverage appears.

## What you get

1. **Quarterly press dashboard** — every company, its last-90-day mentions, sentiment, and a link back to the source article.
2. **Current mention status** — `Last mentioned 3 days ago` / `45 days ago` / `No coverage found`.
3. **Daily alert** — a Node.js job that diffs new relevant mentions against a snapshot and writes a visible alert (console + `data/alerts/`, optional webhook).

## Architecture

```
data/source/ourcrowd_companies.txt   seed list (source of truth)
        │
        ▼
 scripts/pipeline.ts
        ├── collect   Google News RSS + GDELT (Node.js)
        ├── classify  Ollama (default) or optional OpenAI-compatible API
        └── status    last-mentioned + quarter counts
        │
        ▼
 data/*.json                         reviewable output (no database)
        │
        ├── Next.js dashboard (read-only)
        └── scripts/alert.ts         daily delta + notification
```

All backend and collection code is JavaScript/TypeScript on Node.js, as required. Storage is JSON files so reviewers can inspect results without running a database.

## Project structure

| Path | Role |
|------|------|
| `src/lib/news/collect.ts` | News collection (Google News RSS + GDELT fallback) |
| `src/lib/classifier/` | Sentiment + relevance (Ollama default, optional cloud API) |
| `src/lib/status.ts` | Last-mentioned status |
| `src/lib/alerts.ts` | Daily delta + notification |
| `src/app/` | Dashboard UI (App Router) |
| `scripts/` | CLI entry points |
| `data/` | Seed list + output of a successful run |
| `PROMPT.md` | Full prompt used with the AI coding assistant |

## Prerequisites

- Node.js 20+ (developed on 24)
- npm
- [Ollama](https://ollama.com) running locally

### Install and run Ollama

macOS:

```bash
brew install ollama
brew services start ollama
ollama pull llama3.2:3b
```

Or download the app from [ollama.com](https://ollama.com), start it, then pull the model.

Confirm:

```bash
curl http://127.0.0.1:11434/api/tags
```

### Why `llama3.2:3b`

- Small enough to run on a laptop CPU/GPU without a cloud LLM.
- Follows JSON-schema structured output reliably enough for batch classification.
- Fast enough to classify hundreds of headlines in a take-home setting.
- Instruction-tuned, which matters for relevance filtering on ambiguous names (`Peak`, `Wave`, `Ro`, …).

Override with `OLLAMA_MODEL` in `.env` if you prefer another local model (`gemma2:2b`, `llama3.1:8b`, etc.).

## Setup

```bash
git clone <this-repo>
cd ourcrowd-press-monitor
cp .env.example .env
npm install
```

## Environment variables

Copy `.env.example` to `.env` locally. **Never commit `.env`.** Secrets belong in `.env` (gitignored) or the Vercel dashboard.

| Variable | Purpose | Local (assignment) | Vercel production |
| --- | --- | --- | --- |
| `OLLAMA_HOST` | Local Ollama HTTP API | `http://127.0.0.1:11434` | unused (no Ollama on Vercel) |
| `OLLAMA_MODEL` | Local model id | `llama3.2:3b` | unused |
| `CLASSIFIER_PROVIDER` | `ollama` \| `openai` \| `ai-gateway` | leave empty → Ollama | leave empty; auto-cloud only if a key is set |
| `OPENAI_API_KEY` | OpenAI-compatible API key | optional | **required** to enable live Daily Check |
| `AI_GATEWAY_API_KEY` | Vercel AI Gateway key (alternative to OpenAI) | optional | alternative to `OPENAI_API_KEY` |
| `OPENAI_BASE_URL` | Compatible endpoint (Groq, Azure, gateway, …) | optional | optional |
| `CLASSIFIER_MODEL` | Cloud model id | optional (`gpt-4.1-mini`) | optional |
| `ALERT_WEBHOOK_URL` | Slack/webhook for daily alerts | optional | optional |
| `MAX_ARTICLES_PER_COMPANY` | Cap per company | `5` | same default in code |
| `COLLECT_CONCURRENCY` | Parallel news fetches | `5` | same default in code |
| `CLASSIFY_BATCH_SIZE` | Mentions per LLM call | `3` | same default in code |

The take-home **must** classify via local Ollama. The cloud path is optional production wiring: same JSON schema (`relevant` + `sentiment`), same prompts. Do not set `CLASSIFIER_PROVIDER=ollama` on Vercel — there is no local model there. Without a cloud key, the hosted dashboard stays an honest read-only snapshot (Daily Check returns 501, never a fake Success).

### Enable live Daily Check on Vercel

In the Vercel project → Settings → Environment Variables (Production + Preview):

1. Add `OPENAI_API_KEY` **or** `AI_GATEWAY_API_KEY` (a real key — never a placeholder).
2. Optionally set `CLASSIFIER_PROVIDER=openai` (or `ai-gateway`) and `CLASSIFIER_MODEL`.
3. Redeploy.

Live runs on Vercel cannot write `data/*.json` (read-only filesystem). Results are shown in that request/session; durable updates still come from a local/CI pipeline that commits JSON.

## Run end-to-end (local)

```bash
# 1. Ingest companies, fetch last-quarter news, classify with Ollama, write data/
npm run pipeline

# 2. Emit the daily alert from the collected results (first run treats everything as new)
npm run alert -- --skip-fetch

# 3. Open the dashboard
npm run dev
```

Dashboard: [http://localhost:3000](http://localhost:3000)

The dashboard **Run Daily Check** button starts the same `npm run alert` job (collect, classify, diff, notify) and polls until it finishes. The first CLI alert run treats unseen mentions as new; later runs only alert on ids not in `data/mention-snapshot.json`.

Useful variants:

```bash
npm run ingest:companies          # parse the seed list only
npm run collect                   # fetch news (keeps existing classifications)
npm run collect -- --limit 20     # smoke-test collection
npm run classify                  # classify pending mentions
npm run alert                     # collect + classify + alert (for cron)
npm test                          # unit tests (no network, no Ollama)
```

### Daily job (cron)

```cron
0 8 * * * cd /path/to/ourcrowd-press-monitor && npm run alert >> data/alerts/cron.log 2>&1
```

`npm run alert` fetches incrementally, classifies **new** items only, diffs against `data/mention-snapshot.json`, prints the alert, writes `data/alerts/latest.json` and `data/alerts/latest.txt`, and POSTs to `ALERT_WEBHOOK_URL` when set (Slack incoming webhooks are supported).

## Local LLM: prompt, format, validation

**Endpoint:** `POST {OLLAMA_HOST}/api/chat` with `stream: false`, `temperature: 0`, and a JSON Schema `format` so the model returns structured output.

**System prompt** (see `src/lib/classifier/prompt.ts`):

- Decide `relevant` (is this article about *this* company, not a namesake?).
- Assign `sentiment`: `positive` | `negative` | `neutral`.
- Irrelevant items are forced to `neutral`.
- One-sentence rationale.

**Expected output:**

```json
{
  "items": [
    {
      "id": "a1b2c3d4e5f6g7h8",
      "relevant": true,
      "sentiment": "positive",
      "rationale": "Announces a funding round."
    }
  ]
}
```

Mentions are classified in small per-company batches. Already-classified ids are skipped on later runs.

**Quality check:** `data/validation-spotcheck.md` records a manual review of sample headlines after a real pipeline run on 2026-08-27 (`llama3.2:3b`, 813 items). Funding and crash headlines matched human judgment; a few SEO-junk titles that merely contain the company token were still marked relevant. This is informal, not a labelled gold set.

## Data folder (successful run)

After `npm run pipeline` (and optionally `npm run alert -- --skip-fetch`):

This repo already includes a successful 2026-08-27 run:

- 258 companies tracked (same names as the provided `ourcrowd_companies.txt`)
- 911 collected mentions, 911 classified (`llama3.2:3b` plus a lexical namesake gate)
- 403 relevant / 508 filtered as namesakes or unrelated
- 125 companies with coverage this quarter, 133 with no coverage found

| File | Contents |
|------|----------|
| `data/source/ourcrowd_companies.txt` | Seed list as provided |
| `data/companies.json` | Parsed companies (ids, aliases, domains) |
| `data/mentions.json` | Mentions with URLs, dates, sentiment, rationale |
| `data/company-status.json` | Last-mentioned status per company |
| `data/pipeline-meta.json` | Run metadata (window, model, counts) |
| `data/alerts/latest.json` | Last alert payload |
| `data/mention-snapshot.json` | Ids already alerted |

## Assumptions and limitations

- **News source:** Google News RSS is the primary source (no API key). [GDELT 2.0 DOC API](https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/) is queried in parallel and merged. Both are public, noisy, and rate-limited. They are not licensed news archives.
- **Google News links** are often Google redirect URLs, not publisher permalinks. GDELT usually provides the original URL. The dashboard links whatever URL was collected.
- **Ambiguous names** (`Peak`, `Island`, `Harvey`, …) get extra query terms (`startup`, `OurCrowd`, …) and an LLM relevance filter. False positives/negatives still happen.
- **Cap:** `MAX_ARTICLES_PER_COMPANY` (default 5) keeps classification tractable. High-profile names (Stripe, SpaceX, Anthropic) will have more coverage than we store.
- **Quarter** = rolling last 90 days, not a calendar quarter.
- **Sentiment** is headline/snippet level, not full-article reading. RSS snippets are short.
- **No auth, no multi-user.** The assignment daily job is cron / `npm run alert` / the dashboard button on a local machine with Ollama. Vercel is a read-only snapshot unless a cloud classifier key is configured (see Environment variables).
- Company list contains **names only** (plus occasional “formerly …” / domain). No official sector/domain map was provided.

## Tests

```bash
npm test
```

Covers company parsing, status labels, alert diffs, and JSON extraction from LLM output.

## UI notes

Dark analytics desk (Inter + IBM Plex Mono). Overview shows quarterly KPIs, a stacked sentiment timeline, coverage status for every company (paginated), recent mentions, and the latest daily-check alert. Company rows open a details drawer with source URLs. `Run Daily Check` starts collect + classify + alert via `POST /api/daily-check` (local spawn of `npm run alert`; on Vercel, in-process only when a cloud API key is set). Empty, loading, and error states are implemented. There is no export — the assignment does not produce one.
