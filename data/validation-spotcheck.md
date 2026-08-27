# Informal classification spot-check

Run: 2026-08-27, model `llama3.2:3b`, 813 headlines, 693 labelled relevant.

Method: read the headline (and snippet when present) and compare to the model label. This is not a labelled gold set.

| Company | Headline (abridged) | Model | Human | Notes |
|---------|---------------------|-------|-------|-------|
| ZutaCore | $100 Million Series C Raised To Expand AI Data Center Cooling | positive / relevant | agree | Clear funding win |
| ZutaCore | Raises $100M Series C to Scale Waterless Two-Phase Cooling | positive / relevant | agree | Same event, second source |
| Harvey | ditches GPT base, adopts Chinese open-source model Kimi K3 | negative / relevant | mixed | Product change; tone is slightly alarming, not a scandal |
| Cerebras | Revenue Surges: Why Did CBRS Stock Crash | negative / relevant | agree | Headline frames a crash |
| Stripe | 2026 Penn State Football Game Themes Announced | irrelevant | agree | Namesake / unrelated |
| OpenEvidence | Atlanta FC Vs Nashville SC Pregame Warm Ups Openevidence | irrelevant | agree | SEO junk title |
| OpenEvidence | Teen Accused Of Starting NJ Wildfires Openevidence | **negative / relevant** | **disagree** | Same SEO junk; should be irrelevant |
| Harbinger Motors | NHTSA commercial vehicle recalls for the week of July 6 | irrelevant | agree | Company not the subject |

## Takeaways

- Funding and crash headlines are labelled well.
- Relevance filtering removes many namesake/sports/SEO hits.
- Residual errors: some scraped titles that *contain* the company token but are unrelated still slip through as relevant. The dashboard still links the source, so a reviewer can override by reading the article.
- No classification errors (timeouts/parse failures) in this run.
