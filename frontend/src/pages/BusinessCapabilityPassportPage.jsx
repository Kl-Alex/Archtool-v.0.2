// src/pages/BusinessCapabilityPassportPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import EditModal from "../components/EditModal";
import BusinessCapabilityForm from "../components/BusinessCapabilityForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

// ---------- helpers ----------
function sanitizeNil(v) {
  if (v === null || v === undefined) return null;
  if (typeof v === "string" && v.trim().toLowerCase() === "<nil>") return null;
  return v;
}

function safeText(x) {
  const sx = sanitizeNil(x);
  if (sx == null) return "";
  if (typeof sx === "string" || typeof sx === "number" || typeof sx === "boolean") return String(sx);
  try { return JSON.stringify(sx); } catch { return String(sx); }
}

function renderValue(raw) {
  if (raw === null || raw === undefined) return "—";
  if (typeof raw === "string" && raw.trim().toLowerCase() === "<nil>") return "—";
  if (raw === true || raw === "true") return "Да";
  if (raw === false || raw === "false") return "Нет";
  if (typeof raw === "string") {
    const s = raw.trim();
    // поддержка JSON-строк/массивов (multiple select и т.п.)
    if (
      (s.startsWith("[") && s.endsWith("]")) ||
      (s.startsWith("{") && s.endsWith("}")) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.length ? parsed.join(", ") : "—";
        if (typeof parsed === "string") return parsed || "—";
        return parsed ? JSON.stringify(parsed) : "—";
      } catch { /* ignore */ }
    }
    return s || "—";
  }
  return safeText(raw) || "—";
}

/** Нормализация ответа GET /api/business_capabilities/:id
 * Поддерживает твой формат:
 * {
 *   id: "6253",
 *   level: "L0",
 *   parent_id: "<nil>",
 *   attributes: [{attribute_id, name, value_text}, ...]
 * }
 */
function normalizeCapability(json) {
  if (!json || typeof json !== "object") {
    return {
      id: undefined,
      name: "",
      description: "",
      owner: "",
      it_domain: "",
      level: "",
      parent_id: null,
      attributes: [],
    };
  }

  // Соберём attrs в едином виде.
  const rawAttrs = Array.isArray(json.attributes)
    ? json.attributes
    : json.attribute_values && Array.isArray(json.attribute_values)
    ? json.attribute_values
    : [];

  const attrs = rawAttrs.map((a, idx) => ({
    attribute_id: a.attribute_id ?? a.id ?? idx,
    name: typeof a.name === "string" ? a.name : String(a.name ?? ""),
    display_name:
      typeof a.display_name === "string"
        ? a.display_name
        : String(a.display_name ?? a.name ?? ""),
    value_text:
      a.value_text != null
        ? String(a.value_text)
        : a.value != null
        ? (typeof a.value === "string" ? a.value : JSON.stringify(a.value))
        : "",
  }));

  const get = (key) =>
    sanitizeNil(
      attrs.find((x) => (x.name || "").toLowerCase() === key.toLowerCase())?.value_text
    );

  return {
    id: json.id,
    name: sanitizeNil(json.name) ?? get("name") ?? "",
    description: sanitizeNil(json.description) ?? get("description") ?? "",
    owner: sanitizeNil(json.owner) ?? get("owner") ?? "",
    it_domain: sanitizeNil(json.it_domain) ?? get("it_domain") ?? "",
    level: sanitizeNil(json.level) ?? get("level") ?? "",
    parent_id: sanitizeNil(json.parent_id) ?? get("parent_id") ?? null,
    parent_name: sanitizeNil(json.parent_name) ?? get("parent_name") ?? "",
    attributes: attrs,
  };
}

// ---------- component ----------
export default function BusinessCapabilityPassportPage() {
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
      const res = await fetch(`/api/business_capabilities/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить бизнес-способность");
      const json = await res.json();
      const normalized = normalizeCapability(json);
      setData(normalized);
    } catch (e) {
      notifyError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItem();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm("Удалить эту бизнес-способность?")) return;
    try {
      const res = await fetch(`/api/business_capabilities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      notifySuccess("Бизнес-способность удалена");
      navigate("/capabilities");
    } catch (e) {
      notifyError(e.message || "Ошибка удаления");
    }
  };

  const handleUpdated = async () => {
    setShowEditModal(false);
    await fetchItem();
    notifySuccess("Бизнес-способность обновлена");
  };

  const attrs = Array.isArray(data?.attributes)
    ? data.attributes
    : data?.attributes && typeof data.attributes === "object"
    ? Object.values(data.attributes)
    : [];

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
            {/* Шапка — стиль как в ApplicationPassportPage */}
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
                  {data.level && (
                    <span className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border">
                      Уровень: {data.level}
                    </span>
                  )}
                  <span className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-600 border">
                    ID: {data.id}
                  </span>
                </div>
              </div>
            </section>

            {/* Атрибуты — стиль как в ApplicationPassportPage */}
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
                      const nameStr = safeText(
                        a.display_name ?? a.name ?? a.attribute_name ?? `#${a.attribute_id ?? a.id ?? idx}`
                      );
                      const raw =
                        a.value_text !== undefined && a.value_text !== null
                          ? a.value_text
                          : a.value !== undefined && a.value !== null
                          ? a.value
                          : "";
                      const valueStr = renderValue(raw);

                      return (
                        <tr key={`${nameStr}-${idx}`} className="border-t">
                          <td className="py-2 pr-4 text-gray-700">{nameStr}</td>
                          <td className="py-2 break-words">{valueStr}</td>
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
            title="Редактирование бизнес-способности"
            onClose={() => setShowEditModal(false)}
            onSubmit={() => editFormRef.current?.submit()}
          >
            <BusinessCapabilityForm
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
