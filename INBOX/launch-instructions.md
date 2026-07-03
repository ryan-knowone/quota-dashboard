# Ryan — Launch instructions for quota-dashboard (cycle 24)

GitHub Pages is now enabled at: https://ryan-knowone.github.io/quota-dashboard/
Build may take 1–2 minutes after the next push.

## Immediate to-dos (this cycle)

### 1. Wire the support/tip CTA
Replace the placeholder footer in `index.html` and `README.md` with a real tip link.

- Wallet (Base): `0x1e2D7F8715E8180816c0236A5c4F21596C5b9c9e`
- Use an EIP-681 one-click link for USDC on Base, e.g.:
  ```
  https://ryan-knowone.github.io/quota-dashboard/?tip=1
  ```
  Or an `ethereum:` deep-link. Keep it simple: a button that copies the address and offers the EIP-681 link.
- Base Pay is blocked on KYB, so do NOT use Base Pay.
- Update the footer text from "(wallet details coming soon)" to something like:
  "Tip USDC on Base: 0x1e2D...5c9e · [Copy] [Open in wallet]"

### 2. Clarify the Kimi token instructions (important finding from Ryan's test)
Ryan tested the Kimi endpoint with the org's key and got `Invalid Authentication`.
- The key we have (`sk-kimi-...` in `~/.config/ryan/kimi.env`) is for the **Anthropic-compatible proxy** (`api.kimi.com/coding/v1/chat/completions`), NOT the native Kimi platform usage API.
- The quota endpoint `https://api.kimi.com/coding/v1/usages` requires a **Kimi platform API key** from https://platform.moonshot.cn/.
- Update the README table and the "Get your tokens" section to make this distinction clear:
  - Claude Code Max OAuth token = from Claude Code Max usage API call.
  - Kimi = from Kimi platform (platform.moonshot.cn), NOT the Claude Code proxy key.
  - Z.ai = from Z.ai web app.
- Add a note that if a user pastes the wrong key, they'll see an auth error.

### 3. Improve error UX for auth/CORS failures
- When a fetch returns 401/403, show a helpful message like: "Invalid token. See README for the correct key type."
- When a fetch fails with CORS/network error, show: "CORS or network error. Try running through a local static server instead of file://."
- Keep the raw error available (maybe in a collapsible "Details").

### 4. Fix mock-mode screenshot timing
Mock mode currently uses a 300–700 ms random delay, which causes screenshots to show "Refreshing…" with no cards. Either:
- Remove the mock delay entirely, OR
- Show a skeleton/placeholder state immediately so the UI never looks empty.

### 5. Deploy to GitHub Pages
- GitHub Pages is already enabled from `main` branch / root.
- After making the above changes, commit and push to `main`.
- Verify the live URL returns 200 and renders correctly with `?mock=1`.
- Capture a screenshot of the live deployed page and save it in this repo or OUTBOX.

### 6. Prepare a distribution list
Do not start posting yet — just research and write the list to `OUTBOX/distribution-plan.md`:
- 3–5 GitHub awesome-lists or directories that accept open-source dev tools (no account creation required).
- 1–2 relevant subreddits where this could be posted once social accounts are unblocked.
- 1 Hacker News / Show HN angle (title + one-sentence description).
- Any relevant Discord/Slack communities or Twitter threads to monitor.

## Validation target reminder
quota-dashboard has 14 days from public launch to show:
- ≥10 GitHub stars, OR
- ≥1 tip, OR
- ≥1 unsolicited share/comment.

Speed matters more than polish. Ship the fixes above and get the live URL ready for distribution next cycle.

## No spend
Continue $0-first. No paid tools or placements without Ryan approval.

## Blockers cleared
- GitHub Pages: enabled by Ryan.
- Wallet/tip address: provided above.
- Tokens for live testing: Ryan verified Kimi proxy key does NOT work for usage; document the correct key source instead of testing further.

Report back in your next REPORT.md with:
1. Live GitHub Pages URL status.
2. Screenshot of deployed mock mode.
3. Contents of `OUTBOX/distribution-plan.md`.
4. Any remaining blockers.
