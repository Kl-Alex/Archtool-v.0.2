import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";
import BusinessCapabilityForm from "./BusinessCapabilityForm"; // Импортируем форму

const fieldLabels = {
  id: "ID",
  name: "Название",
  level: "Уровень",
  description: "Описание",
  owner: "Владелец",
  it_domain: "Домен IT",
  parent_id: "ID родителя",
  parent_name: "Имя родителя",
};

const BusinessCapabilityCard = ({ capability, onClose, onUpdated, notifyError }) => {
  const [details, setDetails] = useState({});
  const [parentName, setParentName] = useState(null);
  const [isEditing, setIsEditing] = useState(false); // ⬅ режим редактирования
  const [formKey, setFormKey] = useState(0); // хак для сброса формы при смене capability

  useEffect(() => {
    const fetchDetails = async () => {
      if (!capability?.id) return;

      try {
        const res = await fetch(`/api/business_capabilities/${capability.id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setDetails(data);
        setFormKey(prev => prev + 1); // сброс формы при обновлении

        if (data.parent_id) {
          const parentRes = await fetch(`/api/business_capabilities/${data.parent_id}`, {
            headers: { Authorization: `Bearer ${getToken()}` },
          });
          const parentData = await parentRes.json();
          setParentName(parentData.name || null);
        }
      } catch (err) {
        console.error("Ошибка загрузки карточки:", err);
      }
    };

    fetchDetails();
  }, [capability]);

  if (!capability) return null;

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

        {!isEditing ? (
          <>
            <div className="space-y-2 text-sm text-gray-800">
              {Object.entries(details).map(([key, value]) => {
                if (key === "parent_id") return null;
                const label = fieldLabels[key] || key;
                return (
                  <div key={key}>
                    <strong>{label}:</strong> {value || "—"}
                  </div>
                );
              })}
              {"parent_id" in details && (
                <div>
                  <strong>{fieldLabels["parent_name"]}:</strong> {parentName || "—"}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2">
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
            </div>
          </>
        ) : (
          <BusinessCapabilityForm
            key={formKey}
            existingData={details}
            onCreated={(id) => {
              onUpdated?.(id);
              setIsEditing(false); // выход из режима редактирования
            }}
            notifyError={notifyError}
          />
        )}
      </div>
    </div>
  );
};

export default BusinessCapabilityCard;
