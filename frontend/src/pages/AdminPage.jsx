import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";

export default function AdminPage() {
  const [tab, setTab] = useState("roles");

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);

  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedPermission, setSelectedPermission] = useState("");
  const [selectedObjectType, setSelectedObjectType] = useState("");

  const [newAttrName, setNewAttrName] = useState("");
  const [newAttrType, setNewAttrType] = useState("string");
  const [newAttrIsRequired, setNewAttrIsRequired] = useState(false);
  const [newAttrOptions, setNewAttrOptions] = useState("");
  const [newAttrRefObjectType, setNewAttrRefObjectType] = useState("");

  const [rolePermissions, setRolePermissions] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const headers = { Authorization: "Bearer " + getToken() };

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

  const assignRole = async () => {
    if (!selectedUser || !selectedRole) return;

    const res = await fetch(`/api/users/${selectedUser}/roles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ role_id: parseInt(selectedRole) }),
    });

    setMessage(res.ok ? "✅ Роль успешно назначена" : "❌ Ошибка при назначении роли");
  };

  const assignPermission = async () => {
    if (!selectedRole || !selectedPermission) return;

    const res = await fetch(`/api/roles/${selectedRole}/permissions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + getToken(),
      },
      body: JSON.stringify({ permission_id: parseInt(selectedPermission) }),
    });

    if (res.ok) {
      setMessage("✅ Права назначены роли");
      await handleSelectRoleForPermissions(selectedRole);
    } else {
      setMessage("❌ Ошибка при назначении прав");
    }
  };

  const handleSelectRoleForPermissions = async (roleId) => {
    setSelectedRole(roleId);
    if (!roleId) {
      setRolePermissions([]);
      return;
    }

    const res = await fetch(`/api/roles/${roleId}/permissions`, {
      headers: { Authorization: "Bearer " + getToken() },
    });

    if (res.ok) {
      setRolePermissions(await res.json());
    } else {
      setRolePermissions([]);
    }
  };

  const removePermissionFromRole = async (permissionId) => {
    const res = await fetch(`/api/roles/${selectedRole}/permissions/${permissionId}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + getToken() },
    });

    if (res.ok) {
      setMessage("✅ Право удалено");
      await handleSelectRoleForPermissions(selectedRole);
    } else {
      setMessage("❌ Ошибка удаления права");
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="p-6 flex-1 text-lentaBlue">
        <h1 className="text-2xl font-bold mb-6">Админ-панель</h1>

        <div className="flex gap-4 mb-6">
          <button className={`px-4 py-2 rounded-t ${tab === "roles" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("roles")}>Назначение ролей</button>
          <button className={`px-4 py-2 rounded-t ${tab === "permissions" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("permissions")}>Назначение прав ролям</button>
          <button className={`px-4 py-2 rounded-t ${tab === "attributes" ? "bg-white border-t-2 border-x-2 border-lentaBlue font-bold" : "bg-gray-100"}`} onClick={() => setTab("attributes")}>Атрибуты объектов</button>
        </div>

        <div className="bg-white p-4 border rounded shadow">
          {tab === "roles" && (
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="border p-2 rounded min-w-[200px]">
                <option value="">Выберите пользователя</option>
                {users.map((user) => <option key={user.id} value={user.id}>{user.username}</option>)}
              </select>
              <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)} className="border p-2 rounded min-w-[200px]">
                <option value="">Выберите роль</option>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <button className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700" onClick={assignRole}>Назначить роль</button>
            </div>
          )}

          {tab === "permissions" && (
            <>
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <select value={selectedRole} onChange={(e) => handleSelectRoleForPermissions(e.target.value)} className="border p-2 rounded min-w-[200px]">
                  <option value="">Выберите роль</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
                <select value={selectedPermission} onChange={(e) => setSelectedPermission(e.target.value)} className="border p-2 rounded min-w-[200px]">
                  <option value="">Выберите permission</option>
                  {permissions.map((perm) => <option key={perm.id} value={perm.id}>{perm.action} + {perm.resource}</option>)}
                </select>
                <button className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700" onClick={assignPermission}>Назначить permission</button>
              </div>
              {rolePermissions.length > 0 && (
                <div className="mt-6 text-sm">
                  <h2 className="font-semibold mb-2">Текущие разрешения:</h2>
                  <ul className="list-disc pl-5 space-y-1">
                    {rolePermissions.map((perm) => (
                      <li key={perm.id} className="flex justify-between items-center">
                        <span>{perm.action}</span>
                        <button onClick={() => removePermissionFromRole(perm.id)} className="text-red-500 hover:underline text-xs ml-4">удалить</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {tab === "attributes" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start">
                <select value={selectedObjectType} onChange={(e) => setSelectedObjectType(e.target.value)} className="border p-2 rounded min-w-[200px]">
                  <option value="">Выберите тип объекта</option>
                  {objectTypes.map((ot) => <option key={ot.id} value={ot.id}>{ot.name}</option>)}
                </select>

                <input type="text" value={newAttrName} onChange={(e) => setNewAttrName(e.target.value)} placeholder="Название атрибута" className="border p-2 rounded" />

                <select value={newAttrType} onChange={(e) => setNewAttrType(e.target.value)} className="border p-2 rounded">
                  <option value="string">string</option>
                  <option value="number">number</option>
                  <option value="boolean">boolean</option>
                </select>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAttrIsRequired} onChange={(e) => setNewAttrIsRequired(e.target.checked)} /> Обязательный
                </label>
              </div>

              <input type="text" value={newAttrOptions} onChange={(e) => setNewAttrOptions(e.target.value)} placeholder="Опции (через запятую)" className="border p-2 rounded" />

              <select value={newAttrRefObjectType} onChange={(e) => setNewAttrRefObjectType(e.target.value)} className="border p-2 rounded">
                <option value="">Тип-ссылка (необязательно)</option>
                {objectTypes.map((ot) => (
                  <option key={ot.id} value={ot.id}>{ot.name}</option>
                ))}
              </select>

              <button className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700" onClick={async () => {
                if (!selectedObjectType || !newAttrName || !newAttrType) {
                  setMessage("❌ Заполните все поля");
                  return;
                }

                const payload = {
                  name: newAttrName,
                  type: newAttrType,
                  is_required: newAttrIsRequired,
                  options: newAttrOptions.split(",").map(s => s.trim()).filter(Boolean),
                  ref_object_type: newAttrRefObjectType ? parseInt(newAttrRefObjectType) : null
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
                  setMessage("✅ Атрибут успешно добавлен");
                  setNewAttrName("");
                  setNewAttrType("string");
                  setNewAttrIsRequired(false);
                  setNewAttrOptions("");
                  setNewAttrRefObjectType("");
                } else {
                  setMessage("❌ Ошибка при добавлении атрибута");
                }
              }}>Добавить атрибут</button>
            </div>
          )}

          {message && <p className="text-green-600 mt-4 font-semibold">{message}</p>}
        </div>
      </main>
    </div>
  );
}
