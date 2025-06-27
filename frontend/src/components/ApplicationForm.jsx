import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";

const ApplicationForm = forwardRef(({ onCreated, existingData }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const { notifySuccess, notifyError } = useNotification();

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

    try {
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        onCreated(result.id || existingData.id);
      } else {
        notifyError(result.error || "Ошибка сохранения");
      }
    } catch (err) {
      console.error("Ошибка сети:", err);
      notifyError("Сетевая ошибка при сохранении");
    }
  };

  useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  return (
    <form className="bg-white p-6 rounded-lg shadow-sm border space-y-6">
      {attributes.map(attr => (
        <div key={attr.id} className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">{attr.display_name}</label>
          <input
            type="text"
            value={attributeValues[attr.id] || ""}
            onChange={(e) => handleAttrChange(attr.id, e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>
      ))}
    </form>
  );
});

export default ApplicationForm;
