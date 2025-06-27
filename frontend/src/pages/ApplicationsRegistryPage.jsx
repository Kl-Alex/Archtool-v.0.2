import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import ApplicationForm from "../components/ApplicationForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ApplicationsRegistryPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const createFormRef = useRef();
  const navigate = useNavigate();

  const { notifyError, notifySuccess } = useNotification();

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки приложений");
      const data = await res.json();
      setApplications(data);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleCreatedOrUpdated = async () => {
    await fetchApplications();
    setShowCreateModal(false);
    setShowEditModal(false);
    notifySuccess("Приложение сохранено");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить это приложение?");
    if (!confirmed) return;

    const res = await fetch(`/api/applications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      notifySuccess("Приложение удалено");
      fetchApplications();
    } else {
      notifyError("Ошибка удаления");
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-lentaBlue">Реестр приложений</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Создать
          </button>
        </div>

        {loading ? (
          <Spinner />
        ) : (
          <ul className="space-y-3">
            {applications.map((app) => (
              <li
                key={app.id}
                className="p-4 bg-white rounded-lg border shadow flex justify-between items-center group transition"
              >
                <div>
                  <div className="font-semibold text-gray-800">{app.name}</div>
                  <div className="text-xs text-gray-500">ID: {app.id}</div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                  <button
                    onClick={() => navigate(`/applications/${app.id}`)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Паспорт приложения"
                  >
                    <Info size={18} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingItem(app);
                      setShowEditModal(true);
                    }}
                    className="text-gray-500 hover:text-lentaBlue"
                    title="Редактировать"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(app.id)}
                    className="text-red-500 hover:text-red-700"
                    title="Удалить"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </li>
            ))}
            {applications.length === 0 && (
              <li className="text-gray-500 text-sm">Нет приложений</li>
            )}
          </ul>
        )}

        {showCreateModal && (
          <CreateModal
            title="Создание приложения"
            onClose={() => setShowCreateModal(false)}
            onSubmit={() => createFormRef.current && createFormRef.current.submit()}
          >
            <ApplicationForm ref={createFormRef} onCreated={handleCreatedOrUpdated} />
          </CreateModal>
        )}

        {showEditModal && editingItem && (
          <EditModal
            title="Редактирование приложения"
            onClose={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
            onSubmit={() => document.getElementById("submit-app-form")?.click()}
          >
            <ApplicationForm existingData={editingItem} onCreated={handleCreatedOrUpdated} />
          </EditModal>
        )}
      </main>
    </div>
  );
}
