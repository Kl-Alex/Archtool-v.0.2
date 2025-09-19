import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

const auth = () => ({ Authorization: "Bearer " + getToken(), "Content-Type": "application/json" });

export default function UserRoleAssigner({ users, roles }) {
  const [userId, setUserId] = useState("");
  const [userRoleIds, setUserRoleIds] = useState(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setUserRoleIds(new Set()); return; }
    setLoading(true);
    fetch(`/api/users/${userId}/roles`, { headers: auth() })
      .then(r => r.ok ? r.json() : [])
      .then(data => setUserRoleIds(new Set(data.map(r => r.id))))
      .finally(() => setLoading(false));
  }, [userId]);

  const toggle = async (roleId, checked) => {
    if (!userId) return;
    const url = `/api/users/${userId}/roles${checked ? "" : `/${roleId}`}`;
    const opts = checked
      ? { method: "POST", headers: auth(), body: JSON.stringify({ role_id: roleId }) }
      : { method: "DELETE", headers: auth() };

    const res = await fetch(url, opts);
    if (res.ok) {
      const next = new Set(userRoleIds);
      checked ? next.add(roleId) : next.delete(roleId);
      setUserRoleIds(next);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Пользователь</label>
        <select value={userId} onChange={e => setUserId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
          <option value="">— Выберите —</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
        </select>
      </div>

      {userId && (
        <div className="bg-white border rounded p-4">
          <div className="text-sm font-semibold mb-2">Роли</div>
          {loading ? <div className="text-sm text-gray-500">Загрузка…</div> : (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {roles.map(r => (
                <label key={r.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userRoleIds.has(r.id)}
                    onChange={e => toggle(r.id, e.target.checked)}
                  />
                  <span>{r.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
