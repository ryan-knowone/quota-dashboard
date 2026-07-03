# Show HN draft — quota-dashboard (tightened)

## Title
Show HN: A local-only dashboard for AI subscription quota (Claude, Kimi, Z.ai)

## Body
I kept hitting quota walls across Claude Code Max, Kimi, and Z.ai, so I built a static HTML dashboard that checks remaining quota without any server or localStorage.

Open the page, paste your tokens into browser memory, and refresh. Tokens only go to the provider APIs — never to a backend or any storage.

Live demo (no credentials needed): https://ryan-knowone.github.io/quota-dashboard/?mock=1
Repo: https://github.com/ryan-knowone/quota-dashboard

Supports Claude Code Max, Kimi, and Z.ai. I'd love feedback on the token UX and what other providers would be useful.

---
Notes for Ryan
- Post during Tue–Thu 8–10 AM EST for best HN visibility.
- Be ready to respond to comments about how tokens are handled (session memory only, no localStorage, no backend).
