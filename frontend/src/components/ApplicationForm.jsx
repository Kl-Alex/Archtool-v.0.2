import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const ApplicationForm = forwardRef(({ onCreated, existingData }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});

  useEffect(() => {
    const fetchObjectTypeAndAttributes = async () => {
      const res = await fetch("/api/object_types", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const types = await res.json();
      const type = types.find(t => t.name === "Приложение");
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
      }
    };

    fetchObjectTypeAndAttributes();
  }, [existingData]);

  const handleAttrChange = (attrId, value) => {
    setAttributeValues(prev => ({ ...prev, [attrId]: value }));
  };

  const handleSubmit = async () => {
    const payload = {
      object_type_id: objectTypeId,
      attributes: Object.entries(attributeValues).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value
      }))
    };

    const url = existingData
      ? `/api/applications/${existingData.id}`
      : `/api/applications`;

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

  useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  return (
    <form className="bg-white p-4 rounded shadow space-y-4">
      {attributes.map(attr => (
        <div key={attr.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">{attr.display_name}</label>
          <input
            type="text"
            value={attributeValues[attr.id] || ""}
            onChange={(e) => handleAttrChange(attr.id, e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>
      ))}
    </form>
  );
});

export default ApplicationForm;
