import { useEffect, useMemo, useState } from "react";
import { listDiagrams, deleteDiagram, createDiagram } from "../services/diagramApi";
import { useNavigate } from "react-router-dom";

export default function DiagramsPage() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRegistry, setNewRegistry] = useState("business_capabilities");
  const [error, setError] = useState("");

  const page = Math.floor(offset / limit) + 1;
  const pages = Math.max(1, Math.ceil(total / limit));

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await listDiagrams({ q, limit, offset });
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, limit, offset]);

  async function onDelete(id) {
    if (!confirm("Удалить диаграмму?")) return;
    try {
      await deleteDiagram(id);
      // перезагружаем текущую страницу
      load();
    } catch (e) {
      alert("Ошибка удаления: " + (e.message || e));
    }
  }

  async function onCreate() {
    if (!newName.trim()) {
      alert("Укажите имя");
      return;
    }
    setCreating(true);
    try {
      // создаём пустую диаграмму (пустой XML)
      const xml = `<mxGraphModel><root><mxCell id="0"/><mxCell id="1" parent="0"/></root></mxGraphModel>`;
      const d = await createDiagram({ name: newName.trim(), registryType: newRegistry, xml });
      nav(`/graph/${encodeURIComponent(d.id)}`);
    } catch (e) {
      alert("Ошибка создания: " + (e.message || e));
    } finally {
      setCreating(false);
    }
  }

  function prevPage() {
    setOffset(Math.max(0, offset - limit));
  }
  function nextPage() {
    const next = offset + limit;
    if (next < total) setOffset(next);
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      <div className="p-3 border-b flex items-center gap-2">
        <h1 className="text-xl font-semibold">Диаграммы</h1>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => { setOffset(0); setQ(e.target.value); }}
            placeholder="Поиск по имени..."
            className="border rounded px-3 py-1"
          />
          <select
            value={limit}
            onChange={(e) => { setOffset(0); setLimit(parseInt(e.target.value, 10)); }}
            className="border rounded px-2 py-1"
          >
            {[10, 20, 50, 100].map(n => <option key={n} value={n}>{n}/стр</option>)}
          </select>
        </div>
      </div>

      {/* Создание */}
      <div className="p-3 border-b flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Имя новой диаграммы"
          className="border rounded px-3 py-1 w-80"
        />
        <select
          value={newRegistry}
          onChange={(e) => setNewRegistry(e.target.value)}
          className="border rounded px-2 py-1"
        >
          <option value="business_capabilities">Бизнес-способности</option>
          <option value="applications">Приложения</option>
        </select>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={onCreate}
          disabled={creating}
        >
          {creating ? "Создание..." : "Создать диаграмму"}
        </button>
      </div>

      {/* Список */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 text-gray-500">Загрузка…</div>
        ) : error ? (
          <div className="p-4 text-red-600">Ошибка: {error}</div>
        ) : (
          <table className="min-w-full border-t">
            <thead className="bg-gray-50 text-left text-sm">
              <tr>
                <th className="px-3 py-2 border-b">Имя</th>
                <th className="px-3 py-2 border-b">Реестр</th>
                <th className="px-3 py-2 border-b">Версия</th>
                <th className="px-3 py-2 border-b">Обновлено</th>
                <th className="px-3 py-2 border-b w-40"></th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {items.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 border-b">{d.name}</td>
                  <td className="px-3 py-2 border-b">{d.registry_type || "—"}</td>
                  <td className="px-3 py-2 border-b">{d.version}</td>
                  <td className="px-3 py-2 border-b">
                    {d.updated_at ? new Date(d.updated_at).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 border-b">
                    <div className="flex gap-2">
                      <button
                        className="px-2 py-1 rounded border hover:bg-gray-50"
                        onClick={() => nav(`/graph/${encodeURIComponent(d.id)}`)}
                      >
                        Открыть
                      </button>
                      <button
                        className="px-2 py-1 rounded border hover:bg-red-50 text-red-600 border-red-300"
                        onClick={() => onDelete(d.id)}
                      >
                        Удалить
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td className="px-3 py-4 text-gray-500" colSpan={5}>Нет диаграмм</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Пагинация */}
      <div className="p-3 border-t flex items-center gap-2">
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={prevPage}
          disabled={offset === 0}
        >
          ← Назад
        </button>
        <div className="text-sm text-gray-600">
          Стр. {page} / {pages} &nbsp;·&nbsp; всего {total}
        </div>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={nextPage}
          disabled={offset + limit >= total}
        >
          Вперёд →
        </button>
        <div className="ml-auto">
          <button
            className="px-3 py-1 rounded border hover:bg-gray-50"
            onClick={() => nav("/graph")}
          >
            Открыть пустой редактор
          </button>
        </div>
      </div>
    </div>
  );
}
