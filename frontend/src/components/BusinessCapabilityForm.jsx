import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { getToken } from "../utils/auth";


const BusinessCapabilityForm = ({ onCreated, existingData }) => {
  const [formData, setFormData] = useState({
    id: existingData?.id || uuidv4(),
    name: existingData?.name || "",
    parent_name: existingData?.parent_name || "",
    parent_id: existingData?.parent_id || "",
    owner: existingData?.owner || "",
    it_domain: existingData?.it_domain || "",
    description: existingData?.description || "",
    level: existingData?.level || "L0",
  });

  const [existingCapabilities, setExistingCapabilities] = useState([]);
  const [parentSearch, setParentSearch] = useState("");
  const [filteredParents, setFilteredParents] = useState([]);

  useEffect(() => {
    const fetchCapabilities = async () => {
      const res = await fetch("/api/business_capabilities", {
  headers: {
    Authorization: `Bearer ${getToken()}`,
  },
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      description: formData.description || null,
      parent_id: formData.parent_id || null,
      parent_name: formData.parent_name || null,
    };

const url = existingData
  ? `/api/business_capabilities/${formData.id}`
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
      onCreated(formData.id);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-yellow-50 p-4 rounded shadow space-y-2 relative">
      <input
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Название"
        required
        className="w-full p-2 border rounded"
      />

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
            setFormData((prev) => ({
              ...prev,
              parent_name: "",
              parent_id: "",
              level: "L0",
            }));
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
              setFormData((prev) => ({
                ...prev,
                parent_name: cap.name,
                parent_id: cap.id,
                level: calculateLevel(cap.level),
              }));
            }}
          >
            {cap.name} ({cap.level})
          </div>
        ))}
      </div>

      <input type="hidden" name="parent_name" value={formData.parent_name} />
      <input type="hidden" name="parent_id" value={formData.parent_id} />
      <input type="hidden" name="level" value={formData.level} />

      <input
        name="owner"
        value={formData.owner}
        onChange={handleChange}
        placeholder="Владелец"
        className="w-full p-2 border rounded"
      />
      <input
        name="it_domain"
        value={formData.it_domain}
        onChange={handleChange}
        placeholder="Домен IT"
        className="w-full p-2 border rounded"
      />
      <input
        name="description"
        value={formData.description}
        onChange={handleChange}
        placeholder="Описание"
        className="w-full p-2 border rounded"
      />

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
