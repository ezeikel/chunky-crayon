# Chunky Crayon Worker — Hetzner deploy

This worker runs as a systemd service (`chunky-crayon-worker.service`) on the shared
Hetzner box at `157.90.168.197`, alongside PTP's worker and Auntie Marlene's content
worker. See the repo-root [`HETZNER_BOX.md`](../../../HETZNER_BOX.md) for the full
runbook.

## This worker

| | |
|---|---|
| **Port** | 3030 |
| **Box dir** | `/opt/chunky-crayon/` (full monorepo clone) |
| **Worker subdir** | `apps/chunky-crayon-worker/` |
| **Systemd unit** | `chunky-crayon-worker.service` |
| **Runtime** | Bun under `xvfb-run` (Playwright needs a virtual display) |

## First-time setup on the box

1. `cd /opt && git clone git@github.com:ezeikel/chunky-crayon.git`
2. `cd /opt/chunky-crayon/apps/chunky-crayon-worker && ~/.bun/bin/bun install`
3. `vim .env` (copy from local; see env keys below)
4. `cp deploy/chunky-crayon-worker.service /etc/systemd/system/`
5. `systemctl daemon-reload && systemctl enable --now chunky-crayon-worker`
6. `curl http://localhost:3030/health` — expect `{"status":"ok",...}`

## Required env keys

- `PORT=3030`
- `WORKER_SECRET` — bearer token for `/publish/*` endpoints
- `DATABASE_URL` — Neon production URL (shared Prisma client)
- `R2_*` — storage creds
- `ELEVENLABS_API_KEY` — voiceover + music
- `FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_ACCESS_TOKEN`
- `INSTAGRAM_ACCOUNT_ID`
- Any other social platform tokens (TikTok, Pinterest) once wired in

## Deploying changes

Push to `main` and the workflow at `.github/workflows/deploy-chunky-crayon-worker.yml`
SSHes in and runs `git pull && bun install && systemctl restart chunky-crayon-worker`.
