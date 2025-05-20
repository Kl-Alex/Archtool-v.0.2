import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const headers = { Authorization: "Bearer " + getToken() };

      const [usersRes, rolesRes] = await Promise.all([
        fetch("/api/users", { headers }),
        fetch("/api/roles", { headers }),
      ]);

      if (usersRes.ok && rolesRes.ok) {
        setUsers(await usersRes.json());
        setRoles(await rolesRes.json());
      }
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

    if (res.ok) {
      setMessage("✅ Роль успешно назначена");
    } else {
      setMessage("❌ Ошибка при назначении роли");
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="p-6 flex flex-col gap-4 text-lentaBlue">
        <h1 className="text-2xl font-bold">Админ-панель: Назначение ролей</h1>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="border p-2 rounded min-w-[200px]"
          >
            <option value="">Выберите пользователя</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="border p-2 rounded min-w-[200px]"
          >
            <option value="">Выберите роль</option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>

          <button
            className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={assignRole}
          >
            Назначить
          </button>
        </div>

        {message && <p className="text-green-600 font-semibold">{message}</p>}
      </main>
    </div>
  );
}
