import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import EditModal from "../components/EditModal";
import TechnologyForm from "../components/TechnologyForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

/** Нормализация ответа GET /api/technologies/:id
 * Бэк может отдавать:
 *  {
 *    id: "...",
 *    name: { displayName, value },
 *    ...другие атрибуты в том же виде
 *  }
 * Приводим к виду:
 *  {
 *    id, name, description, owner, it_domain, attributes: [ {name, display_name, value_text}, ... ]
 *  }
 */
function normalizeTechnology(json) {
  if (!json || typeof json !== "object") {
    return { id: undefined, name: "", description: "", owner: "", it_domain: "", attributes: [] };
  }

  const attrs = [];
  let name = "", description = "", owner = "", it_domain = "";

  for (const [key, val] of Object.entries(json)) {
    if (key === "id" || key === "_labels") continue;

    // объект вида {displayName, value}
    if (val && typeof val === "object" && "value" in val) {
      const display_name = val.displayName || key;
      const value_text = val.value ?? "";
      attrs.push({ name: key, display_name, value_text });

      if (key === "name") name = String(value_text || "");
      if (key === "description") description = String(value_text || "");
      if (key === "owner") owner = String(value_text || "");
      if (key === "it_domain") it_domain = String(value_text || "");
    } else {
      // плоское значение — на всякий случай поддержим и это
      const value_text = val ?? "";
      attrs.push({ name: key, display_name: key, value_text });
      if (key === "name") name = String(value_text || "");
      if (key === "description") description = String(value_text || "");
      if (key === "owner") owner = String(value_text || "");
      if (key === "it_domain") it_domain = String(value_text || "");
    }
  }

  return {
    id: json.id,
    name,
    description,
    owner,
    it_domain,
    attributes: attrs,
  };
}

// Рендер значения (красиво показываем множественный select, boolean и пр.)
function renderValue(raw) {
  if (raw == null) return "";
  // boolean как Да/Нет
  if (raw === true || raw === "true") return "Да";
  if (raw === false || raw === "false") return "Нет";

  // множественный select хранится как JSON-массив в строке
  if (typeof raw === "string") {
    const s = raw.trim();
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.join(", ");
        if (typeof parsed === "string") return parsed;
      } catch {
        // игнорируем parse error, покажем как есть
      }
    }
  }

  return String(raw);
}

export default function TechnologyPassportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showEditModal, setShowEditModal] = useState(false);
  const editFormRef = useRef();

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/technologies/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить технологию");
      const json = await res.json();
      const normalized = normalizeTechnology(json);
      setData(normalized);
    } catch (e) {
      notifyError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Удалить эту технологию?")) return;
    try {
      const res = await fetch(`/api/technologies/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      notifySuccess("Технология удалена");
      navigate("/technologies");
    } catch (e) {
      notifyError(e.message);
    }
  };

  const handleUpdated = async () => {
    setShowEditModal(false);
    await fetchItem();
    notifySuccess("Технология обновлена");
  };

  const attrs = Array.isArray(data?.attributes) ? data.attributes : [];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-lentaWhite overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-lentaBlue"
          >
            <ArrowLeft size={18} />
            Назад
          </button>

        <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded border text-lentaBlue border-lentaBlue hover:bg-lentaBlue hover:text-white"
            >
              <Pencil size={18} />
              Редактировать
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-3 py-2 rounded border text-red-600 border-red-300 hover:bg-red-50"
            >
              <Trash2 size={18} />
              Удалить
            </button>
          </div>
        </div>

        {loading ? (
          <Spinner />
        ) : !data ? (
          <div className="text-gray-500">Данные не найдены</div>
        ) : (
          <>
            {/* Шапка */}
            <section className="bg-white border rounded-xl shadow p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-lentaBlue">
                    {data.name || "Без названия"}
                  </h1>
                  {data.description && (
                    <p className="text-gray-600 mt-1">{data.description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.owner && (
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      Владелец: {data.owner}
                    </span>
                  )}
                  {data.it_domain && (
                    <span className="px-3 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                      Домен: {data.it_domain}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-600 border">
                    ID: {data.id}
                  </span>
                </div>
              </div>
            </section>

            {/* Атрибуты */}
            <section className="bg-white border rounded-xl shadow p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Атрибуты</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2 pr-4">Атрибут</th>
                      <th className="py-2">Значение</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attrs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-3 text-gray-400">
                          Нет атрибутов
                        </td>
                      </tr>
                    )}
                    {attrs.map((a, idx) => {
                      const name =
                        a.display_name || a.name || a.attribute_name || `#${a.attribute_id || a.id || idx}`;
                      const raw =
                        a.value_text !== undefined && a.value_text !== null
                          ? a.value_text
                          : a.value !== undefined && a.value !== null
                          ? a.value
                          : "";
                      const value = renderValue(raw);

                      return (
                        <tr key={`${name}-${idx}`} className="border-t">
                          <td className="py-2 pr-4 text-gray-700">{name}</td>
                          <td className="py-2 break-words">{value}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {showEditModal && data && (
          <EditModal
            title="Редактирование технологии"
            onClose={() => setShowEditModal(false)}
            onSubmit={() => editFormRef.current?.submit()}
          >
            <TechnologyForm
              ref={editFormRef}
              existingData={data}
              onCreated={handleUpdated}
            />
          </EditModal>
        )}
      </main>
    </div>
  );
}
