import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";

const ApplicationForm = forwardRef(({ onCreated, existingData }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});
  const { notifyError } = useNotification();

useEffect(() => {
  const fetchObjectTypeAndAttributes = async () => {
    try {
      const res = await fetch("/api/object_types", {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      const types = await res.json();
      const type = Array.isArray(types) ? types.find((t) => t.name === "Приложение") : null;
      if (!type) return;

      setObjectTypeId(type.id);

      const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      });
      const attrs = await attrRes.json();
      const safeAttrs = Array.isArray(attrs) ? attrs : [];
      setAttributes(safeAttrs);

      // === ВОССТАНОВЛЕНИЕ ЗНАЧЕНИЙ В МОДАЛКЕ ===
// 3) Значения при редактировании (поддерживаем несколько форматов)
if (existingData) {
  const valuesMap = {};

  // Источник 1: массив значений [{attribute_id, value_text|value}]
  const fromArray =
    Array.isArray(existingData?.attribute_values)
      ? existingData.attribute_values
      : Array.isArray(existingData?.attributes)
      ? existingData.attributes
      : null;

  // Универсальный геттер значения для конкретного атрибута
  const pickValue = (attr) => {
    // a) из массива
    if (fromArray) {
      const found = fromArray.find((v) => (v.attribute_id ?? v.id) === attr.id);
      if (found) return found.value_text ?? found.value ?? "";
    }
    // b) из “плоского” объекта по имени атрибута
    if (existingData && attr?.name) {
      const x = existingData[attr.name];
      if (x !== undefined) {
        if (x && typeof x === "object") {
          if ("value" in x) return x.value ?? "";
          if ("value_text" in x) return x.value_text ?? "";
        }
        return x ?? "";
      }
    }
    return "";
  };

  for (const attr of safeAttrs) {
    const raw = pickValue(attr);

    if (attr.type === "select" && attr.is_multiple) {
      valuesMap[attr.id] = normalizeToArray(raw);
    } else if (attr.type === "boolean") {
      valuesMap[attr.id] =
        raw === true || raw === "true" ? true : raw === "" || raw == null ? "" : false;
    } else {
      valuesMap[attr.id] = raw;
    }
  }

  setAttributeValues(valuesMap);
}


    } catch (e) {
      console.error(e);
    }
  };

  fetchObjectTypeAndAttributes();
  // важно: реагируем на смену id записи
}, [existingData?.id]);


  const validateDate = (val) => {
    if (!val) return true;
    const v = String(val).toLowerCase().trim();
    const full = /^([0-2]\d|3[0-1])\.(0\d|1[0-2])\.\d{4}$/; // dd.mm.yyyy
    const monthYear = /^(0\d|1[0-2])\.\d{4}$/;             // mm.yyyy
    const quarter = /^q[1-4]\.\d{4}$/;                     // qn.yyyy
    const year = /^\d{4}$/;                                // yyyy
    return full.test(v) || monthYear.test(v) || quarter.test(v) || year.test(v);
  };

  const handleAttrChange = (attrId, value) => {
    setAttributeValues((prev) => ({ ...prev, [attrId]: value }));
    setErrors((prev) => ({ ...prev, [attrId]: false }));
  };

  const handleSubmit = async () => {
    // базовая валидация
    const newErrors = {};
    for (const attr of attributes) {
      const val = attributeValues[attr.id];

      if (attr.is_required) {
        const empty =
          (attr.type === "select" && attr.is_multiple && (!Array.isArray(val) || val.length === 0)) ||
          val === undefined || val === null || String(val).trim() === "";
        if (empty) newErrors[attr.id] = "Обязательное поле";
      }
      if (attr.type === "date" && val && !validateDate(val)) {
        newErrors[attr.id] = "Неверный формат даты";
      }
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      notifyError?.("Исправьте ошибки в форме");
      return false;
    }

    // универсальная сборка значений
    const attrsPayload = Object.entries(attributeValues).map(([attrIdStr, value]) => {
      const attrId = Number(attrIdStr);
      const meta = attributes.find((a) => a.id === attrId);
      let out = value;

      if (meta?.type === "select" && meta.is_multiple) {
        out = JSON.stringify(value ?? []);
      } else if (meta?.type === "boolean") {
        out = value === true || value === "true" ? "true" : value === "" ? "" : "false";
      } else {
        out = value ?? "";
      }

      return { attribute_id: attrId, value: out };
    });

    // PUT — новый формат, POST — старый
    const url = existingData ? `/api/applications/${existingData.id}` : `/api/applications`;
    const method = existingData ? "PUT" : "POST";
    const payload = existingData
      ? { attributes: attrsPayload }
      : { object_type_id: objectTypeId, attributes: attrsPayload };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      let result = {};
      try { result = await res.json(); } catch {}

      if (!res.ok) {
        notifyError?.(result?.error || `Ошибка ${res.status}`);
        return false;
      }

      onCreated?.(result.id || existingData?.id);
      return true;
    } catch (err) {
      console.error("Ошибка сети:", err);
      notifyError?.("Сетевая ошибка при сохранении");
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  return (
    <form
      className="bg-white p-6 rounded-lg shadow-sm border space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      {attributes.map((attr) => (
        <div key={attr.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            {attr.display_name || attr.name}
            {attr.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <FieldControl
            attr={attr}
            value={attributeValues[attr.id]}
            onChange={(val) => handleAttrChange(attr.id, val)}
            error={errors[attr.id]}
          />

          {errors[attr.id] && (
            <span className="text-xs text-red-600 mt-1">{String(errors[attr.id])}</span>
          )}
        </div>
      ))}

      <button id="submit-app-form" type="button" className="hidden" onClick={handleSubmit} />
    </form>
  );
});

