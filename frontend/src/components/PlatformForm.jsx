import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const PlatformForm = forwardRef(({ onCreated, existingData, notifyError }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});

  // Загружаем object_type_id для "Платформа" и её атрибуты
  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      try {
        const res = await fetch("/api/object_types", {
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: "include",
        });
        const types = await res.json();
        const type = Array.isArray(types) ? types.find((t) => t.name === "Платформа") : null;
        if (!type) return;

        setObjectTypeId(type.id);

        const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: "include",
        });
        const attrs = await attrRes.json();
        const safeAttrs = Array.isArray(attrs) ? attrs : [];
        setAttributes(safeAttrs);

        // Восстанавливаем значения из existingData.attributes (единый контракт)
        if (existingData && Array.isArray(existingData.attributes)) {
          const valuesMap = {};
          for (const attr of safeAttrs) {
            const found = existingData.attributes.find((a) => a.attribute_id === attr.id);
            if (!found) continue;

            const raw = found.value_text ?? found.value ?? "";

            if (attr.type === "select" && attr.is_multiple) {
              try {
                valuesMap[attr.id] = Array.isArray(raw) ? raw : JSON.parse(raw);
              } catch {
                valuesMap[attr.id] = Array.isArray(raw) ? raw : raw ? [String(raw)] : [];
              }
            } else {
              valuesMap[attr.id] = raw;
            }
          }
          setAttributeValues(valuesMap);
        }
      } catch (e) {
        console.error("Ошибка загрузки типа/атрибутов:", e);
      }
    };

    fetchObjectTypeAndAttributes();
  }, [existingData]);

  const handleAttrChange = (attrId, value) => {
    setAttributeValues((prev) => ({ ...prev, [attrId]: value }));
    setErrors((prev) => ({ ...prev, [attrId]: false }));
  };

  // Проверка форматов даты (совпадает с бэкендом)
  const validateDate = (val) => {
    if (!val) return true;
    const v = String(val).toLowerCase().trim();
    const full = /^([0-2]\d|3[0-1])\.(0\d|1[0-2])\.\d{4}$/; // dd.mm.yyyy
    const monthYear = /^(0\d|1[0-2])\.\d{4}$/;             // mm.yyyy
    const quarter = /^q[1-4]\.\d{4}$/;                     // qn.yyyy
    const year = /^\d{4}$/;                                // yyyy
    return full.test(v) || monthYear.test(v) || quarter.test(v) || year.test(v);
  };

  const handleSubmit = async () => {
    // Required + локальная проверка дат
    const newErrors = {};
    for (const attr of attributes) {
      const val = attributeValues[attr.id];

      if (attr.is_required) {
        const empty =
          (attr.type === "select" && attr.is_multiple && (!Array.isArray(val) || val.length === 0)) ||
          val === undefined ||
          val === null ||
          String(val).trim() === "";
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

    // Готовим массив атрибутов один раз
    const attrsPayload = Object.entries(attributeValues).map(([attrId, value]) => {
      const meta = attributes.find((a) => a.id === Number(attrId));
      const out = meta?.type === "select" && meta.is_multiple
        ? JSON.stringify(value ?? [])
        : value;
      return { attribute_id: Number(attrId), value: out };
    });

    // POST — старый контракт; PUT — только attributes
    const url = existingData ? `/api/platforms/${existingData.id}` : `/api/platforms`;
    const method = existingData ? "PUT" : "POST";
    const payload = existingData
      ? { attributes: attrsPayload } // 🔁 новый формат для update
      : { object_type_id: objectTypeId, attributes: attrsPayload }; // ✅ старый формат для create

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

      const result = await res.json().catch(() => ({}));

      if (res.ok) {
        onCreated?.(result.id || existingData?.id);
        return true;
      } else {
        notifyError?.(result?.error || "Ошибка сохранения");
        return false;
      }
    } catch (err) {
      console.error("Сетевая ошибка при сохранении:", err);
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
            {attr.display_name}
            {attr.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <SelectField
            attr={attr}
            value={attributeValues[attr.id]}
            onChange={(val) => handleAttrChange(attr.id, val)}
            error={!!errors[attr.id]}
            helperText={errors[attr.id]}
          />
        </div>
      ))}

      {/* Скрытая кнопка для программного submit */}
      <button id="submit-platform-form" type="button" className="hidden" onClick={handleSubmit} />
    </form>
  );
});

export default PlatformForm;

/* ========= helper input ========= */

function SelectField({ attr, value, onChange, error, helperText }) {
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
      : typeof rawOptions === "string" && rawOptions.trim()
        ? safeParseArray(rawOptions)
        : [];

  // Подтягиваем справочник по имени, если указан
  useEffect(() => {
    const dictName =
      typeof attr.dictionary_name === "object"
        ? attr.dictionary_name?.String
        : attr.dictionary_name;

    if (dictName && loadedDictName !== dictName) {
      fetch(`/api/dictionaries/${encodeURIComponent(dictName)}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data) => {
          const values = Array.isArray(data)
            ? data.map((d) => (typeof d === "string" ? d : d.value))
            : [];
          setDictOptions(values);
          setLoadedDictName(dictName);
        })
        .catch((err) => {
          console.error("Ошибка загрузки справочника:", err);
          setDictOptions([]);
        });
    }
  }, [attr.dictionary_name, loadedDictName]);

  const filtered = options.filter((opt) =>
    String(opt).toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (attr.type === "date") {
    return (
      <>
        <input
          type="text"
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          placeholder="дд.мм.гггг, мм.гггг, q1.2024, 2024"
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          }`}
        />
        {helperText && <span className="text-xs text-red-600 mt-1">{helperText}</span>}
      </>
    );
  }

  if (attr.type === "select" && isMultiple) {
    return (
      <div className="relative">
        <div className="flex flex-wrap gap-1 mb-1">
          {Array.isArray(selected) &&
            selected.map((opt) => (
              <span
                key={String(opt)}
                className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1 border border-blue-200"
              >
                {String(opt)}
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((v) => v !== opt))}
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
        {helperText && <span className="text-xs text-red-600 mt-1 block">{helperText}</span>}

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
                  checked={Array.isArray(selected) && selected.includes(opt)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newValue = checked
                      ? [...(selected || []), opt]
                      : (selected || []).filter((v) => v !== opt);
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

  if (attr.type === "select") {
    // Single-select — сохраняем только по клику из списка
    return (
      <div className="relative">
        <input
          type="text"
          className={`w-full px-3 py-2 border rounded-md text-sm ${
            error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          }`}
          value={searchTerm || (selected ?? "")}
          placeholder="Выберите…"
          onChange={(e) => {
            setSearchTerm(e.target.value); // это поиск, не сохраняем значение
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            setTimeout(() => setIsOpen(false), 150);
            if (searchTerm && !options.some((o) => String(o) === searchTerm)) {
              setSearchTerm(""); // откат к сохранённому selected
            }
          }}
        />
        {helperText && <span className="text-xs text-red-600 mt-1 block">{helperText}</span>}

        {isOpen && filtered.length > 0 && (
          <ul className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-40 overflow-y-auto">
            {filtered.map((opt) => (
              <li
                key={String(opt)}
                className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                onClick={() => {
                  onChange(opt);                 // сохраняем только здесь
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

  // Текстовое поле по умолчанию
  return (
    <>
      <input
        type="text"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded-md text-sm ${
          error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
        }`}
      />
      {helperText && <span className="text-xs text-red-600 mt-1">{helperText}</span>}
    </>
  );
}

function safeParseArray(str) {
  try {
    const v = JSON.parse(str);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
