import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import Notification from "../components/Notification";

export default function AdminPage() {
  const [tab, setTab] = useState("roles");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);
  const [attributes, setAttributes] = useState([]);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [selectedObjectType, setSelectedObjectType] = useState("");

  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrDisplayName, setNewAttrDisplayName] = useState("");
  const [newAttrType, setNewAttrType] = useState("string");
  const [newAttrIsRequired, setNewAttrIsRequired] = useState(false);

  const [rolePermissions, setRolePermissions] = useState([]);
  const [notification, setNotification] = useState(null);
  const [actionLogs, setActionLogs] = useState([]);


  const [newAttrIsMultiple, setNewAttrIsMultiple] = useState(false);
const [newAttrOptionsText, setNewAttrOptionsText] = useState("");

  const getAuthHeaders = () => ({
    Authorization: "Bearer " + getToken(),
  });

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, rolesRes, permsRes, typesRes] = await Promise.all([
        fetch("/api/users", { headers: getAuthHeaders() }),
        fetch("/api/roles", { headers: getAuthHeaders() }),
        fetch("/api/permissions", { headers: getAuthHeaders() }),
        fetch("/api/object_types", { headers: getAuthHeaders() }),
      ]);

      if (usersRes.ok) setUsers(await usersRes.json());
      if (rolesRes.ok) setRoles(await rolesRes.json());
      if (permsRes.ok) setPermissions(await permsRes.json());
      if (typesRes.ok) setObjectTypes(await typesRes.json());
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (selectedObjectType) {
      fetchAttributesForObjectType(selectedObjectType);
    } else {
      setAttributes([]);
    }
  }, [selectedObjectType]);

  useEffect(() => {
    if (tab === "logs") {
      fetch("/api/action_logs", { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(setActionLogs)
        .catch(() => setActionLogs([]));
    }
  }, [tab]);


  const fetchAttributesForObjectType = async (objectTypeId) => {
    const res = await fetch(`/api/object_types/${objectTypeId}/attributes`, { headers: getAuthHeaders() });
    setAttributes(res.ok ? await res.json() : []);
  };

  const deleteAttribute = async (attributeId) => {
    const res = await fetch(`/api/attributes/${attributeId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      setNotification({ type: "success", message: "✅ Атрибут удалён" });
      fetchAttributesForObjectType(selectedObjectType);
    } else {
      setNotification({ type: "error", message: "❌ Ошибка при удалении атрибута" });
    }
  };

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    const res = await fetch(`/api/users/${selectedUser}/roles`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ role_id: parseInt(selectedRole) }),
    });

    setNotification({
      type: res.ok ? "success" : "error",
      message: res.ok ? "✅ Роль успешно назначена" : "❌ Ошибка при назначении роли",
    });
  };

  const assignPermission = async () => {
    if (!selectedRole || !selectedPermission) return;

    const res = await fetch(`/api/roles/${selectedRole}/permissions`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ permission_id: parseInt(selectedPermission) }),
    });

    if (res.ok) {
      setNotification({ type: "success", message: "✅ Права назначены роли" });
      await handleSelectRoleForPermissions(selectedRole);
    } else {
      setNotification({ type: "error", message: "❌ Ошибка при назначении прав" });
    }
  };

  const handleSelectRoleForPermissions = async (roleId) => {
    setSelectedRole(roleId);
    if (!roleId) return setRolePermissions([]);

    const res = await fetch(`/api/roles/${roleId}/permissions`, { headers: getAuthHeaders() });
    setRolePermissions(res.ok ? await res.json() : []);
  };

  const removePermissionFromRole = async (permissionId) => {
    const res = await fetch(`/api/roles/${selectedRole}/permissions/${permissionId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (res.ok) {
      setNotification({ type: "success", message: "✅ Право удалено" });
      await handleSelectRoleForPermissions(selectedRole);
    } else {
      setNotification({ type: "error", message: "❌ Ошибка удаления права" });
    }
  };

  const addAttribute = async () => {
    if (!selectedObjectType || !newAttrName || !newAttrDisplayName || !newAttrType) {
      setNotification({ type: "error", message: "❌ Заполните все поля" });
      return;
    }

const optionsArray = newAttrOptionsText
  .split("\n")
  .map((opt) => opt.trim())
  .filter((opt) => opt.length > 0);

const payload = {
  name: newAttrName,
  display_name: newAttrDisplayName,
  type: newAttrType,
  is_required: newAttrIsRequired,
  is_multiple: newAttrIsMultiple,
  options: optionsArray,
};

    const res = await fetch(`/api/object_types/${selectedObjectType}/attributes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setNotification({ type: "success", message: "✅ Атрибут успешно добавлен" });
      setNewAttrName("");
      setNewAttrDisplayName("");
      setNewAttrType("string");
      setNewAttrIsRequired(false);
      fetchAttributesForObjectType(selectedObjectType);
      setNewAttrIsMultiple(false);
setNewAttrOptionsText("");

    } else {
      setNotification({ type: "error", message: "❌ Ошибка при добавлении атрибута" });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="p-6 flex-1 text-lentaBlue">
        <h1 className="text-2xl font-bold mb-6">Админ-панель</h1>

        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded-t ${tab === "roles" ? "bg-lentaWhite border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-lentaWhite"}`} onClick={() => setTab("roles")}>Назначение ролей</button>
          <button className={`px-4 py-2 rounded-t ${tab === "permissions" ? "bg-lentaWhite border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-lentaWhite"}`} onClick={() => setTab("permissions")}>Права ролей</button>
          <button className={`px-4 py-2 rounded-t ${tab === "attributes" ? "bg-lentaWhite border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-lentaWhite"}`} onClick={() => setTab("attributes")}>Атрибуты объектов</button>
          <button className={`px-4 py-2 rounded-t ${tab === "logs" ? "bg-lentaWhite border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-lentaWhite"}`} onClick={() => setTab("logs")}>Логи действий</button>

        </div>

        <div className="bg-lentaWhite p-4 border rounded shadow">
          {tab === "roles" && (
            <div className="flex gap-4 items-start">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="border p-2 rounded">
                <option value="">Выберите пользователя</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.username}</option>
                ))}
              </select>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="border p-2 rounded">
                <option value="">Выберите роль</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <button onClick={assignRole} className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700">Назначить</button>
            </div>
          )}

          {tab === "permissions" && (
            <div className="flex flex-col gap-4 items-start">
              <select value={selectedRole} onChange={(e) => handleSelectRoleForPermissions(e.target.value)} className="border p-2 rounded">
                <option value="">Выберите роль</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
              <select value={selectedPermission} onChange={(e) => setSelectedPermission(e.target.value)} className="border p-2 rounded">
                <option value="">Выберите право</option>
                {permissions.map(perm => (
                  <option key={perm.id} value={perm.id}>{perm.action} {perm.resource}</option>
                ))}
              </select>
              <button onClick={assignPermission} className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700">Назначить право</button>
              {rolePermissions.length > 0 && (
                <ul className="mt-4 space-y-1 text-sm">
                  {rolePermissions.map((perm) => (
                    <li key={perm.id} className="flex justify-between items-center">
                      <span>{perm.action} {perm.resource}</span>
                      <button onClick={() => removePermissionFromRole(perm.id)} className="text-red-600 hover:underline text-xs">удалить</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {tab === "attributes" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <select value={selectedObjectType} onChange={(e) => setSelectedObjectType(e.target.value)} className="border p-2 rounded min-w-[200px]">
                  <option value="">Выберите тип объекта</option>
                  {objectTypes.map((ot) => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                </select>

                <input type="text" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} placeholder="Техническое имя атрибута" className="border p-2 rounded" />

                <input type="text" value={newAttrDisplayName} onChange={(e) => setNewAttrDisplayName(e.target.value)} placeholder="Человеко-читаемое название" className="border p-2 rounded" />

                <select value={newAttrType} onChange={(e) => setNewAttrType(e.target.value)} className="border p-2 rounded">
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                  <option value="select">select</option>
                </select>


{newAttrType === "select" && (
  <div className="flex flex-col gap-2">
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={newAttrIsMultiple}
        onChange={(e) => setNewAttrIsMultiple(e.target.checked)}
      />
      Множественный выбор
    </label>

    <textarea
      placeholder="Опции (по одной в строке)"
      value={newAttrOptionsText}
      onChange={(e) => setNewAttrOptionsText(e.target.value)}
      className="border p-2 rounded"
    />
  </div>
)}

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAttrIsRequired} onChange={(e) => setNewAttrIsRequired(e.target.checked)} /> Обязательный
                </label>
              </div>

              <button className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700" onClick={addAttribute}>
                Добавить атрибут
              </button>

              {attributes.length > 0 && (
                <div className="mt-6 text-sm">
                  <h2 className="font-semibold mb-2">Атрибуты:</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    {attributes.map(attr => (
                      <li key={attr.id} className="flex justify-between items-center">
                        <span>{attr.display_name} ({attr.type})</span>
                        <button onClick={() => deleteAttribute(attr.id)} className="text-red-500 hover:underline text-xs ml-4">удалить</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

{tab === "logs" && (
  <div className="text-sm">
    <h2 className="font-semibold mb-2">Последние действия пользователей:</h2>
    <table className="table-auto w-full border-collapse border border-gray-200">
      <thead>
        <tr className="bg-gray-100">
          <th className="border px-2 py-1">Пользователь</th>
          <th className="border px-2 py-1">Действие</th>
          <th className="border px-2 py-1">Объект</th>
          <th className="border px-2 py-1">ID объекта</th>
          <th className="border px-2 py-1">Было</th>
          <th className="border px-2 py-1">Стало</th>
          <th className="border px-2 py-1">Время</th>
          <th className="border px-2 py-1">Подробности</th>

        </tr>
      </thead>
      <tbody>
        {actionLogs.map(log => (
          <tr key={log.id} className="hover:bg-gray-50">
            <td className="border px-2 py-1">{log.username || "—"}</td>
            <td className="border px-2 py-1">{log.action}</td>
            <td className="border px-2 py-1">{log.entity}</td>
            <td className="border px-2 py-1">{log.entity_id}</td>
            <td className="border px-2 py-1 text-red-600">{log.old_value || "—"}</td>
            <td className="border px-2 py-1 text-green-600">{log.new_value || "—"}</td>
            <td className="border px-2 py-1">{new Date(log.timestamp).toLocaleString()}</td>
            <td className="border px-2 py-1">{log.details || "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)}



          {notification && (
            <Notification
              type={notification.type}
              message={notification.message}
              onClose={() => setNotification(null)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
