/**
 * Quota Dashboard — local Node server.
 *
 * Serves the static UI and proxies provider API calls so keys never leave
 * the user's machine and browser CORS restrictions are avoided.
 *
 * Keys are accepted in the request body or from environment variables, kept
 * only in memory, and are never written to disk or logs.
 */

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const url = require("url");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

const PROVIDERS = {
  claude: {
    name: "Claude Code Max",
    apiUrl: "https://api.anthropic.com/api/oauth/usage",
    envToken: process.env.CLAUDE_TOKEN,
    beta: "oauth-2025-04-20",
    adapt: adaptClaude,
  },
  kimi: {
    name: "Kimi",
    apiUrl: "https://api.kimi.com/coding/v1/usages",
    envToken: process.env.KIMI_TOKEN,
    adapt: adaptKimi,
  },
  zai: {
    name: "Z.ai",
    apiUrl: "https://api.z.ai/api/monitor/usage/quota/limit",
    envToken: process.env.ZAI_TOKEN,
    adapt: adaptZai,
  },
};

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, statusCode, message, category = "unknown") {
  sendJson(res, statusCode, { ok: false, error: message, category });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        if (!raw) return resolve({});
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

function fetchJson(apiUrl, headers) {
  return new Promise((resolve, reject) => {
    const parsed = new url.URL(apiUrl);
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      method: "GET",
      headers,
      timeout: 20000,
    };

    const req = https.request(options, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf-8");
        let data;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          data = { __raw: raw };
        }
        resolve({ status: res.statusCode, data, raw });
      });
    });

    req.on("error", reject);
    req.on("timeout", () => reject(new Error("Request timed out")));
    req.end();
  });
}

function categorizeError(status, raw) {
  const text = `${status} ${raw || ""}`;
  if (/\b401\b|403|Unauthorized|Forbidden|Invalid Authentication/i.test(text)) {
    return {
      friendly: "Invalid token. Double-check you are using the right key type (see README).",
      category: "auth",
    };
  }
  if (/\b(404|500|502|503)\b/i.test(text)) {
    return { friendly: "Provider API error. The endpoint may be down or changed.", category: "provider" };
  }
  return { friendly: `Provider returned HTTP ${status}.`, category: "provider" };
}

function adaptClaude(data) {
  const fiveHour = Number(data.five_hour);
  const sevenDay = Number(data.seven_day);
  const hasFive = !isNaN(fiveHour);
  const hasSeven = !isNaN(sevenDay);

  let used;
  let window;
  if (hasFive && hasSeven) {
    used = Math.max(fiveHour, sevenDay);
    window = used === fiveHour ? "5-hour" : "7-day";
  } else if (hasSeven) {
    used = sevenDay;
    window = "7-day";
  } else if (hasFive) {
    used = fiveHour;
    window = "5-hour";
  } else {
    throw new Error("Unexpected response shape from Claude.");
  }

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: tomorrowAt(0).toISOString(),
    window,
    raw: data,
  };
}

function adaptKimi(data) {
  const windows = [];
  const weekly = data.usage || {};
  if (weekly.limit != null && weekly.used != null) {
    windows.push({
      label: "Weekly shared pool",
      used: Number(weekly.used),
      limit: Number(weekly.limit),
      resetTime: weekly.resetTime,
    });
  }

  for (const l of data.limits || []) {
    const detail = l.detail || {};
    if (detail.limit != null && detail.used != null) {
      const unit = (l.window?.timeUnit || "").replace("TIME_UNIT_", "").toLowerCase();
      const duration = l.window?.duration || "?";
      windows.push({
        label: `${duration}-${unit} rolling`,
        used: Number(detail.used),
        limit: Number(detail.limit),
        resetTime: detail.resetTime,
      });
    }
  }

  if (!windows.length) {
    throw new Error("Unexpected response shape from Kimi.");
  }

  const top = windows.reduce((a, b) => (b.used / b.limit > a.used / a.limit ? b : a));
  const used = Math.round((top.used / top.limit) * 100);

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: top.resetTime ? new Date(top.resetTime).toISOString() : tomorrowAt(9).toISOString(),
    window: top.label,
    raw: data,
  };
}

