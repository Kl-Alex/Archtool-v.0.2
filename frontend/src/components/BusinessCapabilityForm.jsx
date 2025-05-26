import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

const BusinessCapabilityForm = ({ onCreated, existingData }) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
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

      if (existingData && existingData.attribute_values) {
        const valuesMap = {};
        existingData.attribute_values.forEach(v => {
          valuesMap[v.attribute_id] = v.value;
        });
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

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
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 p-4 rounded shadow space-y-2 relative">
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
      {attributes.map(attr => (
        <input
          key={attr.id}
          type="text"
          value={attributeValues[attr.id] || ""}
          onChange={(e) => handleAttrChange(attr.id, e.target.value)}
          placeholder={attr.name}
          className="w-full p-2 border rounded"
        />
      ))}

      <button
        id="submit-bc-form"
        type="submit"
        className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Сохранить
      </button>
    </form>
  );
};

export default BusinessCapabilityForm;
