import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const AppCapabilityForm = forwardRef(({ onCreated, existingData, notifyError }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});

  const [existingCaps, setExistingCaps] = useState([]);
  const [filteredParents, setFilteredParents] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [isParentListOpen, setIsParentListOpen] = useState(false);
  const [parentInfo, setParentInfo] = useState({
    parent_id: null,
    level: "L0",
  });

  // === helpers ===
  const authHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  const calculateLevel = (parentLevel) => {
    if (!parentLevel) return "L0";
    const m = String(parentLevel).match(/^L(\d)$/);
    return m ? `L${parseInt(m[1], 10) + 1}` : "L1";
  };

  // === load object type, attributes, existing values ===
  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      try {
        const res = await fetch("/api/object_types", { headers: authHeaders() });
        const types = await res.json();
        const type = Array.isArray(types) ? types.find((t) => t.name === "Способность приложения") : null;
        if (!type) {
          notifyError?.("Не найден тип объекта «Способность приложения»");
          return;
        }
        setObjectTypeId(type.id);

        const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
          headers: authHeaders(),
        });
        const attrs = await attrRes.json();
        setAttributes(Array.isArray(attrs) ? attrs : []);

        // Если редактирование — восстановим значения
        if (existingData && existingData.attributes) {
          const valuesMap = {};
          for (const attr of attrs) {
            const found = existingData.attributes.find((a) => a.attribute_id === attr.id);
            if (found) {
              valuesMap[attr.id] = attr.is_multiple
                ? safeParseArray(found.value_text)
                : found.value_text;
            }
          }
          setAttributeValues(valuesMap);

          setParentInfo({
            parent_id: existingData.parent_id || null,
            level: existingData.level || "L0",
          });
        }
      } catch (e) {
        notifyError?.("Ошибка инициализации формы");
      }
    };

    fetchObjectTypeAndAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingData?.id]);

  // === load existing app capabilities for parent pick ===
  useEffect(() => {
    const fetchCaps = async () => {
      try {
        const res = await fetch("/api/app_capabilities", { headers: authHeaders() });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setExistingCaps(list);
        setFilteredParents(list);
      } catch {
        setExistingCaps([]);
        setFilteredParents([]);
      }
    };
    fetchCaps();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // === events ===
  const handleAttrChange = (attrId, value) => {
    setAttributeValues((prev) => ({ ...prev, [attrId]: value }));
    setErrors((prev) => ({ ...prev, [attrId]: false }));
  };

  const handleSubmit = async () => {
    // валидация обязательных
    const newErrors = {};
    attributes.forEach((attr) => {
      if (attr.is_required && (attributeValues[attr.id] === undefined || attributeValues[attr.id] === null || attributeValues[attr.id] === "" || (attr.is_multiple && Array.isArray(attributeValues[attr.id]) && attributeValues[attr.id].length === 0))) {
        newErrors[attr.id] = true;
      }
    });
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      notifyError?.("Заполните все обязательные поля");
      return false;
    }

    const payload = {
      object_type_id: objectTypeId,
      parent_id: parentInfo.parent_id || null,
      level: parentInfo.level,
      attributes: Object.entries(attributeValues).map(([attrId, value]) => {
        const attr = attributes.find((a) => a.id === Number(attrId));
        return {
          attribute_id: Number(attrId),
          value: attr?.is_multiple ? JSON.stringify(value ?? []) : (value ?? ""),
        };
      }),
    };

    const url = existingData
      ? `/api/app_capabilities/${existingData.id}`
      : `/api/app_capabilities`;
    const method = existingData ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const result = await res.json();
      onCreated?.(result.id || existingData?.id);
      return true;
    } else {
      notifyError?.("Ошибка при сохранении");
      return false;
    }
  };

  useImperativeHandle(ref, () => ({ submit: handleSubmit }));

  // скрыть служебные
  const filteredAttributes = attributes.filter(
    (attr) => !["parent_id", "parent_name", "level"].includes(attr.name)
  );

  return (
    <form className="bg-white p-6 rounded-xl shadow border space-y-6 text-sm">
      {/* Поиск и выбор родителя */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Поиск родителя…"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100"
          value={parentSearch}
          onChange={(e) => {
            const v = e.target.value;
            setParentSearch(v);
            const q = v.toLowerCase();
            setFilteredParents(
              existingCaps.filter((cap) => (cap.name || "").toLowerCase().includes(q))
            );
          }}
        />

        <button
          type="button"
          onClick={() => setIsParentListOpen((p) => !p)}
          className="text-blue-600 hover:underline text-sm"
        >
          {isParentListOpen ? "Скрыть список родителей" : "Показать список родителей"}
        </button>

        {isParentListOpen && (
          <div className="border border-gray-200 bg-white rounded-md shadow max-h-48 overflow-y-auto z-10 text-sm">
            <div
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
              onClick={() => {
                setParentSearch("");
                setParentInfo({ parent_id: null, level: "L0" });
                setIsParentListOpen(false);
              }}
            >
              Без родителя (L0)
            </div>
            {filteredParents.map((cap) => (
              <div
                key={cap.id}
                className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => {
                  setParentSearch(cap.name);
                  setParentInfo({ parent_id: cap.id, level: calculateLevel(cap.level) });
                  setIsParentListOpen(false);
                }}
              >
                {cap.name} <span className="text-gray-400">({cap.level})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Динамические атрибуты */}
      {filteredAttributes.map((attr) => (
        <div key={attr.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            {attr.display_name || attr.name}
            {attr.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <SelectField
            attr={attr}
            value={attributeValues[attr.id]}
            onChange={(val) => handleAttrChange(attr.id, val)}
            error={errors[attr.id]}
          />
        </div>
      ))}
    </form>
  );
});

export default AppCapabilityForm;

// ===================
// Reusable SelectField
// ===================
function SelectField({ attr, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dictOptions, setDictOptions] = useState([]);
  const [loadedDictName, setLoadedDictName] = useState("");

  const isMultiple = !!attr.is_multiple;
  const selected = value ?? (isMultiple ? [] : "");

  const rawOptions = attr.options;
  const options = attr.dictionary_name
    ? dictOptions
    : Array.isArray(rawOptions)
    ? rawOptions.map((o) => (typeof o === "string" ? o : o.value))
    : typeof rawOptions === "string"
    ? safeParseArray(rawOptions)
    : [];

  // загрузка справочника
  useEffect(() => {
    const dictName =
      typeof attr.dictionary_name === "object"
        ? attr.dictionary_name?.String
        : attr.dictionary_name;

    if (dictName && loadedDictName !== dictName) {
      fetch(`/api/dictionaries/${dictName}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      })
        .then((r) => r.json())
        .then((data) => {
          const values = Array.isArray(data) ? data.map((d) => d.value) : [];
          setDictOptions(values);
          setLoadedDictName(dictName);
        })
        .catch(() => setDictOptions([]));
    }
  }, [attr.dictionary_name, loadedDictName]);

  const filtered = (options || []).filter((opt) =>
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // тип date
  if (attr.type === "date") {
    return (
      <input
        type="text"
        value={selected || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="дд.мм.гггг, мм.гггг, q1.2024, 2024"
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
      />
    );
  }

  // select multiple
  if (attr.type === "select" && isMultiple) {
    const arr = Array.isArray(selected) ? selected : safeParseArray(selected);
    return (
      <div className="relative">
        <div className="flex flex-wrap gap-1 mb-1">
          {(arr || []).map((opt) => (
            <span
              key={String(opt)}
              className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-blue-200"
            >
              {String(opt)}
              <button
                type="button"
                onClick={() => onChange(arr.filter((v) => v !== opt))}
                className="text-blue-500 hover:text-red-600 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          }`}
          placeholder="Поиск и выбор…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow max-h-48 overflow-y-auto p-2 space-y-1">
            {filtered.map((opt) => (
              <label
                key={String(opt)}
                className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={arr.includes(opt)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newValue = checked ? [...arr, opt] : arr.filter((v) => v !== opt);
                    onChange(newValue);
                  }}
                />
                <span>{String(opt)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  // select single
  if (attr.type === "select") {
    return (
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          }`}
          value={searchTerm || selected}
          placeholder="Выберите…"
          onChange={(e) => {
            setSearchTerm(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {isOpen && filtered.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-40 overflow-y-auto">
            {filtered.map((opt) => (
              <li
                key={String(opt)}
                className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                onClick={() => {
                  onChange(opt);
                  setSearchTerm(String(opt));
                  setIsOpen(false);
                }}
              >
                {String(opt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // default text
  return (
    <input
      type="text"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded-md text-sm ${
        error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
      }`}
    />
  );
}

// small util
function safeParseArray(x) {
  try {
    const v = typeof x === "string" ? JSON.parse(x) : x;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function safeText(x) {
  if (x == null) return "";
  if (typeof x === "string" || typeof x === "number" || typeof x === "boolean") return String(x);
  try { return JSON.stringify(x); } catch { return String(x); }
}
