import { X, Pencil } from "lucide-react";

function safeText(x) {
  if (x == null) return "—";
  if (typeof x === "string" || typeof x === "number") return String(x);
  if (typeof x === "boolean") return x ? "Да" : "Нет";
  try { return JSON.stringify(x); } catch { return String(x); }
}

export default function AppCapabilityPassportPage({
  capability,
  onClose,
  onUpdated,     // как в других карточках проекта
  onEdit,        // опционально: коллбэк для «редактировать»
}) {
  if (!capability) return null;

  const attrs = Array.isArray(capability.attributes) ? capability.attributes : [];
  // Попробуем вытащить часто используемые поля
  const common = {
    name: capability.name || "Без названия",
    description: capability.description,
    level: capability.level,
    parent_id: capability.parent_id,
    application_name: capability.application_name || capability.app_name,
    owner: capability.owner,
    it_domain: capability.it_domain,
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
          aria-label="Закрыть"
        >
          <X size={20} />
        </button>

        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold text-lentaBlue">{common.name}</h2>

          <button
            className="text-gray-400 hover:text-lentaBlue"
            title="Редактировать"
            onClick={() => (onEdit ? onEdit(capability) : onUpdated?.(capability.id))}
          >
            <Pencil size={18} />
          </button>
        </div>

        {/* Основные факты как в карточках приложений/платформ/технологий */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <InfoRow label="Описание" value={safeText(common.description)} />
          <InfoRow label="Приложение" value={safeText(common.application_name)} />
          <InfoRow label="Уровень" value={safeText(common.level)} />
          <InfoRow label="Владелец" value={safeText(common.owner)} />
          <InfoRow label="Домен" value={safeText(common.it_domain)} />
          <InfoRow label="Родитель" value={safeText(common.parent_id)} />
        </div>

        {/* Динамические атрибуты — таблицей, как в других карточках */}
        {attrs.length > 0 && (
          <>
            <h3 className="mt-6 mb-2 font-semibold text-lentaBlue">Атрибуты</h3>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2 w-1/3">Атрибут</th>
                    <th className="text-left px-3 py-2">Значение</th>
                  </tr>
                </thead>
                <tbody>
                  {attrs.map((a) => (
                    <tr key={a.attribute_id} className="border-t">
                      <td className="px-3 py-2 text-gray-600">
                        {a.display_name || a.name || a.attribute_name || `#${a.attribute_id}`}
                      </td>
                      <td className="px-3 py-2">
                        {renderValue(a.value_text)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
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

function renderValue(raw) {
  if (raw == null) return "—";
  if (raw === true || raw === "true") return "Да";
  if (raw === false || raw === "false") return "Нет";
  if (Array.isArray(raw)) return raw.length ? raw.join(", ") : "—";

  // JSON-массив как строка
  if (typeof raw === "string") {
    const s = raw.trim();
    if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
      try {
        const v = JSON.parse(s);
        if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
        return v ? JSON.stringify(v) : "—";
      } catch {
        return s || "—";
      }
    }
    return s || "—";
  }

  if (typeof raw === "object") {
    try { return JSON.stringify(raw); } catch { return String(raw); }
  }
  return String(raw);
}
