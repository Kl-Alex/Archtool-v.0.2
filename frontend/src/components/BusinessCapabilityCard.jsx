import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

// Словарь отображаемых названий
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

const BusinessCapabilityCard = ({ capability, onClose }) => {
  const [details, setDetails] = useState({});
  const [parentName, setParentName] = useState(null);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!capability?.id) return;

      try {
        const res = await fetch(`/api/business_capabilities/${capability.id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setDetails(data);

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
      <div className="bg-white p-6 rounded-xl w-full max-w-xl shadow-xl relative">
        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-red-500 text-xl"
          onClick={onClose}
        >
          &times;
        </button>

        <h2 className="text-xl font-bold text-lentaBlue mb-4">Карточка бизнес-способности</h2>

        <div className="space-y-2 text-sm text-gray-800">
          {Object.entries(details).map(([key, value]) => {
            if (key === "parent_id") return null; // отдельно
            const label = fieldLabels[key] || key;
            return (
              <div key={key}>
                <strong>{label}:</strong> {value || "—"}
              </div>
            );
          })}

          {/* Имя родителя отдельно
          {"parent_id" in details && (
            <div>
              <strong>{fieldLabels["parent_name"]}:</strong> {parentName || "—"}
            </div>
          )} */}
        </div>
      </div>
    </div>
  );
};

export default BusinessCapabilityCard;
