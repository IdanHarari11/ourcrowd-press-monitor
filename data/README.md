# Data outputs

This folder is the storage layer for a successful pipeline run.

| File | Produced by | Purpose |
|------|-------------|---------|
| `source/ourcrowd_companies.txt` | provided | Seed list (source of truth) |
| `companies.json` | `npm run ingest:companies` / pipeline | Parsed companies |
| `mentions.json` | collect + classify | Mentions, URLs, sentiment |
| `company-status.json` | pipeline | Last-mentioned status per company |
| `pipeline-meta.json` | pipeline | Run window, model, counts |
| `mention-snapshot.json` | `npm run alert` | Mention ids already alerted |
| `alerts/latest.json` | `npm run alert` | Last structured alert |
| `alerts/latest.txt` | `npm run alert` | Human-readable alert |
| `validation-spotcheck.md` | manual | Informal LLM quality check |

Regenerate with:

```bash
npm run pipeline
npm run alert -- --skip-fetch
```
