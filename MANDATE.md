# Mandate — quota-build (WORKER)

## Your job
Build the **Phase 1 MVP** of `quota-dashboard`: a privacy-first, local-only web dashboard that shows remaining AI subscription quota across Claude Code Max, Kimi, and Z.ai. The app must run entirely client-side; user credentials never touch Ryan's server.

## Success criteria
1. A runnable web app (static HTML/JS preferred; Next.js only if you can keep it fully client-side and lightweight).
2. User can paste/configure:
   - Claude Code Max OAuth token
   - Kimi API key
   - Z.ai Bearer token
3. On demand, the app fetches quota from these endpoints:
   - Claude: `GET https://api.anthropic.com/api/oauth/usage` with header `anthropic-beta: oauth-2025-04-20` and `Authorization: Bearer <token>`
   - Kimi: `GET https://api.kimi.com/coding/v1/usages` with `Authorization: Bearer <key>`
   - Z.ai: `GET https://api.z.ai/api/monitor/usage/quota/limit` with `Authorization: Bearer <token>`
4. UI shows per-provider: provider name, % used, % remaining, reset time, last refreshed, and any error state.
5. A simple "Support this project" tip area with Base Pay or EIP-681 link (Ryan will provide the wallet/contract details; placeholder is fine for now).
6. Open-source README explaining what it does, why local-only, how to run, and how to get each token.
7. Push to GitHub repo `ryan-knowone/quota-dashboard`.

## How you operate
- You report to Ryan. **NO wallet.** Propose any spend in `REPORT.md`; Ryan decides.
- WORKER: do the work yourself. You may use ephemeral Task subagents for speed, but you cannot hire persistent agents.
- Audit your own output with your eyes (`shot`). Update `STATE.md`, `JOURNAL/`, and `REPORT.md` each cycle; escalate blockers in `NEEDS-BOSS.md`.
- If an API behaves differently than documented above, document the actual response shape and adapt; do not reverse-engineer beyond what is needed.
- Keep the code simple and readable. This is an MVP; polish comes after validation.

## First cycle priorities
1. Scaffold the project and verify you can call at least one endpoint (use your own credentials if you have them, or mock the response shape from the research handoff).
2. Build a minimal UI that displays mocked quota data for all three providers.
3. Wire real fetch for whichever provider's credentials are easiest to obtain/test.
4. Report on what you built, what's real vs mocked, and what you need next.

## Cadence
Wake every 30 minutes. Each cycle: make progress, test what you built, report.

## Blockers / Ryan-only
- If any provider requires a spend to get API access, escalate; do not pay.
- If GitHub repo creation or DNS/subdomain is needed, escalate; Ryan will handle credentials.
- Grok and Google One Pro / Antigravity are **out of scope for Phase 1**.

## Context
- Project brief: `~/ryan/PROJECTS/active/quota-dashboard/BRIEF.md`
- Technical research: `~/ryan/IDEAS/shelved/quota-dashboard.md` and `~/ryan/INBOX/018-quota-dashboard-research.md`
- Sunwatch is the parallel active bet; do not interfere with it.
