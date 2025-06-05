import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

const fieldLabels = {
  name: "Название",
  level: "Уровень",
  description: "Описание",
  owner: "Владелец",
  it_domain: "Домен IT"
};

const BusinessCapabilityCard = ({ capability, onClose, onUpdated, notifyError }) => {
  const [details, setDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attributeValues, setAttributeValues] = useState({});

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        const res = await fetch(`/api/business_capabilities/${capability.id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setDetails(data);

        const values = {};
        (data.attributes || []).forEach(attr => {
          values[attr.attribute_id] = attr.value_text;
        });
        setAttributeValues(values);
      } catch (err) {
        notifyError?.("Ошибка загрузки данных");
      }
    };

    if (capability?.id) {
      fetchDetails();
    }
  }, [capability]);

  const handleChange = (attrId, value) => {
    setAttributeValues(prev => ({ ...prev, [attrId]: value }));
  };

  const handleSave = async () => {
    const payload = {
      object_type_id: details.object_type_id,
      parent_id: details.parent_id || null,
      level: details.level,
      attributes: Object.entries(attributeValues).map(([attrId, value]) => ({
        attribute_id: parseInt(attrId),
        value
      }))
    };

    const res = await fetch(`/api/business_capabilities/${details.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const updated = await res.json();
      setIsEditing(false);
      onUpdated?.(updated.id);
    } else {
      notifyError?.("Ошибка при сохранении");
    }
  };

  if (!details) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4">
      <div className="bg-white p-6 rounded-xl w-full max-w-xl shadow-xl relative overflow-y-auto max-h-[90vh]">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-xl"
          onClick={onClose}
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-lentaBlue mb-4">
          {isEditing ? "Редактирование бизнес-способности" : "Карточка бизнес-способности"}
        </h2>

        <div className="space-y-3 text-sm text-gray-800">
          {(details.attributes || []).map(attr => (
            <div key={attr.attribute_id} className="flex flex-col">
              <label className="font-medium text-gray-600">
                {fieldLabels[attr.name] || attr.name}
              </label>
              {isEditing ? (
                <input
                  className="p-2 border rounded"
                  value={attributeValues[attr.attribute_id] || ""}
                  onChange={(e) => handleChange(attr.attribute_id, e.target.value)}
                />
              ) : (
                <div>{attr.value_text || "—"}</div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Сохранить
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Редактировать
              </button>
              <button
                onClick={onClose}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Закрыть
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessCapabilityCard;
