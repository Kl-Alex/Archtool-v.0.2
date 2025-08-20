import { getToken } from "@/utils/auth";

export async function fetchRegistries() {
  const res = await fetch("/api/registries", {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Не удалось получить список реестров");
  return res.json();
}

export async function searchRegistryItems(typeKey, q = "", limit = 100) {
  const params = new URLSearchParams({ q, limit: String(limit) });
  const res = await fetch(`/api/registries/${encodeURIComponent(typeKey)}?${params}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error("Не удалось получить элементы реестра");
  return res.json();
}