function adaptZai(data) {
  const limits = data.data?.limits || [];
  if (!limits.length) {
    throw new Error("Unexpected response shape from Z.ai.");
  }

  const top = limits.reduce((a, b) => (Number(b.percentage) > Number(a.percentage) ? b : a));
  const used = Number(top.percentage) || 0;

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: top.nextResetTime ? new Date(top.nextResetTime).toISOString() : inHours(24).toISOString(),
    window: top.window || "Window",
    raw: data,
  };
}

function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function inHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function handleProvider(req, res, providerKey) {
  const provider = PROVIDERS[providerKey];
  if (!provider) {
    return sendError(res, 404, "Unknown provider.");
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch {
    return sendError(res, 400, "Invalid JSON body.");
  }

  const token = body.token || provider.envToken;
  if (!token) {
    return sendError(res, 400, "No token configured.", "auth");
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
  if (provider.beta) {
    headers["anthropic-beta"] = provider.beta;
  }

  let response;
  try {
    response = await fetchJson(provider.apiUrl, headers);
  } catch (err) {
    return sendJson(res, 200, {
      ok: false,
      error: "Network error reaching provider API.",
      raw: err.message,
      category: "network",
    });
  }

  if (response.status < 200 || response.status >= 300) {
    const { friendly, category } = categorizeError(response.status, response.raw);
    return sendJson(res, 200, {
      ok: false,
      error: friendly,
      raw: response.raw,
      category,
    });
  }

  try {
    const adapted =
      providerKey === "claude"
        ? adaptClaude(response.data)
        : providerKey === "kimi"
        ? adaptKimi(response.data)
        : adaptZai(response.data);
    sendJson(res, 200, adapted);
  } catch (err) {
    sendJson(res, 200, {
      ok: false,
      error: err.message,
      raw: response.data,
      category: "provider",
    });
  }
}

function mockData() {
  return {
    claude: {
      ok: true,
      used: 62,
      remaining: 38,
      resetTime: tomorrowAt(0).toISOString(),
      window: "7-day",
      raw: { five_hour: 34, seven_day: 62 },
    },
    kimi: {
      ok: true,
      used: 46,
      remaining: 54,
      resetTime: new Date("2026-07-08T17:55:16.381213Z").toISOString(),
      window: "Weekly shared pool",
      raw: {
        usage: { limit: "100", used: "46", remaining: "54", resetTime: "2026-07-08T17:55:16.381213Z" },
        limits: [
          {
            window: { duration: 300, timeUnit: "TIME_UNIT_MINUTE" },
            detail: { limit: "100", used: "19", remaining: "81", resetTime: "2026-07-03T10:55:16.381213Z" },
          },
        ],
      },
    },
    zai: {
      ok: true,
      used: 78,
      remaining: 22,
      resetTime: inHours(6).toISOString(),
      window: "Daily",
      raw: {
        data: {
          limits: [{ percentage: 78, nextResetTime: inHours(6).toISOString() }],
        },
      },
    },
  };
}

function serveStatic(req, res, filePath) {
  const resolved = path.resolve(filePath);
  const root = path.resolve(__dirname);
  if (!resolved.startsWith(root)) {
    return sendError(res, 403, "Forbidden.");
  }

  fs.stat(resolved, (err, stats) => {
    if (err || !stats.isFile()) {
      return sendError(res, 404, "Not found.");
    }

    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(resolved).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // API routes.
  if (pathname === "/api/claude/usage" && req.method === "POST") {
    return handleProvider(req, res, "claude");
  }
  if (pathname === "/api/kimi/usage" && req.method === "POST") {
    return handleProvider(req, res, "kimi");
  }
  if (pathname === "/api/zai/usage" && req.method === "POST") {
    return handleProvider(req, res, "zai");
  }
  if (pathname === "/api/mock" && req.method === "GET") {
    return sendJson(res, 200, mockData());
  }

  // Static files.
  let filePath;
  if (pathname === "/" || pathname === "/index.html") {
    filePath = path.join(__dirname, "index.html");
  } else {
    filePath = path.join(__dirname, pathname);
  }
  serveStatic(req, res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log(`Quota Dashboard server running at http://${HOST}:${PORT}`);
  console.log("Press Ctrl+C to stop.");
});

module.exports = { server, adaptClaude, adaptKimi, adaptZai };
