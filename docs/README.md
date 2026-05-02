# Docs

Permanent reference for how moving parts of this monorepo work. Each topic has its own folder or file. CLAUDE.md is for hot rules; this is for "how does X actually work, end to end."

| Topic                      | Path                                                 | What's in it                                                                                               |
| -------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Daily content crons**    | [crons/](./crons/README.md)                          | Blog + daily-image crons — Vercel thin trigger, Hetzner worker pipeline, fire-and-forget, env requirements |
| **Demo reels**             | [demo-reels/](./demo-reels/README.md)                | Vertical video crons (text + image variants), Hetzner worker, photo library, common failure modes          |
| **Voice mode**             | [voice-mode/](./voice-mode/README.md)                | 2-turn conversational create flow — Deepgram STT, Claude follow-up, ElevenLabs TTS, kid safety stack       |
| **Design system**          | [design-system/](./design-system/README.md)          | Tokens, fonts, motion, brand parity for CC + CH                                                            |
| **Ads**                    | [ads/](./ads/README.md)                              | Config-driven ads, campaign templates, asset generation                                                    |
| **R2 storage migration**   | [R2_STORAGE_MIGRATION.md](./R2_STORAGE_MIGRATION.md) | Historical migration notes                                                                                 |
| **Plans (in-flight work)** | [plans/](./plans/)                                   | Multi-phase implementation plans, scratchpad-style                                                         |

## When to add a doc here

Add a doc when a system has **moving parts that aren't obvious from reading any single file** — when answering "how does X work?" requires holding mental state across a worker service, a cron schedule, a DB schema, an R2 prefix, and three apps.

If a teammate (or you in three months) couldn't reconstruct the system by grepping, write it down.

Specific triggers that earn a doc:

- A cron that fans out to multiple services (web → worker → R2 → DB writeback)
- A piece of seed/test data whose absence silently breaks production (photo library)
- A piece of infrastructure that lives outside the repo (Hetzner box, Cloudflare Workers, third-party webhooks)
- A schema decision with a non-obvious "why" (`showInCommunity` boolean, `purposeKey` string)
- A workaround that future-you will be tempted to "clean up" without understanding (the keepalive Neon ping in the worker, dev-only R2 host fallbacks)

Skip docs for:

- Code that's self-explanatory from one file
- One-off scripts
- Things already covered in `CLAUDE.md`'s rule list (those are short rules, not full docs)

## Format

- One folder per topic. Inside: `README.md` + per-aspect files.
- Lead with **what it is** in two sentences, then a table of moving parts, then an architecture sketch (ASCII or mermaid is fine).
- Always include "where things live" pointing at the real file paths.
- Always include "failure modes (real ones we've hit)" with symptom → root cause → fix.
- Always include manual run / debug commands so the doc is operational, not just descriptive.
