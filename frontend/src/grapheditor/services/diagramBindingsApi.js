// src/grapheditor/services/diagramBindingsApi.js
import { getToken } from "../../utils/auth";
const API = "/api";

function authHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  };
}

export async function createBinding(diagramId, { cell_id, object_type, object_id }) {
  const res = await fetch(`${API}/diagrams/${encodeURIComponent(diagramId)}/bindings`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({ cell_id, object_type, object_id: String(object_id) }),
  });
  if (!res.ok) {
    const err = new Error(`http-${res.status}`);
    err.code = res.status;
    err.payload = await res.text().catch(() => "");
    throw err;
  }
  return res.json();
}


export async function getBinding(diagramId, cell_id) {
  const res = await fetch(
    `${API}/diagrams/${encodeURIComponent(diagramId)}/bindings?cell_id=${encodeURIComponent(cell_id)}`,
    { headers: authHeaders(), credentials: "include" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = new Error(`http-${res.status}`);
    err.code = res.status;
    err.payload = await res.text().catch(() => "");
    throw err;
  }
  return res.json();
}

export async function deleteBinding(diagramId, cell_id) {
  const res = await fetch(
    `${API}/diagrams/${encodeURIComponent(diagramId)}/bindings?cell_id=${encodeURIComponent(cell_id)}`,
    { method: "DELETE", headers: authHeaders(), credentials: "include" }
  );
  if (res.status !== 204) {
    const err = new Error(`http-${res.status}`);
    err.code = res.status;
    err.payload = await res.text().catch(() => "");
    throw err;
  }
}
