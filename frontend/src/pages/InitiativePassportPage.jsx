import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import EditModal from "../components/EditModal";
import InitiativeForm from "../components/InitiativeForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

function safeText(x) {
  if (x == null || x === "") return "—";
  if (x === true || x === "true") return "Да";
  if (x === false || x === "false") return "Нет";
  if (Array.isArray(x)) return x.length ? x.join(", ") : "—";
  const s = String(x);
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
      return JSON.stringify(v);
    } catch {
      return s;
    }
  }
  return s;
}

export default function InitiativePassportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки инициативы");
      const obj = await res.json();
      setData(obj);
    } catch (e) {
      notifyError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!confirm("Удалить инициативу?")) return;
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      notifySuccess("Инициатива удалена");
      navigate("/initiatives");
    } catch (e) {
      notifyError(e.message || "Ошибка удаления");
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-lentaWhite overflow-auto">
        {loading ? (
          <Spinner />
        ) : !data ? (
          <div className="text-gray-500">Нет данных</div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate(-1)}
                  className="text-gray-500 hover:text-lentaBlue flex items-center gap-1"
                >
                  <ArrowLeft size={18} /> Назад
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  className="flex items-center gap-1 px-3 py-1 border rounded text-gray-500 hover:text-lentaBlue"
                  onClick={() => setShowEdit(true)}
                >
                  <Pencil size={16} /> Изменить
                </button>
                <button
                  className="flex items-center gap-1 px-3 py-1 border rounded text-gray-500 hover:text-red-600"
                  onClick={handleDelete}
                >
                  <Trash2 size={16} /> Удалить
                </button>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-lentaBlue mb-2">
              {data.name || "Без названия"}
            </h1>
            <p className="text-gray-600 mb-6">{safeText(data.description)}</p>

            {/* основные поля */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-6">
              <InfoRow label="Статус" value={safeText(data.status)} />
              <InfoRow label="Владелец" value={safeText(data.owner)} />
              <InfoRow label="Домен" value={safeText(data.it_domain)} />
              <InfoRow label="Дата начала" value={safeText(data.start_date)} />
              <InfoRow label="Дата окончания" value={safeText(data.end_date)} />
              <InfoRow label="Бюджет" value={safeText(data.budget)} />
            </div>

            {/* динамические атрибуты */}
            {Array.isArray(data.attributes) && data.attributes.length > 0 && (
              <>
                <h2 className="text-xl font-semibold text-lentaBlue mb-2">Атрибуты</h2>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="text-left px-3 py-2 w-1/3">Атрибут</th>
                        <th className="text-left px-3 py-2">Значение</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.attributes.map((a) => (
                        <tr key={a.attribute_id} className="border-t">
                          <td className="px-3 py-2 text-gray-600">
                            {a.display_name || a.name || `#${a.attribute_id}`}
                          </td>
                          <td className="px-3 py-2">{safeText(a.value_text)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}

        {showEdit && data && (
          <EditModal
            title="Изменение инициативы"
            onClose={() => setShowEdit(false)}
            onSubmit={() => false}
          >
            <InitiativeForm
              existingData={data}
              onCreated={(id) => {
                setShowEdit(false);
                fetchData();
                notifySuccess("Инициатива обновлена");
              }}
              notifyError={notifyError}
            />
          </EditModal>
        )}
      </main>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-col">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value || "—"}</span>
    </div>
  );
}
