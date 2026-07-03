/**
 * Quota Dashboard — client-side only.
 * Tokens live in memory and are sent only to the provider APIs.
 */

const PROVIDERS = [
  {
    key: "claude",
    name: "Claude Code Max",
    iconClass: "icon-claude",
    docsUrl: "https://docs.anthropic.com/",
    endpoint: "https://api.anthropic.com/api/oauth/usage",
  },
  {
    key: "kimi",
    name: "Kimi",
    iconClass: "icon-kimi",
    docsUrl: "https://platform.moonshot.cn/",
    endpoint: "https://api.kimi.com/coding/v1/usages",
  },
  {
    key: "zai",
    name: "Z.ai",
    iconClass: "icon-zai",
    docsUrl: "https://www.z.ai/",
    endpoint: "https://api.z.ai/api/monitor/usage/quota/limit",
  },
];

// Tokens are kept in memory only (not persisted).
const tokens = {
  claude: "",
  kimi: "",
  zai: "",
};

const state = {
  claude: null,
  kimi: null,
  zai: null,
};

const cardsEl = document.getElementById("cards");
const lastRefreshedEl = document.getElementById("last-refreshed");

function init() {
  bindEvents();

  // Allow ?mock=1 to load with mock data already rendered (useful for screenshots/tests).
  const params = new URLSearchParams(window.location.search);
  if (params.get("mock") === "1") {
    document.getElementById("mock-mode").checked = true;
    refreshAll();
  } else {
    renderAll();
  }
}

function bindEvents() {
  document.getElementById("save-tokens").addEventListener("click", saveTokens);
  document.getElementById("refresh-all").addEventListener("click", refreshAll);
  document.getElementById("mock-mode").addEventListener("change", () => {
    refreshAll();
  });
  document.getElementById("copy-tip-address")?.addEventListener("click", copyTipAddress);

  // Allow Enter key in token fields to save.
  document.querySelectorAll(".token-form input").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveTokens();
    });
  });
}

function copyTipAddress() {
  const fullAddress = "0x1e2D7F8715E8180816c0236A5c4F21596C5b9c9e";
  navigator.clipboard.writeText(fullAddress).then(
    () => {
      const btn = document.getElementById("copy-tip-address");
      const original = btn.textContent;
      btn.textContent = "Copied!";
      setTimeout(() => (btn.textContent = original), 1500);
    },
    () => alert("Could not copy address automatically. Address: " + fullAddress)
  );
}

function saveTokens() {
  tokens.claude = document.getElementById("claude-token").value.trim();
  tokens.kimi = document.getElementById("kimi-token").value.trim();
  tokens.zai = document.getElementById("zai-token").value.trim();
  alert("Tokens saved for this session only. They are not stored on disk.");
}

async function refreshAll() {
  lastRefreshedEl.textContent = "Refreshing…";
  setLoading(true);

  const useMock = document.getElementById("mock-mode").checked;

  await Promise.all(
    PROVIDERS.map(async (provider) => {
      try {
        state[provider.key] = useMock
          ? await fetchMock(provider)
          : await fetchProvider(provider);
      } catch (err) {
        state[provider.key] = normalizeError(err);
      }
    })
  );

  setLoading(false);
  renderAll();
  lastRefreshedEl.textContent = `Last refreshed: ${new Date().toLocaleTimeString()}`;
}

function normalizeError(err) {
  const raw = err?.message || String(err) || "Unknown error";
  let friendly = raw;
  let category = "unknown";

  if (/\b401\b|403|Unauthorized|Forbidden|Invalid Authentication/i.test(raw)) {
    friendly = "Invalid token. Double-check you are using the right key type (see README).";
    category = "auth";
  } else if (/CORS|NetworkError|Failed to fetch|TypeError/i.test(raw)) {
    friendly = "CORS or network error. Try running through a local static server instead of file://.";
    category = "network";
  } else if (/\b(404|500|502|503)\b/i.test(raw)) {
    friendly = "Provider API error. The endpoint may be down or changed.";
    category = "provider";
  }

  return {
    ok: false,
    error: friendly,
    raw,
    category,
  };
}

function setLoading(loading) {
  cardsEl.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle("loading", loading);
  });
}

// ---------- Mock data ----------

async function fetchMock(provider) {
  // Mock data returns immediately so screenshots/tests never catch an empty refreshing state.
  switch (provider.key) {
    case "claude":
      return {
        ok: true,
        used: 62,
        remaining: 38,
        resetTime: tomorrowAt(0),
        window: "7-day",
        raw: { five_hour: 34, seven_day: 62 },
      };
    case "kimi":
      return {
        ok: true,
        used: 46,
        remaining: 54,
        resetTime: new Date("2026-07-08T17:55:16.381213Z"),
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
      };
    case "zai":
      return {
        ok: true,
        used: 78,
        remaining: 22,
        resetTime: inHours(6),
        window: "Daily",
        raw: {
          data: {
            limits: [{ percentage: 78, nextResetTime: inHours(6).toISOString() }],
          },
        },
      };
    default:
      throw new Error("Unknown provider");
  }
}

// ---------- Real API calls ----------

