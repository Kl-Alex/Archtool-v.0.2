import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getToken } from "../utils/auth";
import Sidebar from "../components/Sidebar";
import { ArrowLeft } from "lucide-react";

export default function ApplicationPassportPage() {
  const { id } = useParams();
  const [details, setDetails] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/applications/${id}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setDetails(data);
      } catch (err) {
        console.error("Ошибка при загрузке паспорта:", err);
      }
    };

    fetchData();
  }, [id]);

  if (!details) {
    return <div className="p-6 text-gray-600">Загрузка...</div>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 p-6">
        <button
          onClick={() => navigate("/applications")}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 bg-lentaBlue text-white rounded hover:bg-blue-800"
        >
          <ArrowLeft size={18} />
          Назад
        </button>

        <div className="bg-white p-6 rounded-2xl shadow-xl max-w-screen-md mx-auto">
          <h1 className="text-2xl font-bold text-lentaBlue mb-6">Паспорт приложения</h1>

          <div className="grid gap-3 text-sm text-gray-800">
            {Object.entries(details).map(([key, value]) => {
              if (typeof value === "object" && value !== null && "displayName" in value) {
                return (
                  <div key={key} className="flex">
                    <span className="font-semibold min-w-[140px]">{value.displayName}:</span>
                    <span>{value.value || "—"}</span>
                  </div>
                );
              }

              return (
                <div key={key} className="flex">
                  <span className="font-semibold min-w-[140px]">{key}:</span>
                  <span>{value || "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
