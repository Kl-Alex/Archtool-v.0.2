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

console.log("existingData:", existingData);


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

    // ⬇ ОБНОВЛЁННАЯ ЛОГИКА
    if (existingData && existingData.attributes) {
      const valuesMap = {};
      for (const attr of attrs) {
        const found = existingData.attributes.find(a => a.attribute_id === attr.id);
        if (found) {
          valuesMap[attr.id] = found.value_text;
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
      return false; // <-- обязательно возвращать false при ошибках
    }


    const payload = {
      object_type_id: objectTypeId,
      parent_id: parentInfo.parent_id || null,
      level: parentInfo.level,
      attributes: Object.entries(attributeValues).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value
      }))
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
    <form className="bg-white p-4 rounded shadow space-y-2 relative">
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
          <input
            type="text"
            value={attributeValues[attr.id] || ""}
            onChange={(e) => handleAttrChange(attr.id, e.target.value)}
            className={`w-full p-2 border rounded ${errors[attr.id] ? "border-red-500 ring-1 ring-red-300" : "border-gray-300"
              }`}
          />
        </div>
      ))}
    </form>
  );
});

export default BusinessCapabilityForm;
