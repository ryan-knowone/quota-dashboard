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

  // Allow Enter key in token fields to save.
  document.querySelectorAll(".token-form input").forEach((input) => {
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveTokens();
    });
  });
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
        state[provider.key] = {
          ok: false,
          error: err.message || "Unknown error",
        };
      }
    })
  );

  setLoading(false);
  renderAll();
  lastRefreshedEl.textContent = `Last refreshed: ${new Date().toLocaleTimeString()}`;
}

function setLoading(loading) {
  cardsEl.querySelectorAll(".card").forEach((card) => {
    card.classList.toggle("loading", loading);
  });
}

// ---------- Mock data ----------

async function fetchMock(provider) {
  // Simulate network delay so the UI feels realistic.
  await delay(300 + Math.random() * 400);

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
        used: 45,
        remaining: 55,
        resetTime: tomorrowAt(9),
        window: "Weekly",
        raw: { usage: 450, limits: [{ limit: 1000, used: 450, window: "weekly" }] },
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
  const used = typeof data.seven_day === "number" ? data.seven_day : data.five_hour;
  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: tomorrowAt(0),
    window: "7-day",
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
  // Documented shape: { usage: number, limits: [{ limit, used, window }] }
  const limit = data.limits?.[0];
  const used = limit
    ? Math.round((limit.used / limit.limit) * 100)
    : Math.min(100, data.usage || 0);

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime: tomorrowAt(9),
    window: limit?.window || "Weekly",
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
  // Documented shape: { data: { limits: [{ percentage, nextResetTime }] } }
  const limit = data.data?.limits?.[0];
  const used = typeof limit?.percentage === "number" ? limit.percentage : 0;
  const resetTime = limit?.nextResetTime
    ? new Date(limit.nextResetTime)
    : inHours(24);

  return {
    ok: true,
    used,
    remaining: 100 - used,
    resetTime,
    window: "Window",
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
    return `
      <article class="card" data-provider="${provider.key}">
        ${renderHeader(provider, "error")}
        <p class="error-message">${escapeHtml(s.error)}</p>
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
  if (used >= 85) return { class: "high", barClass: "high" };
  if (used >= 60) return { class: "warn", barClass: "medium" };
  return { class: "ok", barClass: "low" };
}

// ---------- Helpers ----------

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// Start.
init();
