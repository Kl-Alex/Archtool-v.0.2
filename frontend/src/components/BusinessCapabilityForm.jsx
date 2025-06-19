import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const BusinessCapabilityForm = forwardRef(({ onCreated, existingData, notifyError }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});
  const [existingCapabilities, setExistingCapabilities] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [filteredParents, setFilteredParents] = useState([]);
  const [parentInfo, setParentInfo] = useState({
    parent_id: null,
    level: "L0",
  });

  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      const res = await fetch("/api/object_types", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const types = await res.json();
      const type = types.find(t => t.name === "Бизнес-способность");
      if (!type) return;

      setObjectTypeId(type.id);

      const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const attrs = await attrRes.json();
      setAttributes(attrs);

      if (existingData && existingData.attributes) {
        const valuesMap = {};
        for (const attr of attrs) {
          const found = existingData.attributes.find(a => a.attribute_id === attr.id);
          if (found) {
            valuesMap[attr.id] = attr.is_multiple ? JSON.parse(found.value_text) : found.value_text;
          }
        }
        setAttributeValues(valuesMap);

        setParentInfo({
          parent_id: existingData.parent_id || null,
          level: existingData.level || "L0",
        });
      }
    };

    fetchObjectTypeAndAttributes();
  }, [existingData]);

  useEffect(() => {
    const fetchCapabilities = async () => {
      const res = await fetch("/api/business_capabilities", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      setExistingCapabilities(data);
      setFilteredParents(data);
    };
    fetchCapabilities();
  }, []);

  const calculateLevel = (parentLevel) => {
    if (!parentLevel) return "L0";
    const match = parentLevel.match(/^L(\d)$/);
    if (match) {
      const next = parseInt(match[1]) + 1;
      return `L${next}`;
    }
    return "L1";
  };

  const handleAttrChange = (attrId, value) => {
    setAttributeValues(prev => ({ ...prev, [attrId]: value }));
    setErrors(prev => ({ ...prev, [attrId]: false }));
  };

  const handleSubmit = async () => {
    const newErrors = {};
    attributes.forEach(attr => {
      if (attr.is_required && !attributeValues[attr.id]) {
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
        const attr = attributes.find(a => a.id === parseInt(attrId));
        return {
          attribute_id: parseInt(attrId),
          value: attr?.is_multiple ? JSON.stringify(value) : value
        };
      })
    };

    const url = existingData
      ? `/api/business_capabilities/${existingData.id}`
      : `/api/business_capabilities`;

    const method = existingData ? "PUT" : "POST";

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
      onCreated(result.id || existingData.id);
      return true;
    } else {
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
    <form className="bg-white p-4 rounded shadow space-y-4 relative">
      {/* Поиск родителя */}
      <input
        type="text"
        placeholder="Поиск родителя..."
        className="w-full p-2 border rounded"
        value={parentSearch}
        onChange={(e) => {
          const value = e.target.value;
          setParentSearch(value);
          const query = value.toLowerCase();
          setFilteredParents(
            existingCapabilities.filter(cap => cap.name?.toLowerCase().includes(query))
          );
        }}
      />

      <div className="border rounded bg-white mt-1 max-h-48 overflow-y-auto shadow text-sm z-10 relative">
        <div
          className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
          onClick={() => {
            setParentSearch("");
            setParentInfo({ parent_id: null, level: "L0" });
          }}
        >
          Без родителя (L0)
        </div>
        {filteredParents.map((cap) => (
          <div
            key={cap.id}
            className="px-3 py-1 hover:bg-gray-100 cursor-pointer"
            onClick={() => {
              setParentSearch(cap.name);
              setParentInfo({
                parent_id: cap.id,
                level: calculateLevel(cap.level),
              });
            }}
          >
            {cap.name} ({cap.level})
          </div>
        ))}
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

function SelectField({ attr, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const options = attr.options || [];
  const isMultiple = attr.is_multiple;
  const selected = value || (isMultiple ? [] : "");

  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // 💬 Множественный выбор с поиском
  if (attr.type === "select" && isMultiple) {
    return (
      <div className="relative">
        <div
          className="flex flex-wrap gap-1 mb-1"
        >
          {selected.map((opt) => (
            <span
              key={opt}
              className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1"
            >
              {opt}
              <button
                type="button"
                onClick={() => onChange(selected.filter((v) => v !== opt))}
                className="text-red-500 hover:text-red-700 font-bold"
              >
                ×
              </button>
            </span>
          ))}
        </div>

        <input
          type="text"
          className={`w-full p-2 border rounded ${error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300"}`}
          placeholder="Поиск и выбор..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />

        {isOpen && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full border rounded bg-white shadow max-h-48 overflow-y-auto p-2 space-y-1">
            {filtered.map((opt) => (
              <label key={opt} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="form-checkbox h-4 w-4 text-blue-600"
                  value={opt}
                  checked={selected.includes(opt)}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    const newValue = checked
                      ? [...selected, opt]
                      : selected.filter((v) => v !== opt);
                    onChange(newValue);
                  }}
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 🔹 Одиночный выбор с автоподсказками
  if (attr.type === "select") {
    return (
      <div className="relative">
        <input
          type="text"
          className={`w-full p-2 border rounded ${error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300"}`}
          value={searchTerm || selected}
          placeholder="Выберите..."
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
                key={opt}
                className="px-3 py-1 hover:bg-blue-100 cursor-pointer text-sm"
                onClick={() => {
                  onChange(opt);
                  setSearchTerm(opt);
                  setIsOpen(false);
                }}
              >
                {opt}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  // 🔸 Строковые и другие типы
  return (
    <input
      type="text"
      value={selected}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full p-2 border rounded ${error ? "border-red-500 ring-1 ring-red-300" : "border-gray-300"}`}
    />
  );
}
