// ──────── Token storage ────────
const TOKEN_KEY = "remed_token";
const USER_KEY = "remed_user";

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  get user() {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },
  save(token, user) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

// ──────── API base URL ────────
// En dev : le proxy Vite redirige /api → localhost:3001
// En prod : VITE_API_URL pointe vers le backend (Render/Railway)
const BASE = import.meta.env.VITE_API_URL || "";

// ──────── Fetch wrapper ────────
export async function api(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401) {
    auth.clear();
    window.location.href = "/";
    throw new Error("Session expirée.");
  }

  if (!res.ok) {
    const err = new Error(data.error || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

// ──────── Helpers ────────
export const euros = (cents) =>
  (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export function daysToExpiry(dateStr) {
  return Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
}
