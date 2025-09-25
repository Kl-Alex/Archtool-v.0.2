import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import Notification from "../components/Notification";
import DictionaryManager from "../components/DictionaryManager";
import PermissionMatrix from "../components/PermissionMatrix";
import UserRoleAssigner from "../components/UserRoleAssigner";
import AttributeGroupsManager from "../components/AttributeGroupsManager";


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
  const [selectedRoleForMatrix, setSelectedRoleForMatrix] = useState("");
  const [rolePermsForMatrix, setRolePermsForMatrix] = useState([]); // [{id, action, resource}]
  const [newAttrGroupId, setNewAttrGroupId] = useState("");


  const tabs = [
    { id: "roles", label: "Назначение ролей" },
    { id: "permissions", label: "Права ролей" },
    { id: "attributes", label: "Атрибуты объектов" },
    { id: "logs", label: "Логи действий" },
    { id: "dictionaries", label: "Справочники" },
  ];

  const getAuthHeaders = () => ({ Authorization: "Bearer " + getToken() });
  const [attrGroups, setAttrGroups] = useState([]);
useEffect(() => {
  if (!selectedObjectType) { setAttrGroups([]); return; }
  fetch(`/api/object_types/${selectedObjectType}/attribute_groups`, { headers: getAuthHeaders() })
    .then(r => r.ok ? r.json() : [])
    .then(setAttrGroups)
    .catch(() => setAttrGroups([]));
}, [selectedObjectType]);


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
      group_id: newAttrGroupId ? parseInt(newAttrGroupId, 10) : null,
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

  const fetchRolePerms = async (roleId) => {
    if (!roleId) { setRolePermsForMatrix([]); return; }
    const res = await fetch(`/api/roles/${roleId}/permissions`, { headers: getAuthHeaders() });
    setRolePermsForMatrix(res.ok ? await res.json() : []);
  };

  const toggleRolePermission = async (permId, checked) => {
    if (!selectedRoleForMatrix) return;
    if (checked) {
      const res = await fetch(`/api/roles/${selectedRoleForMatrix}/permissions`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ permission_id: permId }),
      });
      if (res.ok) fetchRolePerms(selectedRoleForMatrix);
    } else {
      const res = await fetch(`/api/roles/${selectedRoleForMatrix}/permissions/${permId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      if (res.ok) fetchRolePerms(selectedRoleForMatrix);
    }
  };

  // ---------- UI helpers (новый стиль под макет) ----------
  const TabButton = ({ id, label }) => (
    <button
      key={id}
      onClick={() => setTab(id)}
      className={`relative rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200
        ${tab === id
          ? "bg-lentaBlue/10 text-lentaBlue shadow-[inset_0_-2px_0_0] shadow-lentaBlue"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"}
      `}
    >
      {label}
    </button>
  );

  const Field = ({ label, children, hint }) => (
    <div className="space-y-1">
      <label className="block text-xs font-semibold tracking-wide text-gray-600 uppercase">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  );

  const inputBase =
    "w-full rounded-2xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-4 focus:ring-lentaBlue/20 focus:border-lentaBlue placeholder:text-gray-400";

  const checkboxBase = "h-4 w-4 rounded border-gray-300 text-lentaBlue focus:ring-lentaBlue";

  return (
    <div className="flex h-screen bg-gradient-to-b from-white to-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="mx-auto max-w-7xl">
          {/* Заголовок */}
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Админ‑панель</h1>
          </div>

          {/* Табы */}
          <div className="sticky top-0 z-10 mb-6 -mt-2 backdrop-blur supports-[backdrop-filter]:bg-white/70 supports-[backdrop-filter]:shadow-sm rounded-2xl border border-gray-200 p-2 flex flex-wrap gap-2">
            {tabs.map(TabButton)}
          </div>

          {/* Карточка контента */}
          <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-6 shadow-sm">
            {tab === "roles" && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Назначение ролей пользователям</h2>
                <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                  <UserRoleAssigner users={users} roles={roles} />
                </div>
              </div>
            )}

            {tab === "permissions" && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-900">Права ролей</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field label="Роль">
                    <select
                      value={selectedRoleForMatrix}
                      onChange={(e) => { setSelectedRoleForMatrix(e.target.value); fetchRolePerms(e.target.value); }}
                      className={inputBase}
                    >
                      <option value="">— Выберите —</option>
                      {roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                    </select>
                  </Field>
                </div>
                {selectedRoleForMatrix && (
                  <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                    <PermissionMatrix
                      allPermissions={permissions}
                      assignedPermissions={rolePermsForMatrix}
                      onToggle={toggleRolePermission}
                    />
                  </div>
                )}
              </div>
            )}

            {tab === "attributes" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Атрибуты объектов</h2>
                </div>

                {/* Форма создания */}
                <div className="rounded-2xl border border-gray-200 p-4 md:p-6 bg-white/80 shadow-sm space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Field label="Тип объекта">
                      <select
                        value={selectedObjectType}
                        onChange={(e) => setSelectedObjectType(e.target.value)}
                        className={inputBase}
                      >
                        <option value="">— Выберите —</option>
                        {objectTypes.map((ot) => (
                          <option key={ot.id} value={ot.id}>{ot.name}</option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Тех. имя" hint="Латиница, без пробелов">
                      <input
                        type="text"
                        value={newAttrName}
                        onChange={(e) => setNewAttrName(e.target.value)}
                        placeholder="name"
                        className={inputBase}
                      />
                    </Field>

                    <Field label="Название">
                      <input
                        type="text"
                        value={newAttrDisplayName}
                        onChange={(e) => setNewAttrDisplayName(e.target.value)}
                        placeholder="Название"
                        className={inputBase}
                      />
                    </Field>
                    <Field label="Группа">
  <select
    className={inputBase}
    value={newAttrGroupId}
    onChange={e => setNewAttrGroupId(e.target.value)}
  >
    <option value="">— Без группы —</option>
    {attrGroups.map(g => <option key={g.id} value={g.id}>{g.display_name}</option>)}
  </select>
</Field>


                    <Field label="Тип">
                      <select
                        value={newAttrType}
                        onChange={(e) => setNewAttrType(e.target.value)}
                        className={inputBase}
                      >
                        <option value="string">string</option>
                        <option value="number">number</option>
                        <option value="boolean">boolean</option>
                        <option value="select">select</option>
                        <option value="date">date</option>
                      </select>
                    </Field>

                    {newAttrType === "date" && (
                      <Field label="Формат даты">
                        <select
                          value={newAttrDateFormat}
                          onChange={(e) => setNewAttrDateFormat(e.target.value)}
                          className={inputBase}
                        >
                          <option value="">Выберите формат</option>
                          <option value="dd.mm.yyyy">дд.мм.гггг</option>
                          <option value="mm.yyyy">мм.гггг</option>
                          <option value="qn.yyyy">qn.гггг</option>
                          <option value="yyyy">гггг</option>
                        </select>
                      </Field>
                    )}
                  </div>

                  {newAttrType === "select" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 p-3">
                        <input
                          id="attr-multiple"
                          type="checkbox"
                          className={checkboxBase}
                          checked={newAttrIsMultiple}
                          onChange={(e) => setNewAttrIsMultiple(e.target.checked)}
                        />
                        <label htmlFor="attr-multiple" className="text-sm text-gray-700">Множественный выбор</label>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl border border-gray-200 p-3">
                        <input
                          id="attr-dict"
                          type="checkbox"
                          className={checkboxBase}
                          checked={useDictionary}
                          onChange={(e) => setUseDictionary(e.target.checked)}
                        />
                        <label htmlFor="attr-dict" className="text-sm text-gray-700">Привязать к справочнику</label>
                      </div>

                      {useDictionary ? (
                        <Field label="Справочник">
                          <select
                            className={inputBase}
                            value={newAttrDictionaryName}
                            onChange={(e) => setNewAttrDictionaryName(e.target.value)}
                          >
                            <option value="">— Выберите —</option>
                            {availableDictionaries.map((dict) => (
                              <option key={dict} value={dict}>{dict}</option>
                            ))}
                          </select>
                        </Field>
                      ) : (
                        <Field label="Опции" hint="Одна строка — один элемент">
                          <textarea
                            placeholder="Например: Low\nMedium\nHigh"
                            value={newAttrOptionsText}
                            onChange={(e) => setNewAttrOptionsText(e.target.value)}
                            className={`${inputBase} min-h-[116px]`}
                          />
                        </Field>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        className={checkboxBase}
                        checked={newAttrIsRequired}
                        onChange={(e) => setNewAttrIsRequired(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">Обязательный</span>
                    </label>

                    <button
                      className="inline-flex items-center justify-center rounded-2xl bg-lentaBlue px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-110 active:brightness-95 disabled:opacity-50"
                      onClick={addAttribute}
                    >
                      Добавить атрибут
                    </button>
                  </div>
                </div>

                {/* Список атрибутов */}
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-800">Список атрибутов</h3>
                  </div>
                  {attributes.length === 0 ? (
                    <div className="p-6 text-sm text-gray-500">Нет атрибутов для выбранного типа объекта.</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 text-sm">
                      {attributes.map(attr => (
                        <li key={attr.id} className="group flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{attr.display_name}
                              <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-700 align-middle">{attr.type}</span>
                              {attr.is_required && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-lentaYellow/20 px-2 py-0.5 text-[11px] font-medium text-amber-700">required</span>
                              )}
                              {attr.is_multiple && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-lentaBlue/10 px-2 py-0.5 text-[11px] font-medium text-lentaBlue">multi</span>
                              )}
                            </div>
                            <div className="mt-0.5 text-gray-500 truncate">{attr.name}</div>
                          </div>
                          <button
                            onClick={() => deleteAttribute(attr.id)}
                            className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-700 transition-opacity text-xs"
                          >
                            удалить
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {selectedObjectType && (
  <AttributeGroupsManager
    objectTypeId={parseInt(selectedObjectType, 10)}
    onChanged={() => {
      // после изменений групп обновим и список групп, и атрибуты
      fetch(`/api/object_types/${selectedObjectType}/attribute_groups`, { headers: getAuthHeaders() })
        .then(r => r.ok ? r.json() : [])
        .then(setAttrGroups)
        .catch(() => setAttrGroups([]));
      fetchAttributesForObjectType(selectedObjectType);
    }}
    className="mt-6"
  />
)}

                </div>
              </div>
            )}

            {tab === "logs" && (
              <div className="space-y-4 text-sm">
                <h2 className="text-lg font-semibold text-gray-900">Последние действия пользователей</h2>
                <div className="overflow-x-auto rounded-2xl border border-gray-200">
                  <table className="min-w-full border-separate border-spacing-0">
                    <thead>
                      <tr className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-600">
                        <th className="py-3 px-3 border-b border-gray-200">Пользователь</th>
                        <th className="py-3 px-3 border-b border-gray-200">Действие</th>
                        <th className="py-3 px-3 border-b border-gray-200">Объект</th>
                        <th className="py-3 px-3 border-gray-200">ID объекта</th>
                        <th className="py-3 px-3 border-gray-200">Было</th>
                        <th className="py-3 px-3 border-gray-200">Стало</th>
                        <th className="py-3 px-3 border-gray-200">Время</th>
                        <th className="py-3 px-3 border-gray-200">Подробности</th>
                      </tr>
                    </thead>
                    <tbody>
                      {actionLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="py-2.5 px-3 border-t border-gray-100">{log.username || "—"}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100">{log.action}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100">{log.entity}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100">{log.entity_id}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100 text-red-600">{log.old_value || "—"}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100 text-green-600">{log.new_value || "—"}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100">{new Date(log.timestamp).toLocaleString()}</td>
                          <td className="py-2.5 px-3 border-t border-gray-100">{log.details || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
