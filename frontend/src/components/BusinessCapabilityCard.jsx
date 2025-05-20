import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";


const BusinessCapabilityCard = ({ capability, onClose }) => {
  const [parentName, setParentName] = useState(null);

  useEffect(() => {
    const fetchParent = async () => {
      if (!capability?.parent_id) return;
      try {
const res = await fetch(`/api/business_capabilities/${capability.parent_id}`, {
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
});

        const data = await res.json();
        setParentName(data.name);
      } catch (err) {
        setParentName(null);
      }
    };
    fetchParent();
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
          <div><strong>Название:</strong> {capability.name}</div>
          <div><strong>Уровень:</strong> {capability.level}</div>
          <div><strong>Описание:</strong> {capability.description || "—"}</div>
          <div><strong>Владелец:</strong> {capability.owner}</div>
          <div><strong>Домен IT:</strong> {capability.it_domain}</div>
          <div><strong>Parent ID:</strong> {capability.parent_id || "—"}</div>
          <div><strong>Имя родителя:</strong> {parentName || "—"}</div>
          <div><strong>ID:</strong> {capability.id}</div>
        </div>
      </div>
    </div>
  );
};

export default BusinessCapabilityCard;
