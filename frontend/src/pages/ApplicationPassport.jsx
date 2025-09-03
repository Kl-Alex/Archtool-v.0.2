// src/pages/ApplicationPassportPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import EditModal from "../components/EditModal";
import ApplicationForm from "../components/ApplicationForm"; // замени, если другое имя
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

// ---------- helpers ----------
function safeText(x) {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") return String(x);
  try {
    return JSON.stringify(x);
  } catch {
    return String(x);
  }
}

function renderValue(raw) {
  if (raw == null) return "—";
  if (raw === true || raw === "true") return "Да";
  if (raw === false || raw === "false") return "Нет";
  if (typeof raw === "string") {
    const s = raw.trim();
    // поддержка JSON-строк/массивов для select multiple и т.п.
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith('"') && s.endsWith('"'))) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.join(", ");
        if (typeof parsed === "string") return parsed;
      } catch { /* ignore */ }
    }
    return s || "—";
  }
  return safeText(raw) || "—";
}

/** Нормализация ответа GET /api/applications/:id
 * Поддерживает:
 * 1) { id, attributes: [{attribute_id, name, display_name, value_text}] }
 * 2) { id, name: {displayName, value}, ... } или { id, name: "..." }
 */
function normalizeApplication(json) {
  if (!json || typeof json !== "object") {
    return { id: undefined, name: "", description: "", owner: "", it_domain: "", attributes: [] };
  }

  // --- ВАРИАНТ 1: attributes — массив
  if (Array.isArray(json.attributes)) {
    const attrs = json.attributes.map((a) => ({
      attribute_id: a.attribute_id ?? a.id,
      name: typeof a.name === "string" ? a.name : String(a.name ?? ""),
      display_name: typeof a.display_name === "string" ? a.display_name : String(a.display_name ?? a.name ?? ""),
      value_text:
        a.value_text != null
          ? (typeof a.value_text === "string" || typeof a.value_text === "number" || typeof a.value_text === "boolean"
              ? String(a.value_text)
              : JSON.stringify(a.value_text))
          : (a.value != null
              ? (typeof a.value === "string" ? a.value : JSON.stringify(a.value))
              : ""),
    }));

    const getVal = (key) => attrs.find((x) => x.name === key || x.display_name === key)?.value_text ?? "";
    return {
      id: json.id,
      name: String(getVal("name") || ""),
      description: String(getVal("description") || ""),
      owner: String(getVal("owner") || ""),
      it_domain: String(getVal("it_domain") || ""),
      attributes: attrs,
    };
  }

  // --- ВАРИАНТ 1.1: attributes — объект (словари) -> конвертируем в массив
  if (json.attributes && typeof json.attributes === "object") {
    const arr = Object.entries(json.attributes).map(([k, v]) => {
      const display = v && typeof v === "object" && "display_name" in v ? v.display_name : k;
      const val =
        v && typeof v === "object" && "value_text" in v
          ? v.value_text
          : v && typeof v === "object" && "value" in v
          ? v.value
          : v;
      return {
        attribute_id: v?.attribute_id ?? v?.id,
        name: k,
        display_name: typeof display === "string" ? display : String(display ?? k),
        value_text:
          typeof val === "string" || typeof val === "number" || typeof val === "boolean"
            ? String(val)
            : val != null
            ? JSON.stringify(val)
            : "",
      };
    });
    return normalizeApplication({ ...json, attributes: arr });
  }

  // --- ВАРИАНТ 2: плоский объект
  const attrs = [];
  let name = "", description = "", owner = "", it_domain = "";

  for (const [key, val] of Object.entries(json)) {
    if (key === "id" || key === "_labels" || key === "attributes") continue;

    if (val && typeof val === "object" && "value" in val) {
      const display_name = typeof val.displayName === "string" ? val.displayName : key;
      const value_text =
        val.value == null
          ? ""
          : (typeof val.value === "string" || typeof val.value === "number" || typeof val.value === "boolean"
              ? String(val.value)
              : JSON.stringify(val.value));

      attrs.push({ name: key, display_name, value_text });

      if (key === "name") name = String(value_text || "");
      if (key === "description") description = String(value_text || "");
      if (key === "owner") owner = String(value_text || "");
      if (key === "it_domain") it_domain = String(value_text || "");
    } else {
      const value_text =
        val == null
          ? ""
          : (typeof val === "string" || typeof val === "number" || typeof val === "boolean"
              ? String(val)
              : JSON.stringify(val));

      attrs.push({ name: key, display_name: key, value_text });

      if (key === "name") name = String(value_text || "");
      if (key === "description") description = String(value_text || "");
      if (key === "owner") owner = String(value_text || "");
      if (key === "it_domain") it_domain = String(value_text || "");
    }
  }

  return { id: json.id, name, description, owner, it_domain, attributes: attrs };
}

// ---------- component ----------
export default function ApplicationPassportPage() {
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
      const res = await fetch(`/api/applications/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить приложение");
      const json = await res.json();
      const normalized = normalizeApplication(json);
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
    if (!window.confirm("Удалить это приложение?")) return;
    try {
      const res = await fetch(`/api/applications/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      notifySuccess("Приложение удалено");
      navigate("/applications");
    } catch (e) {
      notifyError(e.message);
    }
  };

  const handleUpdated = async () => {
    setShowEditModal(false);
    await fetchItem();
    notifySuccess("Приложение обновлено");
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
            title="Редактирование приложения"
            onClose={() => setShowEditModal(false)}
            onSubmit={() => editFormRef.current?.submit()}
          >
            <ApplicationForm
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