async function fetchProvider(provider) {
  const token = tokens[provider.key];
  if (!token) {
    return { ok: false, error: "No token configured." };
  }

  switch (provider.key) {
    case "claude":
      return fetchClaude(token);
    case "kimi":
      return fetchKimi(token);
    case "zai":
      return fetchZai(token);
    default:
      throw new Error("Unknown provider");
  }
}

async function fetchClaude(token) {
  const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "anthropic-beta": "oauth-2025-04-20",
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // Documented shape: { five_hour: number, seven_day: number } utilization percentages.
  const fiveHour = Number(data.five_hour);
  const sevenDay = Number(data.seven_day);
  const hasFive = !isNaN(fiveHour);
  const hasSeven = !isNaN(sevenDay);

  let used, window;
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
    return { ok: false, error: "Unexpected response shape from Claude." };
  }

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: tomorrowAt(0),
    window,
    raw: data,
  };
}

async function fetchKimi(token) {
  const res = await fetch("https://api.kimi.com/coding/v1/usages", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // Real shape: { usage: { limit, used, remaining, resetTime }, limits: [{ window, detail: { limit, used, remaining, resetTime } }] }
  // Values are strings. We show the highest-utilization window so the user sees the tightest constraint.
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
    return { ok: false, error: "Unexpected response shape from Kimi." };
  }

  const top = windows.reduce((a, b) => (b.used / b.limit > a.used / a.limit ? b : a));
  const used = Math.round((top.used / top.limit) * 100);

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: top.resetTime ? new Date(top.resetTime) : tomorrowAt(9),
    window: top.label,
    raw: data,
  };
}

async function fetchZai(token) {
  const res = await fetch("https://api.z.ai/api/monitor/usage/quota/limit", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const data = await res.json();
  // Documented shape: { data: { limits: [{ percentage, nextResetTime, window? }] } }
  const limits = data.data?.limits || [];
  if (!limits.length) {
    return { ok: false, error: "Unexpected response shape from Z.ai." };
  }

  const top = limits.reduce((a, b) => (Number(b.percentage) > Number(a.percentage) ? b : a));
  const used = Number(top.percentage) || 0;

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: top.nextResetTime ? new Date(top.nextResetTime) : inHours(24),
    window: top.window || "Window",
    raw: data,
  };
}

// ---------- Rendering ----------

function renderAll() {
  cardsEl.innerHTML = PROVIDERS.map(renderCard).join("");
}

function renderCard(provider) {
  const s = state[provider.key];
  const loadingClass = s === null ? "loading" : "";

  if (!s) {
    return `
      <article class="card ${loadingClass}" data-provider="${provider.key}">
        ${renderHeader(provider, null)}
        <p class="last-updated">Ready to refresh</p>
      </article>
    `;
  }

  if (!s.ok) {
    const errorHtml = formatErrorMessage(s.error, s.raw);
    return `
      <article class="card" data-provider="${provider.key}">
        ${renderHeader(provider, "error")}
        <p class="error-message">${errorHtml}</p>
        <p class="last-updated"></p>
      </article>
    `;
  }

  const status = usageStatus(s.used);

  return `
    <article class="card" data-provider="${provider.key}">
      ${renderHeader(provider, status.class)}
      <div class="metrics">
        <div class="metric">
          <span class="metric-label">% used</span>
          <span class="metric-value">${s.used.toFixed(0)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">% remaining</span>
          <span class="metric-value">${s.remaining.toFixed(0)}%</span>
        </div>
        <div class="metric">
          <span class="metric-label">Resets</span>
          <span class="metric-value">${formatReset(s.resetTime)}</span>
        </div>
      </div>
      <div class="bar">
        <div class="bar-fill ${status.barClass}" style="width: ${Math.min(100, s.used)}%"></div>
      </div>
      <p class="last-updated">Window: ${escapeHtml(s.window)} · Refreshed ${new Date().toLocaleTimeString()}</p>
    </article>
  `;
}

function renderHeader(provider, statusType) {
  const statusText =
    statusType === "ok"
      ? "Healthy"
      : statusType === "warn"
      ? "Running low"
      : statusType === "error"
      ? "Error"
      : statusType === "high"
      ? "Critical"
      : "Waiting";

  return `
    <div class="card-header">
      <h2 class="card-title">
        <span class="provider-icon ${provider.iconClass}" aria-hidden="true">${provider.name[0]}</span>
        ${escapeHtml(provider.name)}
      </h2>
      <span class="status ${statusType || ""}">${statusText}</span>
    </div>
  `;
}

function usageStatus(used) {
  if (used >= 85) return { class: "error", barClass: "high" };
  if (used >= 60) return { class: "warn", barClass: "medium" };
  return { class: "ok", barClass: "low" };
}

// ---------- Helpers ----------

function tomorrowAt(hour) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hour, 0, 0, 0);
  return d;
}

function inHours(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function formatReset(date) {
  if (!date || isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatErrorMessage(friendly, raw) {
  const safeFriendly = escapeHtml(friendly);
  const safeRaw = raw && raw !== friendly ? escapeHtml(raw) : "";
  const details = safeRaw
    ? ` <details class="error-details"><summary>Details</summary><code>${safeRaw}</code></details>`
    : "";
  return `${safeFriendly}${details}`;
}

// Start.
init();
