import { getToken } from "@/utils/auth";
const API_BASE = "/api";

const HEADERS_JSON = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

export async function listDiagrams({ q = "", limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("limit", String(limit));
  params.set("offset", String(offset));

  const res = await fetch(`/api/diagrams?${params.toString()}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Не удалось получить список диаграмм");
  return res.json(); // { items: [...], total: N }
}

export async function getDiagram(id) {
  const res = await fetch(`/api/diagrams/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Не удалось загрузить диаграмму");
  return res.json(); // {id, name, registry_type, xml, version, ...}
}

export async function createDiagram({ name, registryType, xml }) {
  const res = await fetch("/api/diagrams", {
    method: "POST",
    headers: HEADERS_JSON(),
    body: JSON.stringify({ name, registry_type: registryType, xml }),
  });
  if (!res.ok) throw new Error("Не удалось создать диаграмму");
  return res.json(); // {id, ...}
}

export async function updateDiagram(id, { name, xml, expectedVersion }) {
  const headers = HEADERS_JSON();
  if (expectedVersion != null) headers["If-Match"] = String(expectedVersion);

  const res = await fetch(`/api/diagrams/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ name, xml }),
  });

  if (res.status === 409) {
    throw new Error("version-conflict");
  }
  if (!res.ok) throw new Error("Не удалось обновить диаграмму");
  return res.json(); // {id, version, ...}
}

export async function deleteDiagram(id) {
  const res = await fetch(`/api/diagrams/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (res.status === 204) return true;
  if (res.status === 404) return false;
  if (!res.ok) throw new Error("Не удалось удалить диаграмму");
  return true;
}

export async function getDiagrams() {
  const res = await fetch(`${API_BASE}/diagrams`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${getToken() || ""}`,
    },
    credentials: "include",
  });

  if (res.status === 401) {
    const err = new Error("unauthorized");
    err.payload = await res.text().catch(() => "");
    throw err;
  }

  if (!res.ok) {
    const err = new Error(`http-${res.status}`);
    err.payload = await res.text().catch(() => "");
    throw err;
  }

  const data = await res.json().catch(() => null);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.rows)) return data.rows;
  return [];
}