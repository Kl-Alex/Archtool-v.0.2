// src/pages/InitiativePassportPage.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Spinner from "../components/Spinner";
import EditModal from "../components/EditModal";
import InitiativeForm from "../components/InitiativeForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, ArrowLeft } from "lucide-react";

/** Нормализация ответа GET /api/initiatives/:id
 * Поддерживает форматы:
 * 1) { id, attributes: [{attribute_id, name, display_name, value_text}, ...] }
 * 2) { id, attributes: { <key>: {display_name?, value_text?/value?} } }
 * 3) Плоский объект: { id, name: {displayName, value}, ... } или { id, name: "..." }
 */
function normalizeInitiative(json) {
  if (!json || typeof json !== "object") {
    return { id: undefined, name: "", description: "", owner: "", it_domain: "", status: "", start_date: "", end_date: "", budget: "", attributes: [] };
  }

  // Вариант 1: attributes — массив
  if (Array.isArray(json.attributes)) {
    const attrs = json.attributes.map((a, idx) => ({
      attribute_id: a.attribute_id ?? a.id ?? idx,
      name: a.name ?? a.attribute_name ?? "",
      display_name: a.display_name ?? a.name ?? a.attribute_name ?? "",
      value_text:
        a.value_text != null
          ? String(a.value_text)
          : a.value != null
          ? (typeof a.value === "string" ? a.value : JSON.stringify(a.value))
          : "",
    }));

    const getVal = (key) =>
      attrs.find((x) => x.name === key || x.display_name === key)?.value_text ?? "";

    return {
      id: json.id,
      name: String(getVal("name") || ""),
      description: String(getVal("description") || ""),
      owner: String(getVal("owner") || ""),
      it_domain: String(getVal("it_domain") || ""),
      status: String(getVal("status") || ""),
      start_date: String(getVal("start_date") || ""),
      end_date: String(getVal("end_date") || ""),
      budget: String(getVal("budget") || ""),
      attributes: attrs,
    };
  }

  // Вариант 1.1: attributes — объект (словарь) -> конвертируем в массив и рекурсивно используем вариант 1
  if (json.attributes && typeof json.attributes === "object") {
    const arr = Object.entries(json.attributes).map(([k, v], idx) => {
      const display = v && typeof v === "object" && ("display_name" in v || "displayName" in v)
        ? (v.display_name ?? v.displayName)
        : k;
      const val =
        v && typeof v === "object" && ("value_text" in v || "value" in v)
          ? (v.value_text ?? v.value)
          : v;
      return {
        attribute_id: v?.attribute_id ?? v?.id ?? idx,
        name: k,
        display_name: typeof display === "string" ? display : String(display ?? k),
        value_text:
          val == null
            ? ""
            : (typeof val === "string" || typeof val === "number" || typeof val === "boolean"
                ? String(val)
                : JSON.stringify(val)),
      };
    });
    return normalizeInitiative({ ...json, attributes: arr });
  }

  // Вариант 2: плоский объект
  const attrs = [];
  let name = "", description = "", owner = "", it_domain = "", status = "", start_date = "", end_date = "", budget = "";

  for (const [key, val] of Object.entries(json)) {
    if (key === "id" || key === "_labels" || key === "attributes") continue;

    if (val && typeof val === "object" && "value" in val) {
      const display_name = val.displayName ?? key;
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
      if (key === "status") status = String(value_text || "");
      if (key === "start_date") start_date = String(value_text || "");
      if (key === "end_date") end_date = String(value_text || "");
      if (key === "budget") budget = String(value_text || "");
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
      if (key === "status") status = String(value_text || "");
      if (key === "start_date") start_date = String(value_text || "");
      if (key === "end_date") end_date = String(value_text || "");
      if (key === "budget") budget = String(value_text || "");
    }
  }

  return { id: json.id, name, description, owner, it_domain, status, start_date, end_date, budget, attributes: attrs };
}

function renderValue(raw) {
  if (raw == null || raw === "") return "—";
  if (raw === true || raw === "true") return "Да";
  if (raw === false || raw === "false") return "Нет";
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";

  const s = String(raw);
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const v = JSON.parse(s);
      if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
      return JSON.stringify(v);
    } catch { /* fallthrough */ }
  }
  return s || "—";
}

export default function InitiativePassportPage() {
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
      const res = await fetch(`/api/initiatives/${id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Не удалось загрузить инициативу");
      const json = await res.json();
      setData(normalizeInitiative(json)); // ✅ нормализуем
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
    if (!window.confirm("Удалить эту инициативу?")) return;
    try {
      const res = await fetch(`/api/initiatives/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Ошибка удаления");
      notifySuccess("Инициатива удалена");
      navigate("/initiatives");
    } catch (e) {
      notifyError(e.message || "Ошибка удаления");
    }
  };

  const handleUpdated = async () => {
    setShowEditModal(false);
    await fetchItem();
    notifySuccess("Инициатива обновлена");
  };

  const attrs = Array.isArray(data?.attributes) ? data.attributes : [];

  const pick = (key) => attrs.find(a => a.name === key || a.display_name === key)?.value_text || "";
  const name        = data?.name || pick("name");
  const description = data?.description || pick("description");
  const owner       = data?.owner || pick("owner");
  const itDomain    = data?.it_domain || pick("it_domain");
  const status      = data?.status || pick("status");
  const startDate   = data?.start_date || pick("start_date");
  const endDate     = data?.end_date || pick("end_date");
  const budget      = data?.budget || pick("budget");

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
            {/* Шапка, как у TechnologyPassportPage */}
            <section className="bg-white border rounded-xl shadow p-5 mb-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-lentaBlue">
                    {name || "Без названия"}
                  </h1>
                  {description && (
                    <p className="text-gray-600 mt-1">{description}</p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {status && (
                    <span className="px-3 py-1 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
                      Статус: {status}
                    </span>
                  )}
                  {owner && (
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                      Владелец: {owner}
                    </span>
                  )}
                  {itDomain && (
                    <span className="px-3 py-1 rounded-full text-xs bg-yellow-50 text-yellow-700 border border-yellow-200">
                      Домен: {itDomain}
                    </span>
                  )}
                  {startDate && (
                    <span className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border">
                      Старт: {startDate}
                    </span>
                  )}
                  {endDate && (
                    <span className="px-3 py-1 rounded-full text-xs bg-gray-50 text-gray-700 border">
                      Финиш: {endDate}
                    </span>
                  )}
                  {budget && (
                    <span className="px-3 py-1 rounded-full text-xs bg-purple-50 text-purple-700 border border-purple-200">
                      Бюджет: {budget}
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
                      const label = a.display_name || a.name || a.attribute_name || `#${a.attribute_id || a.id || idx}`;
                      const raw =
                        a.value_text !== undefined && a.value_text !== null
                          ? a.value_text
                          : a.value !== undefined && a.value !== null
                          ? a.value
                          : "";
                      const valueStr = renderValue(raw);

                      return (
                        <tr key={`${label}-${idx}`} className="border-t">
                          <td className="py-2 pr-4 text-gray-700">{label}</td>
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
            title="Редактирование инициативы"
            onClose={() => setShowEditModal(false)}
            onSubmit={() => editFormRef.current?.submit()}
          >
            <InitiativeForm
              ref={editFormRef}
              existingData={data}
              onCreated={handleUpdated}
              notifyError={notifyError}
            />
          </EditModal>
        )}
      </main>
    </div>
  );
}
