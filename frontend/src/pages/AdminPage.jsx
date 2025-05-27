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

  const headers = { Authorization: "Bearer " + getToken() };

  useEffect(() => {
    const fetchData = async () => {
      const [usersRes, rolesRes, permsRes, typesRes] = await Promise.all([
        fetch("/api/users", { headers }),
        fetch("/api/roles", { headers }),
        fetch("/api/permissions", { headers }),
        fetch("/api/object_types", { headers }),
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

  const fetchAttributesForObjectType = async (objectTypeId) => {
    const res = await fetch(`/api/object_types/${objectTypeId}/attributes`, { headers });
    setAttributes(res.ok ? await res.json() : []);
  };

  const deleteAttribute = async (attributeId) => {
    const res = await fetch(`/api/attributes/${attributeId}`, {
      method: "DELETE",
      headers,
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
        ...headers,
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
        ...headers,
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

    const res = await fetch(`/api/roles/${roleId}/permissions`, { headers });
    setRolePermissions(res.ok ? await res.json() : []);
  };

  const removePermissionFromRole = async (permissionId) => {
    const res = await fetch(`/api/roles/${selectedRole}/permissions/${permissionId}`, {
      method: "DELETE",
      headers,
    });

    if (res.ok) {
      setNotification({ type: "success", message: "✅ Право удалено" });
      await handleSelectRoleForPermissions(selectedRole);
    } else {
      setNotification({ type: "error", message: "❌ Ошибка удаления права" });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="p-6 flex-1 text-lentaBlue">
        <h1 className="text-2xl font-bold mb-6">Админ-панель</h1>

        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded-t ${tab === "roles" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("roles")}>Назначение ролей</button>
          <button className={`px-4 py-2 rounded-t ${tab === "permissions" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("permissions")}>Права ролей</button>
          <button className={`px-4 py-2 rounded-t ${tab === "attributes" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("attributes")}>Атрибуты объектов</button>
        </div>

        <div className="bg-white p-4 border rounded shadow">
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
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAttrIsRequired} onChange={(e) => setNewAttrIsRequired(e.target.checked)} /> Обязательный
                </label>
              </div>

              <button className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700" onClick={async () => {
                if (!selectedObjectType || !newAttrName || !newAttrDisplayName || !newAttrType) {
                  setNotification({ type: "error", message: "❌ Заполните все поля" });
                  return;
                }

                const payload = {
                  name: newAttrName,
                  display_name: newAttrDisplayName,
                  type: newAttrType,
                  is_required: newAttrIsRequired
                };

                const res = await fetch(`/api/object_types/${selectedObjectType}/attributes`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: "Bearer " + getToken()
                  },
                  body: JSON.stringify(payload)
                });

                if (res.ok) {
                  setNotification({ type: "success", message: "✅ Атрибут успешно добавлен" });
                  setNewAttrName("");
                  setNewAttrDisplayName("");
                  setNewAttrType("string");
                  setNewAttrIsRequired(false);
                  fetchAttributesForObjectType(selectedObjectType);
                } else {
                  setNotification({ type: "error", message: "❌ Ошибка при добавлении атрибута" });
                }
              }}>Добавить атрибут</button>

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
