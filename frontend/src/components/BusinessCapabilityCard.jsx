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
      <div className="bg-white p-6 rounded-xl w-full max-w-xl shadow-lg relative overflow-y-auto max-h-[90vh] border border-gray-200">
        {/* Закрыть */}
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-xl"
          onClick={onClose}
        >
          &times;
        </button>

        {/* Заголовок */}
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {isEditing ? "Редактирование бизнес-способности" : "Карточка бизнес-способности"}
        </h2>

        {/* Атрибуты */}
        <div className="space-y-4">
          {(details.attributes || []).map(attr => (
            <div key={attr.attribute_id} className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-600">
                {fieldLabels[attr.name] || attr.name}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
                  value={attributeValues[attr.attribute_id] || ""}
                  onChange={(e) => handleChange(attr.attribute_id, e.target.value)}
                />
              ) : (
                <div className="text-gray-800 text-sm">
                  {attr.value_text || <span className="text-gray-400">—</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Кнопки */}
        <div className="mt-6 flex justify-end gap-3 text-sm">
          {isEditing ? (
            <>
              <button
                onClick={handleSave}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Сохранить
              </button>
              <button
                onClick={() => setIsEditing(false)}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition"
              >
                Отмена
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700 transition"
              >
                Редактировать
              </button>
              <button
                onClick={onClose}
                className="bg-gray-100 text-gray-800 px-4 py-2 rounded hover:bg-gray-200 transition"
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
