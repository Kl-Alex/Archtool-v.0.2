import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";

const TechnologyForm = forwardRef(({ onCreated, existingData }, ref) => {
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
        const type = Array.isArray(types) ? types.find(t => t.name === "Технология") : null;
        if (!type) return;

        setObjectTypeId(type.id);

        const attrRes = await fetch(`/api/object_types/${type.id}/attributes`, {
          headers: { Authorization: `Bearer ${getToken()}` },
          credentials: "include",
        });
        const attrs = await attrRes.json();
        setAttributes(Array.isArray(attrs) ? attrs : []);

        if (existingData) {
          const valuesMap = {};
          const src =
            Array.isArray(existingData?.attribute_values)
              ? existingData.attribute_values
              : Array.isArray(existingData?.attributes)
              ? existingData.attributes
              : [];

          for (const attr of attrs) {
            const found = src.find(v => (v.attribute_id ?? v.id) === attr.id);
            if (!found) continue;

            const raw =
              found.value_text !== undefined && found.value_text !== null
                ? found.value_text
                : found.value !== undefined && found.value !== null
                ? found.value
                : "";

            if (attr.type === "select" && attr.is_multiple) {
              try {
                valuesMap[attr.id] = Array.isArray(raw) ? raw : JSON.parse(raw);
              } catch {
                valuesMap[attr.id] = Array.isArray(raw) ? raw : (raw ? [String(raw)] : []);
              }
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
    setAttributeValues(prev => ({ ...prev, [attrId]: value }));
    setErrors(prev => ({ ...prev, [attrId]: false }));
  };

  const handleSubmit = async () => {
    const payload = {
      object_type_id: objectTypeId,
      attributes: Object.entries(attributeValues).map(([attrId, value]) => {
        const attr = attributes.find(a => a.id === Number(attrId));
        const out =
          attr?.type === "select" && attr.is_multiple
            ? JSON.stringify(value ?? [])
            : value;
        return {
          attribute_id: Number(attrId),
          value: out,
        };
      }),
    };

    const url = existingData ? `/api/technologies/${existingData.id}` : `/api/technologies`;
    const method = existingData ? "PUT" : "POST";

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
      console.error("Ошибка сети:", err);
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
      {attributes.map(attr => (
        <div key={attr.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            {attr.display_name}
            {attr.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>

          <input
            type="text"
            value={attributeValues[attr.id] || ""}
            onChange={(e) => handleAttrChange(attr.id, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md text-sm ${
              errors[attr.id]
                ? "border-red-500 ring-1 ring-red-300"
                : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
            }`}
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
