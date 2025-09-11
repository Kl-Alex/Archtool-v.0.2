import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const BusinessCapabilityForm = forwardRef(({ onCreated, existingData, notifyError }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});
  const [existingCapabilities, setExistingCapabilities] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [isParentListOpen, setIsParentListOpen] = useState(false);
  const [filteredParents, setFilteredParents] = useState([]);
  const [parentInfo, setParentInfo] = useState({
    parent_id: null,
    level: "L0",
  });

  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      try {
        const res = await fetch("/api/object_types", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const types = await res.json();
        const type = Array.isArray(types) ? types.find(t => t.name === "Бизнес-способность") : null;
        if (!type) return;

        setObjectTypeId(type.id);

        const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const attrs = await attrRes.json();
        const safeAttrs = Array.isArray(attrs) ? attrs : [];
        setAttributes(safeAttrs);

        // восстановление значений при редактировании
        if (existingData && Array.isArray(existingData.attributes)) {
          const valuesMap = {};
          for (const attr of safeAttrs) {
            const found = existingData.attributes.find(a => (a.attribute_id ?? a.id) === attr.id);
            if (!found) continue;
            const raw =
              found.value_text !== undefined && found.value_text !== null
                ? found.value_text
                : found.value !== undefined && found.value !== null
                ? found.value
                : "";

            valuesMap[attr.id] = attr.is_multiple ? safeParseArray(raw) : raw ?? "";
          }
          setAttributeValues(valuesMap);

          setParentInfo({
            parent_id: existingData.parent_id || null,
            level: existingData.level || "L0",
          });
        }
      } catch {
        notifyError?.("Ошибка инициализации формы");
      }
    };

    fetchObjectTypeAndAttributes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingData?.id]);

  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const res = await fetch("/api/business_capabilities", {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        setExistingCapabilities(list);
        setFilteredParents(list);
      } catch {
        setExistingCapabilities([]);
        setFilteredParents([]);
      }
    };
    fetchCapabilities();
  }, []);

  const calculateLevel = (parentLevel) => {
    if (!parentLevel) return "L0";
    const match = String(parentLevel).match(/^L(\d)$/);
    if (match) {
      const next = parseInt(match[1], 10) + 1;
      return `L${next}`;
    }
    return "L1";
  };

  const handleAttrChange = (attrId, value) => {
    setAttributeValues(prev => ({ ...prev, [attrId]: value }));
    setErrors(prev => ({ ...prev, [attrId]: false }));
  };

  const handleSubmit = async () => {
    // валидация обязательных
    const newErrors = {};
    attributes.forEach(attr => {
      const v = attributeValues[attr.id];
      const empty =
        v === undefined || v === null || v === "" ||
        (attr.is_multiple && Array.isArray(v) && v.length === 0);
      if (attr.is_required && empty) newErrors[attr.id] = true;
    });

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      notifyError?.("Заполните все обязательные поля");
      return false;
    }

    // собираем массив атрибутов один раз
    const attrsPayload = Object.entries(attributeValues).map(([attrId, value]) => {
      const meta = attributes.find(a => a.id === Number(attrId));
      return {
        attribute_id: Number(attrId),
        value: meta?.is_multiple ? JSON.stringify(value ?? []) : (value ?? "")
      };
    });

    const url = existingData
      ? `/api/business_capabilities/${existingData.id}`
      : `/api/business_capabilities`;
    const method = existingData ? "PUT" : "POST";

    // 🔁 PUT — новый формат: только attributes (+ parent_id/level по желанию)
    // 🟢 POST — старый формат: object_type_id + parent + level + attributes
    const payload = existingData
      ? {
          attributes: attrsPayload,
          parent_id: parentInfo.parent_id ?? null,
          level: parentInfo.level,
        }
      : {
          object_type_id: objectTypeId,
          parent_id: parentInfo.parent_id ?? null,
          level: parentInfo.level,
          attributes: attrsPayload,
        };

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        onCreated?.(result.id || existingData?.id);
        return true;
      } else {
        let msg = "Ошибка при сохранении";
        try {
          const j = await res.json();
          msg = j?.error || j?.message || msg;
        } catch {/* ignore */}
        notifyError?.(msg);
        return false;
      }
    } catch {
      notifyError?.("Сетевая ошибка");
      return false;
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  const filteredAttributes = attributes.filter(
    attr => !["parent_id", "parent_name", "level"].includes(attr.name)
  );

  return (
    <form className="bg-white p-6 rounded-xl shadow border space-y-6 text-sm">
      {/* Поиск родителя */}
      <div className="space-y-2">
        <input
          type="text"
          placeholder="Поиск родителя..."
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-100"
          value={parentSearch}
          onChange={(e) => {
            const value = e.target.value;
            setParentSearch(value);
            const q = value.toLowerCase();
            setFilteredParents(
              existingCapabilities.filter(cap => (cap.name || "").toLowerCase().includes(q))
            );
          }}
        />

        <button
          type="button"
          onClick={() => setIsParentListOpen((prev) => !prev)}
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
                  setParentInfo({
                    parent_id: cap.id,
                    level: calculateLevel(cap.level),
                  });
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
      {filteredAttributes.map(attr => (
        <div key={attr.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            {attr.display_name}
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

export default BusinessCapabilityForm;

/* ======================= SelectField ======================= */

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
      ? rawOptions.map(o => (typeof o === "string" ? o : o?.value))
      : typeof rawOptions === "string"
        ? safeParseArray(rawOptions)
        : [];

  // загрузка справочника
  useEffect(() => {
    const dictName = typeof attr.dictionary_name === "object"
      ? attr.dictionary_name?.String
      : attr.dictionary_name;

    if (dictName && loadedDictName !== dictName) {
      fetch(`/api/dictionaries/${encodeURIComponent(dictName)}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
        .then(res => res.json())
        .then(data => {
          const values = Array.isArray(data)
            ? data.map(d => (typeof d === "string" ? d : d?.value))
            : [];
          setDictOptions(values);
          setLoadedDictName(dictName);
        })
        .catch(() => setDictOptions([]));
    }
  }, [attr.dictionary_name, loadedDictName]);

  const filtered = (options || []).filter((opt) =>
    String(opt).toLowerCase().includes(String(searchTerm).toLowerCase())
  );

  // multiple select
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
          placeholder="Поиск и выбор..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsParentListOpenTrue(setIsOpen)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow max-h-48 overflow-y-auto p-2 space-y-1">
            {filtered.map((opt) => (
              <label key={String(opt)} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  checked={arr.includes(opt)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const next = checked ? [...arr, opt] : arr.filter((v) => v !== opt);
                    onChange(next);
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

  // single select
  if (attr.type === "select") {
    return (
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          }`}
          value={searchTerm || (selected ?? "")}
          placeholder="Выберите..."
          onChange={(e) => {
            setSearchTerm(e.target.value);
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

/* ======================= helpers ======================= */

function safeParseArray(x) {
  try {
    const v = typeof x === "string" ? JSON.parse(x) : x;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// маленький хелпер, чтобы не ругался линтер на инлайн-колбэк
function setIsParentListOpenTrue(setter) {
  setter(true);
}
