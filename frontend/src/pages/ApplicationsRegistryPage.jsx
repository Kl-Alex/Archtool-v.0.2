import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import ApplicationForm from "../components/ApplicationForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, Info, Filter, XCircle, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssistantPanel from "../components/AssistantPanel";
import OwnerCombobox from "../components/OwnerCombobox";
import DomainCombobox from "../components/DomainCombobox";
import { useHotkeys } from "react-hotkeys-hook";

export default function ApplicationsRegistryPage() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  // Новое: поиск/фильтры/сортировка
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

  // Новое: подсветка изменённого/созданного
  const [highlightedId, setHighlightedId] = useState(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const createFormRef = useRef();

  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  useHotkeys("esc", () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowFilters(false);
  });

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/applications", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки приложений");
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  // Совместим сигнатуру с БС: onCreated(id?) — если форма передаст id, подсветим строку
  const handleCreatedOrUpdated = async (id) => {
    await fetchApplications();
    setShowCreateModal(false);
    setShowEditModal(false);
    if (id) {
      setHighlightedId(String(id));
      setTimeout(() => setHighlightedId(null), 5000);
    }
    notifySuccess("Приложение сохранено");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить это приложение?");
    if (!confirmed) return;

    const res = await fetch(`/api/applications/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      notifySuccess("Приложение удалено");
      fetchApplications();
    } else {
      notifyError("Ошибка удаления");
    }
  };

  // Вычисляем уникальные значения для фильтров
  const owners = [...new Set(applications.map(a => a?.owner).filter(Boolean))];
  const domains = [...new Set(applications.map(a => a?.it_domain).filter(Boolean))];

  // Фильтрация + поиск + сортировка
  const norm = (v) => (v ?? "").toString().toLowerCase();
  const matchesQuery = (app) => {
    const q = norm(search);
    if (!q) return true;
    return (
      norm(app.name).includes(q) ||
      norm(app.description).includes(q) ||
      norm(app.owner).includes(q) ||
      norm(app.it_domain).includes(q)
    );
  };

  const filtered = applications
    .filter(a => (!filterOwner || a?.owner === filterOwner))
    .filter(a => (!filterDomain || a?.it_domain === filterDomain))
    .filter(matchesQuery)
    .sort((a, b) => {
      const an = (a?.name ?? "");
      const bn = (b?.name ?? "");
      return sortAsc ? an.localeCompare(bn) : bn.localeCompare(an);
    });

  // Подсветка совпадений из БС
  const highlightMatch = (text, query) => {
    const safe = (text ?? "").toString();
    if (!query) return safe;
    const parts = safe.split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-lentaYellow text-black">{part}</mark>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 overflow-auto bg-lentaWhite">
        {/* Доп: мини-ассистент как у вас */}
        <AssistantPanel />

        {/* Заголовок и действия */}
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl font-bold text-lentaBlue">Реестр приложений</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="text-sm text-lentaBlue border border-lentaBlue rounded px-3 py-1 hover:bg-lentaBlue hover:text-white flex items-center gap-1"
              title="Сортировать по имени"
            >
              <ArrowUpDown size={16} />
              {sortAsc ? "По возр. (A→Z)" : "По убыв. (Z→A)"}
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Создать
            </button>
          </div>
        </div>

        {/* Поиск */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию, описанию, владельцу или домену"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        {/* Фильтры как в БС */}
        <div className="mb-4 flex items-start flex-wrap sm:flex-nowrap gap-2">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowFilters((prev) => !prev)}
              className="flex items-center gap-1 text-lentaBlue border border-lentaBlue px-3 py-1 rounded hover:bg-lentaBlue hover:text-white"
            >
              <Filter size={16} />
              Фильтры
            </button>

            {showFilters && (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <button
                  onClick={() => {
                    setFilterOwner("");
                    setFilterDomain("");
                    setSearch("");
                  }}
                  className="text-red-600 hover:text-red-800 transition shrink-0"
                  title="Сбросить фильтры"
                >
                  <XCircle size={20} />
                </button>

                <div className="flex-1 min-w-[150px]">
                  <OwnerCombobox
                    owners={owners}
                    selectedOwner={filterOwner}
                    setSelectedOwner={setFilterOwner}
                  />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <DomainCombobox
                    domains={domains}
                    selectedDomain={filterDomain}
                    setSelectedDomain={setFilterDomain}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Список */}
        {loading ? (
          <Spinner />
        ) : (
          <ul className="space-y-3">
            {filtered.map((app) => {
              const isHighlighted = highlightedId === String(app.id);
              return (
                <li
                  key={app.id}
                  className={`p-4 bg-white rounded-lg border shadow flex justify-between items-center group transition-colors duration-500 ${
                    isHighlighted ? "bg-lentaYellow border-yellow-400" : ""
                  }`}
                >
                  <div>
                    <div className="font-semibold text-gray-800">
                      {highlightMatch(app.name, search)}
                    </div>
                    <div className="text-xs text-gray-500">ID: {app.id}</div>
                    {(app.description || app.owner || app.it_domain) && (
                      <div className="text-xs text-lentaBlue mt-1">
                        {app.description && (
                          <span className="mr-2">
                            {highlightMatch(app.description, search)}
                          </span>
                        )}
                        {app.owner && (
                          <span className="mr-2">
                            Владелец: {highlightMatch(app.owner, search)}
                          </span>
                        )}
                        {app.it_domain && (
                          <span>
                            Домен: {highlightMatch(app.it_domain, search)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => navigate(`/applications/${app.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Паспорт приложения"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(app);
                        setShowEditModal(true);
                      }}
                      className="text-gray-500 hover:text-lentaBlue"
                      title="Редактировать"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(app.id)}
                      className="text-red-500 hover:text-red-700"
                      title="Удалить"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && (
              <li className="text-gray-500 text-sm">Нет приложений</li>
            )}
          </ul>
        )}

        {/* Модалки */}
        {showCreateModal && (
          <CreateModal
            title="Создание приложения"
            onClose={() => setShowCreateModal(false)}
            onSubmit={() => createFormRef.current && createFormRef.current.submit()}
          >
            <ApplicationForm
              ref={createFormRef}
              onCreated={handleCreatedOrUpdated} // ожидает onCreated(id?) как и в БС
            />
          </CreateModal>
        )}

{showEditModal && editingItem && (
  <EditModal
    title="Редактирование приложения"
    onClose={() => {
      setShowEditModal(false);
      setEditingItem(null);
    }}
    onSubmit={() =>
      document.getElementById("submit-app-form")?.click()
    }
  >
    <ApplicationForm
      key={editingItem?.id || "new"}   // 👈 важно
      existingData={editingItem}
      onCreated={handleCreatedOrUpdated}
    />
  </EditModal>
)}
      </main>
    </div>
  );
}
