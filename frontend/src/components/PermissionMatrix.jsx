import { useMemo } from "react";

export default function PermissionMatrix({
  allPermissions,       // [{id, action, resource}]
  assignedPermissions,  // [{id, action, resource}] для выбранной роли
  onToggle,             // (permId, checked) => Promise<void>
}) {
  // сгруппируем по resource
  const byResource = useMemo(() => {
    const m = {};
    for (const p of allPermissions) {
      if (!m[p.resource]) m[p.resource] = {};
      m[p.resource][p.action] = p;
    }
    return m;
  }, [allPermissions]);

  // множество id уже назначенных прав
  const assigned = useMemo(() => new Set(assignedPermissions.map(p => p.id)), [assignedPermissions]);

  // фиксированный порядок действий
  const actions = ["read","create","update","delete","assign"];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="border px-3 py-2 text-left">Ресурс</th>
            {actions.map(a => (
              <th key={a} className="border px-3 py-2 text-center capitalize">{a}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Object.keys(byResource).sort().map(resource => (
            <tr key={resource} className="hover:bg-gray-50">
              <td className="border px-3 py-2 font-medium">{resource}</td>
              {actions.map(a => {
                const perm = byResource[resource][a];
                const checked = perm ? assigned.has(perm.id) : false;
                const disabled = !perm; // если такого действия нет для ресурса
                return (
                  <td key={a} className="border px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled}
                      onChange={e => perm && onToggle(perm.id, e.target.checked)}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
