import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import Notification from "../components/Notification";
import DictionaryManager from "../components/DictionaryManager";

export default function AdminPage() {
  // Состояния и методы
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
  const [newAttrIsMultiple, setNewAttrIsMultiple] = useState(false);
  const [newAttrOptionsText, setNewAttrOptionsText] = useState("");
  const [newAttrDictionaryName, setNewAttrDictionaryName] = useState("");
  const [useDictionary, setUseDictionary] = useState(false);
  const [availableDictionaries, setAvailableDictionaries] = useState([]);
  const [newAttrDateFormat, setNewAttrDateFormat] = useState("");
  const [rolePermissions, setRolePermissions] = useState([]);
  const [notification, setNotification] = useState(null);
  const [actionLogs, setActionLogs] = useState([]);

  const tabs = [
    { id: "roles", label: "Назначение ролей" },
    { id: "permissions", label: "Права ролей" },
    { id: "attributes", label: "Атрибуты объектов" },
    { id: "logs", label: "Логи действий" },
    { id: "dictionaries", label: "Справочники" },
  ];


  const getAuthHeaders = () => ({ Authorization: "Bearer " + getToken() });

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
    if (selectedObjectType) fetchAttributesForObjectType(selectedObjectType);
    else setAttributes([]);
  }, [selectedObjectType]);

  useEffect(() => {
    if (tab === "logs") {
      fetch("/api/action_logs", { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(setActionLogs)
        .catch(() => setActionLogs([]));
    }
  }, [tab]);

  useEffect(() => {
    fetch("/api/dictionaries", { headers: getAuthHeaders() })
      .then(res => res.json())
      .then(setAvailableDictionaries)
      .catch(() => setAvailableDictionaries([]));
  }, []);

  const fetchAttributesForObjectType = async (id) => {
    const res = await fetch(`/api/object_types/${id}/attributes`, { headers: getAuthHeaders() });
    setAttributes(res.ok ? await res.json() : []);
  };

  const deleteAttribute = async (id) => {
    const res = await fetch(`/api/attributes/${id}`, {
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
      message: res.ok ? "✅ Роль назначена" : "❌ Ошибка назначения роли",
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
      setNotification({ type: "success", message: "✅ Право назначено" });
      handleSelectRoleForPermissions(selectedRole);
    } else {
      setNotification({ type: "error", message: "❌ Ошибка назначения права" });
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
      handleSelectRoleForPermissions(selectedRole);
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
      .map(opt => opt.trim())
      .filter(opt => opt.length > 0);

    const payload = {
      name: newAttrName,
      display_name: newAttrDisplayName,
      type: newAttrType,
      is_required: newAttrIsRequired,
      is_multiple: newAttrIsMultiple,
      options: useDictionary ? [] : optionsArray,
      dictionary_name: useDictionary ? newAttrDictionaryName : "",
      date_format: newAttrType === "date" ? newAttrDateFormat : "",
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
      setNotification({ type: "success", message: "✅ Атрибут добавлен" });
      setNewAttrName("");
      setNewAttrDisplayName("");
      setNewAttrType("string");
      setNewAttrIsRequired(false);
      fetchAttributesForObjectType(selectedObjectType);
      setNewAttrIsMultiple(false);
      setNewAttrOptionsText("");
      setNewAttrDictionaryName("");
      setUseDictionary(false);
      setNewAttrDateFormat("");
    } else {
      setNotification({ type: "error", message: "❌ Ошибка добавления атрибута" });
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">Админ-панель</h1>
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${tab === id
                    ? "border-lentaBlue text-lentaBlue"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                >
                  {label}
                </button>
              ))}
            </nav>
          </div>


          <div className="bg-lentaWhite p-4 border rounded shadow">
            {tab === "roles" && (
              <div className="mt-8 ml-6">
  <h2 className="text-xl font-semibold text-gray-800 mb-4">Назначение ролей</h2>

  <div className="bg-white shadow rounded-lg p-6 w-full max-w-5xl">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Пользователь</label>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">— Выберите —</option>
          {users.map(user => (
            <option key={user.id} value={user.id}>{user.username}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Роль</label>
        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="">— Выберите —</option>
          {roles.map(role => (
            <option key={role.id} value={role.id}>{role.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-end mt-4 md:mt-0">
        <button
          onClick={assignRole}
          className="px-4 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition w-full md:w-auto"
        >
          Назначить
        </button>
      </div>
    </div>
  </div>
</div>

            )}



{tab === "permissions" && (
  <div className="mt-8 ml-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Права ролей</h2>

    <div className="bg-white shadow rounded-lg p-6 w-full max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Роль</label>
          <select
            value={selectedRole}
            onChange={(e) => handleSelectRoleForPermissions(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— Выберите —</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Право</label>
          <select
            value={selectedPermission}
            onChange={(e) => setSelectedPermission(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— Выберите —</option>
            {permissions.map(perm => (
              <option key={perm.id} value={perm.id}>
                {perm.action} {perm.resource}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end mt-4 md:mt-0">
          <button
            onClick={assignPermission}
            className="px-4 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition w-full md:w-auto"
          >
            Назначить
          </button>
        </div>
      </div>

      {rolePermissions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Назначенные права</h3>
          <ul className="space-y-1 text-sm">
            {rolePermissions.map((perm) => (
              <li key={perm.id} className="flex justify-between items-center border-b border-gray-100 py-1">
                <span className="text-gray-800">{perm.action} {perm.resource}</span>
                <button
                  onClick={() => removePermissionFromRole(perm.id)}
                  className="text-red-600 hover:text-red-800 text-xs"
                >
                  удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  </div>
)}


{tab === "attributes" && (
  <div className="mt-8 ml-6">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Атрибуты объектов</h2>

    <div className="bg-white shadow rounded-lg p-6 w-full max-w-7xl space-y-6">

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Тип объекта */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Тип объекта</label>
          <select
            value={selectedObjectType}
            onChange={(e) => setSelectedObjectType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="">— Выберите —</option>
            {objectTypes.map((ot) => (
              <option key={ot.id} value={ot.id}>{ot.name}</option>
            ))}
          </select>
        </div>

        {/* Тех. имя */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Тех. имя</label>
          <input
            type="text"
            value={newAttrName}
            onChange={(e) => setNewAttrName(e.target.value)}
            placeholder="name"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Отображаемое имя */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Название</label>
          <input
            type="text"
            value={newAttrDisplayName}
            onChange={(e) => setNewAttrDisplayName(e.target.value)}
            placeholder="Название"
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          />
        </div>

        {/* Тип атрибута */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Тип</label>
          <select
            value={newAttrType}
            onChange={(e) => setNewAttrType(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="string">string</option>
            <option value="number">number</option>
            <option value="boolean">boolean</option>
            <option value="select">select</option>
            <option value="date">date</option>
          </select>
        </div>

        {/* Формат даты */}
        {newAttrType === "date" && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Формат даты</label>
            <select
              value={newAttrDateFormat}
              onChange={(e) => setNewAttrDateFormat(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">Выберите формат</option>
              <option value="dd.mm.yyyy">дд.мм.гггг</option>
              <option value="mm.yyyy">мм.гггг</option>
              <option value="qn.yyyy">qn.гггг</option>
              <option value="yyyy">гггг</option>
            </select>
          </div>
        )}
      </div>

      {/* select-specific настройки */}
      {newAttrType === "select" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={newAttrIsMultiple}
              onChange={(e) => setNewAttrIsMultiple(e.target.checked)}
            />
            <label className="text-sm text-gray-700">Множественный выбор</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useDictionary}
              onChange={(e) => setUseDictionary(e.target.checked)}
            />
            <label className="text-sm text-gray-700">Привязать к справочнику</label>
          </div>

          {useDictionary ? (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Справочник</label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                value={newAttrDictionaryName}
                onChange={(e) => setNewAttrDictionaryName(e.target.value)}
              >
                <option value="">— Выберите —</option>
                {availableDictionaries.map((dict) => (
                  <option key={dict} value={dict}>{dict}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Опции</label>
              <textarea
                placeholder="Одна строка — один элемент"
                value={newAttrOptionsText}
                onChange={(e) => setNewAttrOptionsText(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>
      )}

      {/* Обязательный */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={newAttrIsRequired}
          onChange={(e) => setNewAttrIsRequired(e.target.checked)}
        />
        <label className="text-sm text-gray-700">Обязательный</label>
      </div>

      {/* Кнопка */}
      <div>
        <button
          className="px-4 py-2 text-sm border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-md transition"
          onClick={addAttribute}
        >
          Добавить атрибут
        </button>
      </div>

      {/* Список атрибутов */}
      {attributes.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">Список атрибутов</h3>
          <ul className="divide-y divide-gray-100 text-sm">
            {attributes.map(attr => (
              <li key={attr.id} className="flex justify-between items-center py-1">
                <span>{attr.display_name} <span className="text-gray-500">({attr.type})</span></span>
                <button
                  onClick={() => deleteAttribute(attr.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  удалить
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
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
            {tab === "dictionaries" && (
              <DictionaryManager />
            )}




            {notification && (
              <Notification
                type={notification.type}
                message={notification.message}
                onClose={() => setNotification(null)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
