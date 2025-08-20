// src/grapheditor/pages/DiagramsList.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDiagrams } from "../services/diagramApi";

export default function DiagramsList() {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // 'unauthorized' | string | null
  const nav = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getDiagrams();
        if (!cancelled) setDiagrams(list || []);
      } catch (e) {
        if (!cancelled) setError(e?.message || "load-failed");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <div className="p-4">Загрузка…</div>;

  if (error === "unauthorized") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Диаграммы</h1>
        <div className="text-red-600 mb-2">Неавторизован</div>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => nav("/login")}
        >
          Войти
        </button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Диаграммы</h1>
        <div className="text-red-600 mb-2">Ошибка загрузки: {String(error)}</div>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => location.reload()}
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <h1 className="text-xl font-bold">Диаграммы</h1>
        <div className="ml-auto">
          <button
            className="px-3 py-1 rounded border hover:bg-gray-50"
            onClick={() => nav("/graph")}
          >
            + Новая диаграмма
          </button>
        </div>
      </div>

      {(!diagrams || diagrams.length === 0) ? (
        <div className="text-gray-500">Пока нет диаграмм</div>
      ) : (
        <ul className="space-y-2">
          {diagrams.map((d) => (
            <li
              key={d.id ?? d.uuid ?? d._id}
              className="p-2 border rounded hover:bg-gray-50 cursor-pointer flex justify-between"
              onClick={() => nav(`/graph/${encodeURIComponent(d.id ?? d.uuid ?? d._id)}`)}
              title={d.description || ""}
            >
              <span>{d.name || "Без имени"}</span>
              <span className="text-xs text-gray-500">Версия: {d.version ?? "-"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
