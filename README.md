# Quota Dashboard

A privacy-first, local-only web dashboard that shows remaining AI subscription quota across Claude Code Max, Kimi, and Z.ai.

Your credentials stay on your machine. The app is a static HTML/JS page that runs entirely in your browser and talks directly to the provider APIs.

## Why local-only?

AI quota data is sensitive. Handing your API keys or OAuth tokens to a third-party server is a trust risk. This dashboard:

- Never sends your tokens to any server except the provider APIs.
- Stores tokens only in browser memory for the session (not in localStorage or cookies).
- Is fully open source so you can audit exactly what it does.

## Supported providers (Phase 1)

| Provider | Endpoint | What you need |
|---|---|---|
| Claude Code Max | `https://api.anthropic.com/api/oauth/usage` | OAuth token from Claude Code Max |
| Kimi | `https://api.kimi.com/coding/v1/usages` | API key from [Kimi platform](https://platform.moonshot.cn/) |
| Z.ai | `https://api.z.ai/api/monitor/usage/quota/limit` | Bearer token from Z.ai |

**Important:** Kimi has two different keys. The quota endpoint needs a key from the Kimi platform (above). The `sk-kimi-...` key used by Claude Code's Anthropic-compatible proxy does **not** work here. If you paste the wrong key, you will see an "Invalid token" error.

When a provider returns multiple quota windows, the dashboard shows the highest-utilization window so you see the tightest constraint first.

## Run locally

No build step is required.

```bash
# Clone or download the repo
cd quota-dashboard

# Option 1: open directly in your browser
open index.html

# Option 2: serve with any static server
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Get your tokens

### Claude Code Max OAuth token

1. Open Claude Code Max in your browser.
2. Open the browser's Developer Tools → Network tab.
3. Trigger a usage or refresh action.
4. Look for a request to `api.anthropic.com/api/oauth/usage`.
5. Copy the `Authorization: Bearer <token>` value.

### Kimi API key

1. Log in to the [Kimi platform](https://platform.moonshot.cn/).
2. Go to your account / API keys section.
3. Create or copy an existing API key.

**Do not use your Claude Code proxy key** (`sk-kimi-...`). That key is for the Anthropic-compatible chat endpoint (`api.kimi.com/coding/v1/chat/completions`) and will return `Invalid Authentication` on the usage endpoint. The usage endpoint requires a platform API key from `platform.moonshot.cn`.

### Z.ai Bearer token

1. Log in to [Z.ai](https://www.z.ai/).
2. Open Developer Tools → Network tab.
3. Navigate to usage/quota pages.
4. Look for a request to `api.z.ai/api/monitor/usage/quota/limit`.
5. Copy the `Authorization: Bearer <token>` value.

## Mock mode

Toggle "Use mock data" to preview the UI without real tokens. This is useful for development and demos.

## Development

The codebase is intentionally small:

- `index.html` — page structure
- `app.js` — fetch logic and rendering
- `styles.css` — styling

Edit any file and refresh the browser. No bundler needed.

## CORS note

Some provider APIs may block requests from `file://` origins. If you see CORS errors, run the app through a local static server (see "Run locally" above).

## Roadmap

- Phase 2: browser extension mode to support Grok and Google One Pro / Antigravity by inheriting live browser sessions.
- Auto-refresh, burn-rate charts, and low-quota alerts.

## Support this project

If you find this useful, you can tip USDC on Base:

- Address: `0x1e2D7F8715E8180816c0236A5c4F21596C5b9c9e`
- Click **Copy** in the app footer, or use the **Open in wallet** button for an EIP-681 deep link.

## License

MIT
