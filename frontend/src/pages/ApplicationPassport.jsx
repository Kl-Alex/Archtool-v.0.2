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
      <main className="flex-1 px-6 py-8 overflow-auto">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => navigate("/applications")}
            className="mb-6 inline-flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
            Назад к списку
          </button>

          <div className="bg-white rounded-2xl shadow p-6">
            <h1 className="text-2xl font-bold text-lentaBlue mb-6">Паспорт приложения</h1>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              {Object.entries(details).map(([key, value]) => {
                const displayName = typeof value === "object" && value !== null && "displayName" in value
                  ? value.displayName
                  : key;

                const displayValue = typeof value === "object" && value !== null && "value" in value
                  ? value.value
                  : value;

                return (
                  <div key={key}>
                    <dt className="text-gray-500 font-medium">{displayName}</dt>
                    <dd className="text-gray-800">{displayValue || "—"}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      </main>
    </div>
  );
}
