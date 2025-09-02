import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import TechnologyForm from "../components/TechnologyForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, Info, Filter, XCircle, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssistantPanel from "../components/AssistantPanel";
import OwnerCombobox from "../components/OwnerCombobox";
import DomainCombobox from "../components/DomainCombobox";
import { useHotkeys } from "react-hotkeys-hook";

export default function TechnologiesRegistryPage() {
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [sortAsc, setSortAsc] = useState(true);

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

  const fetchTechnologies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/technologies", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки технологий");
      const data = await res.json();
      setTechnologies(Array.isArray(data) ? data : []);
    } catch (err) {
      notifyError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTechnologies();
  }, []);

  const handleCreatedOrUpdated = async (id) => {
    await fetchTechnologies();
    setShowCreateModal(false);
    setShowEditModal(false);
    if (id) {
      setHighlightedId(String(id));
      setTimeout(() => setHighlightedId(null), 5000);
    }
    notifySuccess("Технология сохранена");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить эту технологию?");
    if (!confirmed) return;

    const res = await fetch(`/api/technologies/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      notifySuccess("Технология удалена");
      fetchTechnologies();
    } else {
      notifyError("Ошибка удаления");
    }
  };

  const owners = [...new Set(technologies.map(t => t?.owner).filter(Boolean))];
  const domains = [...new Set(technologies.map(t => t?.it_domain).filter(Boolean))];

  const norm = (v) => (v ?? "").toString().toLowerCase();
  const matchesQuery = (t) => {
    const q = norm(search);
    if (!q) return true;
    return (
      norm(t.name).includes(q) ||
      norm(t.description).includes(q) ||
      norm(t.owner).includes(q) ||
      norm(t.it_domain).includes(q)
    );
  };

  const filtered = technologies
    .filter(t => (!filterOwner || t?.owner === filterOwner))
    .filter(t => (!filterDomain || t?.it_domain === filterDomain))
    .filter(matchesQuery)
    .sort((a, b) => {
      const an = (a?.name ?? "");
      const bn = (b?.name ?? "");
      return sortAsc ? an.localeCompare(bn) : bn.localeCompare(an);
    });

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
        <AssistantPanel />

        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl font-bold text-lentaBlue">Реестр технологий</h1>
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

        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию, описанию, владельцу или домену"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

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

        {loading ? (
          <Spinner />
        ) : (
          <ul className="space-y-3">
            {filtered.map((t) => {
              const isHighlighted = highlightedId === String(t.id);
              return (
                <li
                  key={t.id}
                  className={`p-4 bg-white rounded-lg border shadow flex justify-between items-center group transition-colors duration-500 ${
                    isHighlighted ? "bg-lentaYellow border-yellow-400" : ""
                  }`}
                >
                  <div>
                    <div className="font-semibold text-gray-800">
                      {highlightMatch(t.name, search)}
                    </div>
                    <div className="text-xs text-gray-500">ID: {t.id}</div>
                    {(t.description || t.owner || t.it_domain) && (
                      <div className="text-xs text-lentaBlue mt-1">
                        {t.description && (
                          <span className="mr-2">
                            {highlightMatch(t.description, search)}
                          </span>
                        )}
                        {t.owner && (
                          <span className="mr-2">
                            Владелец: {highlightMatch(t.owner, search)}
                          </span>
                        )}
                        {t.it_domain && (
                          <span>
                            Домен: {highlightMatch(t.it_domain, search)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => navigate(`/technologies/${t.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Паспорт технологии"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingItem(t);
                        setShowEditModal(true);
                      }}
                      className="text-gray-500 hover:text-lentaBlue"
                      title="Редактировать"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
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
              <li className="text-gray-500 text-sm">Нет технологий</li>
            )}
          </ul>
        )}

        {showCreateModal && (
          <CreateModal
            title="Создание технологии"
            onClose={() => setShowCreateModal(false)}
            onSubmit={() => createFormRef.current && createFormRef.current.submit()}
          >
            <TechnologyForm ref={createFormRef} onCreated={handleCreatedOrUpdated} />
          </CreateModal>
        )}

        {showEditModal && editingItem && (
          <EditModal
            title="Редактирование технологии"
            onClose={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
            onSubmit={() => document.getElementById("submit-technology-form")?.click()}
          >
            <TechnologyForm existingData={editingItem} onCreated={handleCreatedOrUpdated} />
          </EditModal>
        )}
      </main>
    </div>
  );
}
