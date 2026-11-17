import { ENDPOINTS } from "./endpoints.js?v=24";

async function get(path, filters, signal, token) {
  const url = new URL(path, window.location.origin);
  Object.entries(filters).forEach(([key, value]) => url.searchParams.set(key, value));
  const headers = { Accept: "application/json" };
  const accessToken = token.trim().replace(/^Bearer\s+/i, "");
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const routeClient = document.documentElement.dataset.dashboardClient;
  if (routeClient) headers["X-Dashboard-Client"] = routeClient;

  const response = await fetch(url, {
    method: "GET",
    headers,
    signal,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    const detail = errorBody ? ` — ${errorBody}` : "";
    throw new Error(`${path}: API respondeu HTTP ${response.status}${detail}`);
  }

  return response.json();
}

export function loadComplianceDashboard(filters, signal, token) {
  return Object.fromEntries(
    Object.entries(ENDPOINTS).map(([name, path]) => [
      name,
      get(path, filters, signal, token),
    ]),
  );
}

export function loadReservationRules(filters, signal, token) {
  return get("/compliance/rule-reserva", filters, signal, token);
}
