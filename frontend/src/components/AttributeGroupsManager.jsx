import { useEffect, useMemo, useState } from "react";
import { getToken } from "../utils/auth";

/**
 * Менеджер групп атрибутов для выбранного типа объекта.
 * CRUD: список, создание, переименование/сортировка/сворачиваемость, удаление.
 *
 * Пропсы:
 * - objectTypeId: number (обязателен)
 * - className?: string
 * - onChanged?: () => void   // вызов после успешного изменения (для перезагрузки атрибутов и т.п.)
 */
export default function AttributeGroupsManager({ objectTypeId, className = "", onChanged }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDisplay, setNewDisplay] = useState("");

  const authHeaders = { Authorization: `Bearer ${getToken()}` };

  const fetchGroups = async () => {
    if (!objectTypeId) { setGroups([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/object_types/${objectTypeId}/attribute_groups`, { headers: authHeaders });
      const data = res.ok ? await res.json() : [];
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); /* eslint-disable-next-line */ }, [objectTypeId]);

  const canCreate = newName.trim() && newDisplay.trim();

  const ordered = useMemo(() => {
    return [...groups].sort((a, b) => (a.sort_order - b.sort_order) || a.id - b.id);
  }, [groups]);

  async function createGroup() {
    if (!canCreate) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/object_types/${objectTypeId}/attribute_groups`, {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), display_name: newDisplay.trim(), sort_order: 0, is_collapsible: true })
      });
      if (res.ok) {
        setNewName("");
        setNewDisplay("");
        await fetchGroups();
        onChanged?.();
      }
    } finally {
      setCreating(false);
    }
  }

  async function updateGroup(id, patch) {
    await fetch(`/api/attribute_groups/${id}`, {
      method: "PUT",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    await fetchGroups();
    onChanged?.();
  }

  async function deleteGroup(id) {
    await fetch(`/api/attribute_groups/${id}`, { method: "DELETE", headers: authHeaders });
    await fetchGroups();
    onChanged?.();
  }

  function move(id, dir) {
    // Простая перестановка sort_order: меняем местами с соседом
    const idx = ordered.findIndex(g => g.id === id);
    if (idx < 0) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= ordered.length) return;
    const a = ordered[idx];
    const b = ordered[targetIdx];
    Promise.all([
      updateGroup(a.id, { sort_order: b.sort_order }),
      updateGroup(b.id, { sort_order: a.sort_order })
    ]);
  }

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-4 md:p-5 ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Группы атрибутов</h3>
      </div>

      {/* Создание */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Тех. имя</label>
          <input
            className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-lentaBlue/20"
            placeholder="main"
            value={newName}
            onChange={e => setNewName(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase text-gray-600 mb-1">Название</label>
          <input
            className="w-full rounded-2xl border border-gray-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-lentaBlue/20"
            placeholder="Основное"
            value={newDisplay}
            onChange={e => setNewDisplay(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={createGroup}
            disabled={!canCreate || creating}
            className="inline-flex w-full md:w-auto justify-center rounded-2xl bg-lentaBlue px-4 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Добавить группу
          </button>
        </div>
      </div>

      {/* Список */}
      <div className="rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
              <th className="py-2.5 px-3 border-b border-gray-200">Название</th>
              <th className="py-2.5 px-3 border-b border-gray-200">Тех. имя</th>
              <th className="py-2.5 px-3 border-b border-gray-200">Порядок</th>
              <th className="py-2.5 px-3 border-b border-gray-200">Сворачиваемая</th>
              <th className="py-2.5 px-3 border-b border-gray-200 w-40">Действия</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="py-3 px-3 text-gray-500" colSpan={5}>Загрузка…</td></tr>
            ) : ordered.length === 0 ? (
              <tr><td className="py-3 px-3 text-gray-500" colSpan={5}>Групп пока нет</td></tr>
            ) : (
              ordered.map((g, i) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-3 border-t border-gray-100">
                    <input
                      className="w-full rounded-xl border border-transparent px-2 py-1 focus:border-lentaBlue focus:outline-none"
                      defaultValue={g.display_name}
                      onBlur={e => {
                        const v = e.target.value.trim();
                        if (v && v !== g.display_name) updateGroup(g.id, { display_name: v });
                      }}
                    />
                  </td>
                  <td className="py-2.5 px-3 border-t border-gray-100">
                    <input
                      className="w-full rounded-xl border border-transparent px-2 py-1 focus:border-lentaBlue focus:outline-none"
                      defaultValue={g.name}
                      onBlur={e => {
                        const v = e.target.value.trim();
                        if (v && v !== g.name) updateGroup(g.id, { name: v });
                      }}
                    />
                  </td>
                  <td className="py-2.5 px-3 border-t border-gray-100">
                    <div className="inline-flex gap-2">
                      <button className="rounded-xl border px-2 py-1 text-xs" onClick={() => move(g.id, "up")} disabled={i === 0}>↑</button>
                      <button className="rounded-xl border px-2 py-1 text-xs" onClick={() => move(g.id, "down")} disabled={i === ordered.length - 1}>↓</button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 border-t border-gray-100">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300 text-lentaBlue focus:ring-lentaBlue"
                        defaultChecked={g.is_collapsible}
                        onChange={e => updateGroup(g.id, { is_collapsible: e.target.checked })}
                      />
                      <span className="text-gray-700">да</span>
                    </label>
                  </td>
                  <td className="py-2.5 px-3 border-t border-gray-100">
                    <button className="rounded-xl border px-2 py-1 text-xs text-red-600 hover:bg-red-50" onClick={() => deleteGroup(g.id)}>Удалить</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