export default ApplicationForm;

/* ===================== helper inputs — как в TechnologyForm ===================== */

function FieldControl({ attr, value, onChange, error }) {
  const opts = getOptions(attr); // нормализованные options (массив строк)
  const isMultiple = !!attr.is_multiple;

  // MULTI-SELECT
  if (attr.type === "select" && isMultiple) {
    const selected = Array.isArray(value) ? value : normalizeToArray(value);
    return (
      <MultiSelect
        options={opts}
        value={selected}
        onChange={onChange}
        error={error}
      />
    );
  }

  // SINGLE-SELECT
  if (attr.type === "select") {
    const val = value ?? "";
    return (
      <select
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
        value={val}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    );
  }

  // DATE
  if (attr.type === "date") {
    return (
      <input
        type="text"
        placeholder="дд.мм.гггг / мм.гггг / q1.2025 / 2025"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
      />
    );
  }

  // BOOLEAN
  if (attr.type === "boolean") {
    const val = value === true || value === "true";
    return (
      <select
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
        value={val ? "true" : value === "" || value == null ? "" : "false"}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "") onChange("");
          else onChange(v === "true");
        }}
      >
        <option value="">—</option>
        <option value="true">Да</option>
        <option value="false">Нет</option>
      </select>
    );
  }

  // NUMBER
  if (attr.type === "number") {
    return (
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
      />
    );
  }

  // DEFAULT (string/text)
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-md text-sm ${
        error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
      }`}
    />
  );
}

function MultiSelect({ options, value, onChange, error }) {
  const arr = Array.isArray(value) ? value : [];

  return (
    <div className="relative">
      {/* выбранные чипы */}
      <div className="flex flex-wrap gap-1 mb-1">
        {arr.map((opt) => (
          <span
            key={opt}
            className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200"
          >
            {opt}
            <button
              type="button"
              className="ml-1 font-bold"
              onClick={() => onChange(arr.filter((v) => v !== opt))}
              aria-label="Удалить"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* выпадающий чек-лист */}
      <details className="open:mb-2">
        <summary
          className={`list-none w-full px-3 py-2 border rounded-md text-sm cursor-pointer select-none ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 hover:bg-gray-50"
          }`}
        >
          Выбрать…
        </summary>
        <div className="border rounded-md p-2 max-h-48 overflow-y-auto bg-white shadow">
          {options.map((opt) => {
            const checked = arr.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...arr, opt]
                      : arr.filter((v) => v !== opt);
                    onChange(next);
                  }}
                />
                <span>{opt}</span>
              </label>
            );
          })}
        </div>
      </details>
    </div>
  );
}

function getOptions(attr) {
  if (Array.isArray(attr.options)) {
    return attr.options.map((o) => (typeof o === "string" ? o : o?.value ?? String(o)));
  }
  if (typeof attr.options === "string") {
    try {
      const parsed = JSON.parse(attr.options);
      return Array.isArray(parsed)
        ? parsed.map((o) => (typeof o === "string" ? o : o?.value ?? String(o)))
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeToArray(x) {
  if (Array.isArray(x)) return x;
  if (x == null || x === "") return [];
  try {
    const v = JSON.parse(x);
    return Array.isArray(v) ? v : [];
  } catch {
    return [String(x)];
  }
}
