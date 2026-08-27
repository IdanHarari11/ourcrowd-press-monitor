# OurCrowd Press Monitor

OurCrowd Press is a press-monitoring system for OurCrowd portfolio and fund companies. It collects recent news, classifies each mention as positive, negative, or neutral, shows last-mentioned status on a dashboard, and raises a daily alert when new coverage appears.

This repository is the 2026 Full Stack Developer take-home. Reviewers can open the committed `data/` snapshot without re-running collection.

Live demo: https://ourcrowd-press-monitor.vercel.app

Source (private): https://github.com/IdanHarari11/ourcrowd-press-monitor

## What the assignment asked for, and how this repo meets it

The spec is `OC FullStack Dev Task 2026.pdf`. The seed list is `ourcrowd_companies.txt` (copied to `data/source/ourcrowd_companies.txt`).

| Requirement | How it is met |
| --- | --- |
| Track the provided company list | 258 names from `ourcrowd_companies.txt` are the source of truth. `npm run ingest:companies` (also run by the pipeline) parses them into `data/companies.json`. Occasional `(formerly ...)` and domain annotations become aliases or domains. |
| Quarterly press dashboard | The UI lists every company and its mentions in the current window. The window is a **rolling last 90 days** (`QUARTER_DAYS = 90` in `src/lib/paths.ts`), not a calendar quarter. Google News is queried with `when:90d`; GDELT with `timespan=3m`; stored mentions older than the window are dropped. |
| Sentiment: positive / negative / neutral | Each classified mention has one of those three labels. Irrelevant items are forced to `neutral`. |
| Source URL per mention | Every mention stores `url` (and `sourceName`). The dashboard links that URL. |
| Current status from last mention date | `formatStatusLabel` produces copy such as `Last mentioned 3 days ago`, `Last mentioned 45 days ago`, and `No coverage found` (plus `today` / `1 day ago`). Status is computed from the newest **relevant** mention. |
| Daily detection of new mentions | `npm run alert` collects incrementally, classifies pending items, and diffs relevant mention IDs against `data/mention-snapshot.json`. |
| Daily alert when new coverage is found | Visible on stdout, written to `data/alerts/latest.json` and `data/alerts/latest.txt`, and POSTed to `ALERT_WEBHOOK_URL` when set (Slack incoming webhooks accepted). No email is sent by default. |
| Sentiment via locally hosted Ollama (required) | Default classifier is Ollama (`llama3.2:3b`). Leave `CLASSIFIER_PROVIDER` empty, or set `ollama`. See [Local LLM vs cloud API LLM](#local-llm-vs-cloud-api-llm). |
| Node.js backend for collection | Collection, classification, storage, and the alert job are Node.js (TypeScript). The dashboard is Next.js on the same stack. |
| Storage | JSON files under `data/` (no database). |
| UI | Next.js App Router dashboard at `/` (company drawer plus `/companies/[slug]`). |
| Scheduled job | `npm run alert` (cron example below). The dashboard **Run Daily Check** button calls `POST /api/daily-check`. |
| `data/` from a successful run | Committed. Run of 2026-08-27: 258 companies, 911 mentions classified with `llama3.2:3b` (plus a lexical namesake gate), 403 relevant, 125 companies with coverage this quarter, 133 with no coverage found. |
| Copy of the AI prompt | `PROMPT.md`. |
| News source choice and limitations | Google News RSS (primary) plus GDELT 2.0 DOC API (merged). Documented below. |

The three product outputs the spec grades are: quarterly dashboard, last-mentioned status, and daily alert.

## Architecture

```
data/source/ourcrowd_companies.txt
        |
        v
 scripts/pipeline.ts   (Node.js)
        |-- collect    Google News RSS + GDELT
        |-- classify   Ollama by default (optional OpenAI-compatible API)
        |-- status     last-mentioned labels + quarter counts
        v
 data/*.json
        |-- Next.js dashboard (read-only over the JSON)
        |-- scripts/alert.ts  (daily delta + notification)
```

| Path | Role |
| --- | --- |
| `src/lib/news/collect.ts` | Fetch and merge news per company |
| `src/lib/classifier/` | Relevance + sentiment (Ollama default) |
| `src/lib/status.ts` | Last-mentioned status labels |
| `src/lib/alerts.ts` | Daily delta and notification |
| `src/app/` | Dashboard UI |
| `scripts/` | CLI entry points (`pipeline`, `alert`, `collect`, `classify`, `ingest:companies`) |
| `data/` | Seed list and output of a successful run |
| `PROMPT.md` | Prompt material used with the AI coding assistant |

## Local LLM vs cloud API LLM

### Assignment default: Ollama on your machine

The spec requires sentiment (and other text understanding) to run through a **locally hosted Ollama model**, not a cloud LLM.

- Model: `llama3.2:3b` (`OLLAMA_MODEL`). Small enough for a laptop, instruction-tuned enough for namesake filtering (`Peak`, `Wave`, `Ro`, and similar), and it follows the JSON schema well enough for batch classification.
- Provider: leave `CLASSIFIER_PROVIDER` empty, or set `CLASSIFIER_PROVIDER=ollama`.
- Endpoint: `POST {OLLAMA_HOST}/api/chat` with `stream: false`, `temperature: 0`, and a JSON Schema `format` field (`src/lib/classifier/ollama.ts`).
- Prompt: system + user text in `src/lib/classifier/prompt.ts`. The model must return `relevant`, `sentiment` (`positive` / `negative` / `neutral`), and a one-sentence `rationale` per item. Irrelevant items must still use `neutral`.
- Batching: small per-company batches (`CLASSIFY_BATCH_SIZE`, default 3). Already-classified IDs are skipped on later runs.
- Validation: informal manual spot-check in `data/validation-spotcheck.md` (headlines vs labels after a real `llama3.2:3b` run). Funding and crash headlines matched human judgment; some SEO-junk titles that only contain the company token were still marked relevant. This is not a labelled gold set.

Expected structured output:

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

A lexical gate (`src/lib/relevance.ts`) can mark obvious namesakes as irrelevant **before** the LLM. Those items are stored with `model: "lexical-gate"` and do not consume an Ollama call.

### Why a cloud path exists at all

Vercel has no Ollama process. The committed `data/*.json` is bundled into the app (`src/lib/bundled-data.ts`), so the hosted dashboard is readable without classifying anything.

An optional OpenAI-compatible classifier (`OPENAI_API_KEY` or `AI_GATEWAY_API_KEY`, `CLASSIFIER_PROVIDER=openai`) uses the **same JSON schema and prompts** as Ollama so **Run Daily Check** can run in the cloud. This is production wiring, not the assignment default. Local review should stay on Ollama.

Resolution (`src/lib/classifier/provider.ts`):

1. `CLASSIFIER_PROVIDER=ollama` always uses Ollama.
2. `CLASSIFIER_PROVIDER=openai` or `ai-gateway` uses the OpenAI-compatible path.
3. If `CLASSIFIER_PROVIDER` is empty and the process is on Vercel **and** a cloud key is set, the app uses the OpenAI-compatible path.
4. Otherwise Ollama.

Do not set `CLASSIFIER_PROVIDER=ollama` on Vercel. There is no local model there.

Without a cloud key, the hosted Daily Check returns HTTP 501 and does not pretend to succeed.

### Vercel environment variables

In the Vercel project: Settings, Environment Variables (Production and Preview):

1. Set `OPENAI_API_KEY` **or** `AI_GATEWAY_API_KEY` (a real key; never a placeholder).
2. Optionally set `CLASSIFIER_PROVIDER=openai` (or `ai-gateway`) and `CLASSIFIER_MODEL`.
3. Redeploy.

Optional: `OPENAI_BASE_URL` for a compatible endpoint (Groq, Azure, and similar). Default cloud model is `gpt-4.1-mini` (or `openai/gpt-4.1-mini` on AI Gateway).

### Honest limits of the hosted Daily Check

- One Vercel request is not a full 258-company pipeline. The handler is capped at 60 seconds (`maxDuration`). Work stops around 48 seconds so the run can finish as success or failed instead of hanging on "running".
- Cloud batches default to `CLOUD_COLLECT_LIMIT=6` companies and `CLOUD_CLASSIFY_LIMIT=9` mentions, preferring firms with no or stale coverage.
- The Vercel filesystem is ephemeral and the app does not persist `data/*.json` there. Live results stay in memory for that request. Durable updates still come from a local (or CI) run that writes JSON and deploys.
- The full collect-classify-status job is `npm run pipeline` on a machine with a writable disk (your laptop, or CI if you add a workflow). This repo does not ship a GitHub Actions workflow.

## How to run locally

Prerequisites: Node.js 20+ (developed on 24), npm, and [Ollama](https://ollama.com) running locally.

### Install Ollama and the model

macOS:

```bash
brew install ollama
brew services start ollama
ollama pull llama3.2:3b
```

Or install the app from https://ollama.com, start it, then pull the model.

Confirm:

```bash
curl http://127.0.0.1:11434/api/tags
```

Override the model with `OLLAMA_MODEL` in `.env` if you prefer another local tag (`gemma2:2b`, `llama3.1:8b`, and similar).

### Project setup

```bash
git clone https://github.com/IdanHarari11/ourcrowd-press-monitor.git
cd ourcrowd-press-monitor
cp .env.example .env
npm install
```

Do not commit `.env`.

### End-to-end commands (from `package.json`)

```bash
# Ingest companies, fetch last-quarter news, classify with Ollama, write data/
npm run pipeline

# Emit the daily alert from the collected results (first run treats unseen IDs as new)
npm run alert -- --skip-fetch

# Dashboard
npm run dev
```

Open http://localhost:3000

The first CLI alert run treats unseen relevant mentions as new. Later runs only alert on IDs not already stored in `data/mention-snapshot.json`.

Other scripts:

```bash
npm run ingest:companies          # parse the seed list only
npm run collect                   # fetch news (keeps existing classifications)
npm run collect -- --limit 20     # smoke-test collection
npm run classify                  # classify pending mentions
npm run alert                     # collect + classify + alert (for cron)
npm run lint
npm test                          # unit tests (no network, no Ollama)
npm run build                     # production Next.js build
npm start                         # serve the production build
```

`npm run audit:relevance` re-applies the lexical relevance gate to stored mentions. It is a maintenance helper, not part of the required daily path.

### Daily job (cron)

```cron
0 8 * * * cd /path/to/ourcrowd-press-monitor && npm run alert >> data/alerts/cron.log 2>&1
```

`npm run alert` fetches incrementally, classifies new items only, diffs against `data/mention-snapshot.json`, prints the alert, writes `data/alerts/latest.json` and `data/alerts/latest.txt`, and POSTs to `ALERT_WEBHOOK_URL` when set.

On a local `npm run dev` machine, **Run Daily Check** spawns `npm run alert` via `POST /api/daily-check`. On Vercel it runs in-process only when a cloud classifier key is set, and only for the short batch described above.

## Environment variables

Copy `.env.example` to `.env` locally. Never commit secrets.

| Variable | Purpose |
| --- | --- |
| `OLLAMA_HOST` | Local Ollama HTTP API (default `http://127.0.0.1:11434`). Unused on Vercel. |
| `OLLAMA_MODEL` | Local model id (default `llama3.2:3b`). Unused on Vercel. |
| `CLASSIFIER_PROVIDER` | `ollama`, `openai`, or `ai-gateway`. Empty locally means Ollama. |
| `OPENAI_API_KEY` | Optional OpenAI-compatible API key. Required on Vercel to enable live Daily Check. |
| `AI_GATEWAY_API_KEY` | Alternative to `OPENAI_API_KEY` (Vercel AI Gateway). |
| `OPENAI_BASE_URL` | Optional compatible endpoint. Defaults to OpenAI or `https://ai-gateway.vercel.sh/v1` when the gateway path is selected. |
| `CLASSIFIER_MODEL` | Cloud model id (optional; default `gpt-4.1-mini`). `OPENAI_MODEL` is accepted as an alias. |
| `ALERT_WEBHOOK_URL` | Optional POST target for the daily alert. Slack incoming webhooks send `{ text }`; other URLs receive the JSON payload. |
| `MAX_ARTICLES_PER_COMPANY` | Cap per company after merge (default `5`). |
| `COLLECT_CONCURRENCY` | Parallel news fetches (default `5`). |
| `CLASSIFY_BATCH_SIZE` | Mentions per LLM call (default `3`). |
| `NEWS_FETCH_TIMEOUT_MS` | Per-source HTTP timeout (default 20000 local, 8000 on Vercel). |
| `CLASSIFY_TIMEOUT_MS` | Cloud classify timeout (default 45000 local, 15000 on Vercel). |
| `CLOUD_COLLECT_LIMIT` | Max companies in a Vercel Daily Check (default `6`). |
| `CLOUD_CLASSIFY_LIMIT` | Max mentions classified in a Vercel Daily Check (default `9`). |

## Data folder (successful run)

The spec asks for collected mentions, sentiment labels, source links, and last-mentioned status so a reviewer does not have to re-run the pipeline. That output is committed.

| File | Contents |
| --- | --- |
| `data/source/ourcrowd_companies.txt` | Seed list as provided |
| `data/companies.json` | Parsed companies (ids, aliases, domains) |
| `data/mentions.json` | Mentions with URLs, dates, sentiment, rationale |
| `data/company-status.json` | Last-mentioned status per company |
| `data/pipeline-meta.json` | Run metadata (window, model, counts) |
| `data/alerts/latest.json` | Last structured alert |
| `data/alerts/latest.txt` | Last human-readable alert |
| `data/mention-snapshot.json` | Mention IDs already alerted |
| `data/validation-spotcheck.md` | Informal LLM quality check |

Regenerate with `npm run pipeline` then `npm run alert -- --skip-fetch`.

## News sources

Primary: [Google News RSS](https://news.google.com/rss) (`when:90d`), no API key.

Secondary: [GDELT 2.0 DOC API](https://blog.gdeltproject.org/gdelt-2-0-our-global-world-in-realtime/) (`timespan=3m`), queried in parallel and merged, then capped per company.

Limitations:

- Both feeds are public, noisy, and rate-limited. They are not licensed news archives.
- Google News links are often Google redirect URLs, not publisher permalinks. GDELT usually provides the original URL. The UI links whatever URL was collected.
- Coverage is English-biased (`hl=en-US`) and incomplete for small or non-English companies.
- `MAX_ARTICLES_PER_COMPANY` (default 5) keeps classification tractable. High-profile names (Stripe, SpaceX, Anthropic) have more coverage than we store.

## Assumptions and limitations

- **Quarter** means rolling last 90 days from "now", not Q1/Q2/Q3/Q4.
- **New Coverage** on the dashboard is discovery against `data/mention-snapshot.json` (relevant IDs not yet alerted), not "published in the last N days". A story from last month can still show as new if this run is the first time we stored it. After a successful alert, those IDs move into the snapshot.
- **Status** uses relevant mentions only. Namesake hits that the lexical gate or the LLM marked `relevant=false` do not move last-mentioned date.
- Ambiguous names get extra query terms and LLM relevance filtering. False positives and false negatives still happen (see the spot-check).
- Sentiment is headline/snippet level. RSS snippets are short; the model does not fetch full article bodies.
- No authentication and no multi-user accounts.
- No email channel. Alerts are console, files, and optional webhook.
- The company list is names only, plus occasional former-name or domain notes. No official sector map was provided.
- Empty, loading, and error states exist in the UI. There is no CSV/PDF export; the assignment does not require one.

## Tests

```bash
npm test
```

Node's built-in test runner via `tsx --test`. Coverage: company-list parsing, status labels, alert diffs (including New Coverage vs snapshot), JSON extraction from LLM output, lexical relevance, news URL normalization, cloud collect targeting, and daily-check run phases. No network and no Ollama.

```bash
npm run lint
```

## Dashboard

Overview: quarterly KPIs, stacked sentiment timeline, coverage table for all 258 companies (paginated; chips for Very Recent / Recent / Stale / No Coverage), recent mentions, and the latest daily-check alert. Rows open a details drawer with source URLs. Company pages live at `/companies/[slug]`.

**Run Daily Check** starts collect + classify + alert. Locally that is a spawned `npm run alert`. On Vercel it is in-process only when a cloud key is configured, and only for the short batch described above.
