/**
 * Quota Dashboard — client for the local Node server.
 *
 * Tokens are kept in browser memory only. They are sent to the local server
 * (which runs on your machine) so the server can call provider APIs and avoid
 * browser CORS restrictions. Keys never leave your machine.
 */

const PROVIDERS = [
  {
    key: "claude",
    name: "Claude Code Max",
    iconClass: "icon-claude",
    docsUrl: "https://docs.anthropic.com/",
  },
  {
    key: "kimi",
    name: "Kimi",
    iconClass: "icon-kimi",
    docsUrl: "https://platform.moonshot.cn/",
  },
  {
    key: "zai",
    name: "Z.ai",
    iconClass: "icon-zai",
    docsUrl: "https://www.z.ai/",
  },
];

// Tokens are kept in browser memory only (not persisted).
const tokens = {
  claude: "",
  kimi: "",
  zai: "",
};

// Embedded mock data lets the static/GitHub Pages preview keep working even
// when there is no local server running. The local server returns fresher
// generated mock data from `/api/mock` when available.
function fallbackMockData() {
  const now = Date.now();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return {
    claude: {
      ok: true,
      used: 62,
      remaining: 38,
      resetTime: tomorrow.toISOString(),
      window: "7-day",
      raw: { five_hour: 34, seven_day: 62 },
    },
    kimi: {
      ok: true,
      used: 46,
      remaining: 54,
      resetTime: new Date(now + 4 * 24 * 60 * 60 * 1000).toISOString(),
      window: "Weekly shared pool",
      raw: { usage: { limit: "100", used: "46", remaining: "54" } },
    },
    zai: {
      ok: true,
      used: 78,
      remaining: 22,
      resetTime: new Date(now + 6 * 60 * 60 * 1000).toISOString(),
      window: "Daily",
      raw: { data: { limits: [{ percentage: 78 }] } },
    },
  };
}

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
  document.getElementById("delete-tokens")?.addEventListener("click", deleteTokens);
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
  alert("Tokens saved for this session only. They stay in this browser tab and are not stored on disk.");
}

function deleteTokens() {
  tokens.claude = "";
  tokens.kimi = "";
  tokens.zai = "";
  document.getElementById("claude-token").value = "";
  document.getElementById("kimi-token").value = "";
  document.getElementById("zai-token").value = "";
  state.claude = null;
  state.kimi = null;
  state.zai = null;
  renderAll();
  lastRefreshedEl.textContent = "Tokens cleared";
}

async function refreshAll() {
  lastRefreshedEl.textContent = "Refreshing…";
  setLoading(true);

  const useMock = document.getElementById("mock-mode").checked;

  if (useMock) {
    let mock;
    try {
      mock = await fetchJson("/api/mock");
    } catch {
      mock = fallbackMockData();
    }
    for (const provider of PROVIDERS) {
      state[provider.key] = mock[provider.key] || normalizeError(new Error("Missing mock data"));
    }
  } else {
    await Promise.all(
      PROVIDERS.map(async (provider) => {
        try {
          state[provider.key] = await fetchProvider(provider);
        } catch (err) {
          state[provider.key] = normalizeError(err);
        }
      })
    );
  }

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
  } else if (/CORS|NetworkError|Failed to fetch|TypeError|fetch/i.test(raw)) {
    friendly = "Could not reach the local server. Make sure `npm start` is running.";
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

async function fetchProvider(provider) {
  const token = tokens[provider.key];
  if (!token) {
    return { ok: false, error: "No token configured." };
  }

  return fetchJson(`/api/${provider.key}/usage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
}

async function fetchJson(input, options) {
  const res = await fetch(input, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return data;
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
  const resetTime = s.resetTime ? new Date(s.resetTime) : null;

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
          <span class="metric-value">${formatReset(resetTime)}</span>
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
