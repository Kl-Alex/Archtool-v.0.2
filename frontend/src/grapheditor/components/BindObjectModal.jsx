// src/grapheditor/components/BindObjectModal.jsx
import { useEffect, useState } from "react";
import { getToken } from "../../utils/auth";
import { createBinding } from "../services/diagramBindingsApi";

function authHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken() || ""}`,
  };
}

/* ==================== Нормализация ответов реестра ==================== */

function normalizeItem(x) {
  if (!x || typeof x !== "object") return null;
  const id =
    x.id ??
    x.uuid ??
    x.ID ??
    x._id ??
    x?.item?.id ??
    x?.item?.uuid ??
    x?.data?.id ??
    x?.data?.uuid;
  const name =
    x.name ??
    x.title ??
    x.caption ??
    x?.item?.name ??
    x?.item?.title ??
    x?.data?.name ??
    x?.data?.title;
  if (!id) return null;
  return { id, name: name || String(id) };
}

function normalizeCollection(payload) {
  const arr = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
    ? payload.data
    : Array.isArray(payload?.rows)
    ? payload.rows
    : [];
  return arr.map(normalizeItem).filter(Boolean);
}

/* ==================== API реестра: поиск/создание ==================== */

// ПОИСК: пробуем ?q=, если не ок — ?search=
// Поиск по /api/business_capabilities (возвращает МАССИВ)
async function searchRegistry({ q }) {
  const res = await fetch(
    `/api/business_capabilities?search=${encodeURIComponent(q || "")}&limit=20`,
    {
      headers: authHeaders(),
      credentials: "include",
    }
  );

  if (res.status === 401) {
    const err = new Error("unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) throw new Error("search-failed");

  const data = await res.json(); // <-- массив [{ id, name, level, ... }, ...]
  const items = Array.isArray(data)
    ? data.map(obj => ({
        id: obj.id,
        // поддержим разные ключи имени на всякий случай
        name: obj.name || obj["Название"] || obj["Наименование"] || "(без имени)",
        raw: obj,
      }))
    : [];

  return items;
}


// СОЗДАНИЕ: ожидаем минимум {name}; под свои поля можно расширить body
async function createRegistryObject({ type, name }) {
  const path = type === "business_capability" ? "business_capabilities" : type;
  const res = await fetch(`/api/${path}`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: JSON.stringify({ name }),
  });

  if (res.status === 401) {
    const err = new Error("unauthorized");
    err.code = 401;
    throw err;
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error("create-failed");
    err.payload = txt;
    throw err;
  }

  const payload = await res.json().catch(() => ({}));
  const item =
    normalizeItem(payload) ||
    normalizeItem(payload?.item) ||
    normalizeItem(payload?.data);
  if (item?.id) return item;

  // fallback: сразу попробуем найти по имени
  const probe = await searchRegistry({ type, q: name });
  const found =
    probe.find((i) => i.name?.toLowerCase() === name.toLowerCase()) || probe[0];
  if (found) return found;

  const err = new Error("create-ok-but-empty-response");
  err.payload = payload;
  throw err;
}

/* ==================== Компонент ==================== */

export default function BindObjectModal({
  isOpen,
  onClose,
  graph,
  diagramId, // uuid строки
  selectedCell, // mxCell | null
  onBound, // cb({ cellId, object_id, object_name, type })
}) {
  const [tab, setTab] = useState("pick"); // pick | create
  const [type, setType] = useState("business_capability");
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setTab("pick");
    setQ("");
    setResults([]);
    setName("");
    setErr(null);
  }, [isOpen]);

  const runSearch = async () => {
    setLoading(true);
    setErr(null);
    try {
      const rows = await searchRegistry({ type, q });
      setResults(rows);
    } catch (e) {
      setErr(e);
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const bindToCell = async ({ object_id, object_name }) => {
    if (!graph) return;
    if (!diagramId) {
      alert("Сначала сохраните диаграмму в БД (кнопка «Сохранить в БД»), затем привязывайте объекты.");
      return;
    }

    // если нет выбранной ячейки — создаём
    let cell = selectedCell;
    if (!cell) {
      const parent = graph.getDefaultParent();
      graph.getModel().beginUpdate();
      try {
        const x = 120 + Math.round(Math.random() * 80);
        const y = 120 + Math.round(Math.random() * 80);
        cell = graph.insertVertex(
          parent,
          null,
          object_name,
          x,
          y,
          160,
          60,
          "rounded=0;whiteSpace=wrap;html=1;"
        );
      } finally {
        graph.getModel().endUpdate();
      }
    }
    if (!cell?.id) return;

    // 1) Создаём/обновляем привязку на бэке (UPSERT)
    await createBinding(diagramId, {
      cell_id: cell.id,
      object_type: type,
      object_id: String(object_id),
    });

    // 2) Пишем метаданные в XML вершины
    const { setCellBinding } = await import("../utils/mxMetadata");
    setCellBinding(graph, cell, {
      object_id: String(object_id),
      object_type: type,
      name: object_name,
    });

    // 3) Обновляем подпись
    graph.getModel().beginUpdate();
    try {
      graph.labelChanged(cell, object_name, null);
    } finally {
      graph.getModel().endUpdate();
    }

    onBound?.({ cellId: cell.id, object_id, object_name, type });
    onClose();
  };

  const onPick = async (it) => {
    setErr(null);
    try {
      await bindToCell({ object_id: it.id, object_name: it.name });
    } catch (e) {
      setErr(e);
      console.error(e);
    }
  };

  const onCreateAndBind = async () => {
    if (!name.trim()) return;
    setErr(null);
    try {
      const created = await createRegistryObject({
        type,
        name: name.trim(),
      });
      await bindToCell({
        object_id: created.id,
        object_name: created.name || name.trim(),
      });
    } catch (e) {
      setErr(e);
      console.error(e);
    }
  };

  if (!isOpen) return null;

  // отдельная подсказка, если нет diagramId
  if (isOpen && !diagramId) {
    return (
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow p-4 w-full max-w-md">
          <h2 className="text-lg font-semibold mb-2">Привязка недоступна</h2>
          <p className="text-sm text-gray-600">
            Сначала сохраните диаграмму в БД, чтобы получить её ID.
          </p>
          <div className="mt-3 text-right">
            <button className="px-3 py-1 rounded border" onClick={onClose}>
              Ок
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow p-4 w-full max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Привязать объект реестра</h2>
          <button
            className="ml-auto text-gray-500 hover:text-black"
            onClick={onClose}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-2 mb-3">
          <button
            className={`px-3 py-1 rounded border ${tab === "pick" ? "bg-gray-100" : ""}`}
            onClick={() => setTab("pick")}
          >
            Выбрать
          </button>
          <button
            className={`px-3 py-1 rounded border ${tab === "create" ? "bg-gray-100" : ""}`}
            onClick={() => setTab("create")}
          >
            Создать
          </button>

          <select
            className="ml-auto border rounded px-2 py-1"
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="business_capability">Бизнес‑способность</option>
            {/* добавь другие типы при необходимости */}
          </select>
        </div>

        {tab === "pick" ? (
          <>
            <div className="flex gap-2 mb-3">
              <input
                className="border rounded px-2 py-1 flex-1"
                placeholder="Поиск…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
              />
              <button
                className="px-3 py-1 rounded border"
                onClick={runSearch}
                disabled={loading}
              >
                {loading ? "Поиск…" : "Найти"}
              </button>
            </div>

            <ul className="max-h-64 overflow-auto divide-y">
              {results.map((it) => (
                <li key={it.id} className="py-2 flex items-center justify-between">
                  <span>{it.name}</span>
                  <button
                    className="px-2 py-1 rounded border hover:bg-gray-50"
                    onClick={() => onPick(it)}
                  >
                    Добавить
                  </button>
                </li>
              ))}
              {!loading && results.length === 0 && (
                <li className="py-2 text-gray-500">Ничего не найдено</li>
              )}
            </ul>
          </>
        ) : (
          <div className="space-y-3">
            <input
              className="border rounded px-2 py-1 w-full"
              placeholder="Название нового объекта"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="px-3 py-1 rounded border hover:bg-gray-50"
              onClick={onCreateAndBind}
            >
              Создать и привязать
            </button>
          </div>
        )}

        {err?.code === 401 && (
          <div className="mt-3 p-2 border rounded text-sm text-red-600">
            Неавторизован. <a className="underline" href="/login">Войти</a>
          </div>
        )}
        {err && err.code !== 401 && (
          <div className="mt-3 p-2 border rounded text-sm text-red-600">
            Ошибка: {String(err.message || err)}
          </div>
        )}
      </div>
    </div>
  );
}
