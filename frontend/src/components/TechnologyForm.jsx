import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";

const TechnologyForm = forwardRef(({ onCreated, existingData }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});
  const { notifyError } = useNotification();

  const authHeaders = {
    Authorization: `Bearer ${getToken()}`,
  };

  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      try {
        // 1) Тип «Технология»
        const res = await fetch("/api/object_types", {
          headers: authHeaders,
          credentials: "include",
        });
        const types = await res.json();
        const type = Array.isArray(types) ? types.find((t) => t.name === "Технология") : null;
        if (!type) return;
        setObjectTypeId(type.id);

        // 2) Атрибуты типа
        const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
          headers: authHeaders,
          credentials: "include",
        });
        const attrs = await attrRes.json();
        const list = Array.isArray(attrs) ? attrs : [];
        setAttributes(list);

        // 3) Значения при редактировании
        if (existingData) {
          const valuesMap = {};
          const src =
            Array.isArray(existingData?.attribute_values)
              ? existingData.attribute_values
              : Array.isArray(existingData?.attributes)
              ? existingData.attributes
              : [];

          for (const attr of list) {
            const found = src.find((v) => (v.attribute_id ?? v.id) === attr.id);
            if (!found) continue;

            const raw =
              found.value_text !== undefined && found.value_text !== null
                ? found.value_text
                : found.value !== undefined && found.value !== null
                ? found.value
                : "";

            if (attr.type === "select" && attr.is_multiple) {
              valuesMap[attr.id] = normalizeToArray(raw);
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
  }, [existingData]);

  const handleAttrChange = (attrId, value) => {
    setAttributeValues((prev) => ({ ...prev, [attrId]: value }));
    setErrors((prev) => ({ ...prev, [attrId]: false }));
  };

const getOptionsByAttr = (attr) => {
  if (Array.isArray(attr.options)) {
    return attr.options.map(o => typeof o === "string" ? o : (o?.value ?? String(o)));
  }
  if (typeof attr.options === "string") {
    try { 
      const p = JSON.parse(attr.options);
      return Array.isArray(p) ? p.map(o => typeof o === "string" ? o : (o?.value ?? String(o))) : [];
    } catch { return []; }
  }
  return [];
};

const handleSubmit = async () => {
  // базовая валидация обязательных
  const errs = {};
  attributes.forEach(a => {
    const v = attributeValues[a.id];
    const empty = v == null || v === "" || (a.is_multiple && Array.isArray(v) && v.length === 0);
    if (a.is_required && empty) errs[a.id] = "Обязательное поле";
  });
  if (Object.keys(errs).length) {
    setErrors(errs);
    notifyError?.("Заполните обязательные поля");
    return false;
  }

  let url, method, body;

  if (existingData?.id) {
    // === PUT: { "<attr_name>": "<string>" }
    const byName = {};
    let hasInvalid = false;

    for (const a of attributes) {
      const raw = attributeValues[a.id];
      const isEmpty = raw == null || raw === "" || (a.is_multiple && Array.isArray(raw) && raw.length === 0);
      if (!a.is_required && isEmpty) continue;

      // проверка options для select
      if (a.type === "select") {
        const opts = getOptionsByAttr(a);
        if (a.is_multiple) {
          const arr = Array.isArray(raw) ? raw : (raw ? [String(raw)] : []);
          const invalid = arr.filter(x => !opts.includes(x));
          if (invalid.length) {
            errs[a.id] = `Недопустимые значения: ${invalid.join(", ")}`;
            hasInvalid = true;
            continue;
          }
          byName[a.name] = JSON.stringify(arr);
        } else {
          if (raw !== "" && !getOptionsByAttr(a).includes(raw)) {
            errs[a.id] = `Недопустимое значение: ${String(raw)}`;
            hasInvalid = true;
            continue;
          }
          byName[a.name] = String(raw ?? "");
        }
      } else if (a.type === "boolean") {
        byName[a.name] = (raw === true || raw === "true") ? "true" : "false";
      } else {
        byName[a.name] = String(raw ?? "");
      }
    }

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, ...errs }));
      notifyError?.("Исправьте значения выделенных полей");
      return false;
    }

    url = `/api/technologies/${existingData.id}`;
    method = "PUT";
    body = JSON.stringify(byName);
  } else {
    // === POST: { object_type_id, attributes: [{attribute_id, value}] }
    const attrsPayload = [];
    let hasInvalid = false;

    for (const a of attributes) {
      const raw = attributeValues[a.id];
      const isEmpty = raw == null || raw === "" || (a.is_multiple && Array.isArray(raw) && raw.length === 0);
      if (isEmpty) continue;

      if (a.type === "select") {
        const opts = getOptionsByAttr(a);
        if (a.is_multiple) {
          const arr = Array.isArray(raw) ? raw : [String(raw)];
          const invalid = arr.filter(x => !opts.includes(x));
          if (invalid.length) {
            errs[a.id] = `Недопустимые значения: ${invalid.join(", ")}`;
            hasInvalid = true;
            continue;
          }
          attrsPayload.push({ attribute_id: a.id, value: JSON.stringify(arr) });
        } else {
          if (!opts.includes(raw)) {
            errs[a.id] = `Недопустимое значение: ${String(raw)}`;
            hasInvalid = true;
            continue;
          }
          attrsPayload.push({ attribute_id: a.id, value: String(raw) });
        }
      } else if (a.type === "boolean") {
        attrsPayload.push({ attribute_id: a.id, value: (raw === true || raw === "true") ? "true" : "false" });
      } else {
        attrsPayload.push({ attribute_id: a.id, value: String(raw) });
      }
    }

    if (hasInvalid) {
      setErrors(prev => ({ ...prev, ...errs }));
      notifyError?.("Исправьте значения выделенных полей");
      return false;
    }

    url = "/api/technologies";
    method = "POST";
    body = JSON.stringify({ object_type_id: objectTypeId, attributes: attrsPayload });
  }
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      credentials: "include",
      body,
    });

    const raw = await res.text();          // читаем сырой текст всегда
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* ignore */ }

    if (res.ok) {
      onCreated?.(parsed?.id || existingData?.id);
      return true;
    } else {
      console.error("Technology save failed", { status: res.status, body: raw });
      notifyError?.(parsed?.error || parsed?.message || raw || `HTTP ${res.status}`);
      return false;
    }
  } catch (err) {
    console.error("Сетевая ошибка при сохранении", err);
    notifyError?.("Сетевая ошибка при сохранении");
    return false;
  }
};

  useImperativeHandle(ref, () => ({
    submit: handleSubmit,
  }));

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
            onChange={(v) => handleAttrChange(attr.id, v)}
            error={errors[attr.id]}
          />

          {errors[attr.id] && (
            <span className="text-xs text-red-600 mt-1">{errors[attr.id]}</span>
          )}
        </div>
      ))}

      <button id="submit-technology-form" type="button" className="hidden" onClick={handleSubmit} />
    </form>
  );
});

export default TechnologyForm;

/* ========================= Helpers & Field ========================= */

function FieldControl({ attr, value, onChange, error }) {
  const opts = getOptions(attr); // нормализованные options (массив строк)
  const isMultiple = !!attr.is_multiple;

  // SELECT (множественный)
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

  // SELECT (одиночный)
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

  // DATE (текст с маской форматов проекта)
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
  return (
    <div className="relative">
      {/* Выбранные чипы */}
      <div className="flex flex-wrap gap-1 mb-1">
        {(value || []).map((opt) => (
          <span
            key={opt}
            className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200"
          >
            {opt}
            <button
              type="button"
              className="ml-1 font-bold"
              onClick={() => onChange(value.filter((v) => v !== opt))}
              aria-label="Удалить"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Выпадающий чек-лист */}
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
            const checked = value.includes(opt);
            return (
              <label key={opt} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={checked}
                  onChange={(e) => {
                    const next = e.target.checked
                      ? [...value, opt]
                      : value.filter((v) => v !== opt);
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
  // поддерживаем варианты: массив строк ИЛИ JSON-строка
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
    // одиночное значение → массив из одного
    return [String(x)];
  }
}
