# Quota Dashboard

A privacy-first, local web dashboard that shows remaining AI subscription quota across Claude Code Max, Kimi, and Z.ai.

Your credentials stay on your machine. The app runs as a small local Node server; the browser sends keys to that local server, and the server calls the provider APIs. This avoids browser CORS restrictions and keeps your keys off third-party infrastructure.

## Why local-only?

AI quota data is sensitive. Handing your API keys or OAuth tokens to a hosted service is a trust risk. This dashboard:

- Runs a server on `localhost` that you control.
- Stores tokens only in memory (browser tab + server process) for the session.
- Never writes keys to disk, logs, localStorage, or cookies.
- Is fully open source so you can audit exactly what it does.

## Supported providers (Phase 1)

| Provider | Endpoint | What you need |
|---|---|---|
| Claude Code Max | `https://api.anthropic.com/api/oauth/usage` | OAuth token from Claude Code Max |
| Kimi | `https://api.kimi.com/coding/v1/usages` | API key from [Kimi platform](https://platform.moonshot.cn/) |
| Z.ai | `https://api.z.ai/api/monitor/usage/quota/limit` | Bearer token from Z.ai |

**Important:** The quota endpoint accepts the same `sk-kimi-...` API key used by Claude Code's Anthropic-compatible proxy (verified). If your proxy key returns "Invalid token", create a dedicated key from the Kimi platform above.

When a provider returns multiple quota windows, the dashboard shows the highest-utilization window so you see the tightest constraint first.

## Run locally

Requires Node.js 18+.

```bash
# Clone or download the repo
cd quota-dashboard

# Install dependencies (currently none; this prepares the project for future deps)
npm install

# Start the local server
npm start

# Open http://localhost:3000 in your browser
```

By default the server binds to `127.0.0.1:3000`. You can override this:

```bash
HOST=0.0.0.0 PORT=8080 npm start
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

**Verified:** the same `sk-kimi-...` key used by Claude Code's Anthropic-compatible proxy works for the usage endpoint. If your proxy key returns `Invalid Authentication`, create a dedicated platform API key from `platform.moonshot.cn`.

### Z.ai Bearer token

1. Log in to [Z.ai](https://www.z.ai/).
2. Open Developer Tools → Network tab.
3. Navigate to usage/quota pages.
4. Look for a request to `api.z.ai/api/monitor/usage/quota/limit`.
5. Copy the `Authorization: Bearer <token>` value.

## Mock mode

Toggle **Use mock data** to preview the UI without real tokens. This is useful for development and demos.

You can also open `http://localhost:3000/?mock=1` to start with mock data already loaded.

## Environment variables (optional)

You can pre-seed tokens from the environment so you do not have to paste them into the UI every session:

```bash
CLAUDE_TOKEN="your-token" KIMI_TOKEN="your-token" ZAI_TOKEN="your-token" npm start
```

These values stay in the server process memory only. They are never exposed to the client or written to disk.

## Development

The codebase is intentionally small:

- `server.js` — local Node server, static file serving, provider API proxying
- `index.html` — page structure
- `app.js` — client fetch logic and rendering
- `styles.css` — styling

Edit any file and refresh the browser. No bundler needed.

## Security / privacy notes

- Keys are sent from the browser to the local server via HTTP (localhost only).
- The server does not log request bodies.
- Keys are never persisted.
- There is no telemetry, analytics, or external calling except to the providers you configure.
- Use the **Delete keys** button at any time to clear tokens from the browser tab.

## Roadmap

- Phase 2: browser extension mode to support Grok and Google One Pro / Antigravity by inheriting live browser sessions.
- Auto-refresh, burn-rate charts, and low-quota alerts.

## Support this project

If you find this useful, you can tip USDC on Base:

- Address: `0x1e2D7F8715E8180816c0236A5c4F21596C5b9c9e`
- Click **Copy** in the app footer, or use the **Open in wallet** button for an EIP-681 deep link.

## License

MIT
