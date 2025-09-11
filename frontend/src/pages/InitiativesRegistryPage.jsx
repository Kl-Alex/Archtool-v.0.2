// src/pages/InitiativesRegistryPage.jsx
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import InitiativeForm from "../components/InitiativeForm";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";
import { Pencil, Trash2, Info, Filter, XCircle, ArrowUpDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AssistantPanel from "../components/AssistantPanel";
import OwnerCombobox from "../components/OwnerCombobox";
import DomainCombobox from "../components/DomainCombobox";
import { useHotkeys } from "react-hotkeys-hook";

export default function InitiativesRegistryPage() {
  const [initiatives, setInitiatives] = useState([]);
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
  const editFormRef = useRef();

  const navigate = useNavigate();
  const { notifyError, notifySuccess } = useNotification();

  useHotkeys("esc", () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowFilters(false);
  });

  const fetchInitiatives = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/initiatives", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки инициатив");
      const data = await res.json();
      setInitiatives(Array.isArray(data) ? data : []);
    } catch (err) {
      notifyError(err.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiatives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreatedOrUpdated = async (id) => {
    await fetchInitiatives();
    setShowCreateModal(false);
    setShowEditModal(false);
    setEditingItem(null);
    if (id) {
      setHighlightedId(String(id));
      setTimeout(() => setHighlightedId(null), 5000);
    }
    notifySuccess("Инициатива сохранена");
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm("Удалить эту инициативу?");
    if (!confirmed) return;

    const res = await fetch(`/api/initiatives/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (res.ok) {
      notifySuccess("Инициатива удалена");
      fetchInitiatives();
    } else {
      notifyError("Ошибка удаления");
    }
  };

  const handleEditOpen = async (row) => {
    try {
      const res = await fetch(`/api/initiatives/${row.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Не удалось получить данные инициативы");
      const full = await res.json();
      setEditingItem(full);
      setShowEditModal(true);
    } catch (e) {
      notifyError(e.message || "Ошибка открытия");
    }
  };

  const owners  = [...new Set(initiatives.map(i => i?.owner).filter(Boolean))];
  const domains = [...new Set(initiatives.map(i => i?.it_domain).filter(Boolean))];

  const norm = (v) => (v ?? "").toString().toLowerCase();
  const matchesQuery = (i) => {
    const q = norm(search);
    if (!q) return true;
    return (
      norm(i.name).includes(q) ||
      norm(i.description).includes(q) ||
      norm(i.owner).includes(q) ||
      norm(i.it_domain).includes(q) ||
      norm(i.status).includes(q)
    );
  };

  const filtered = initiatives
    .filter(i => (!filterOwner || i?.owner === filterOwner))
    .filter(i => (!filterDomain || i?.it_domain === filterDomain))
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
          <h1 className="text-2xl font-bold text-lentaBlue">Реестр инициатив</h1>
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
            placeholder="Поиск по названию, описанию, владельцу, домену или статусу"
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
            {filtered.map((i) => {
              const isHighlighted = highlightedId === String(i.id);
              return (
                <li
                  key={i.id}
                  className={`p-4 bg-white rounded-lg border shadow flex justify-between items-center group transition-colors duration-500 ${
                    isHighlighted ? "bg-lentaYellow border-yellow-400" : ""
                  }`}
                >
                  <div>
                    <div className="font-semibold text-gray-800">
                      {highlightMatch(i.name, search)}
                    </div>
                    <div className="text-xs text-gray-500">ID: {i.id}</div>
                    {(i.description || i.owner || i.it_domain || i.status) && (
                      <div className="text-xs text-lentaBlue mt-1">
                        {i.description && (
                          <span className="mr-2">
                            {highlightMatch(i.description, search)}
                          </span>
                        )}
                        {i.status && (
                          <span className="mr-2">
                            Статус: {highlightMatch(i.status, search)}
                          </span>
                        )}
                        {i.owner && (
                          <span className="mr-2">
                            Владелец: {highlightMatch(i.owner, search)}
                          </span>
                        )}
                        {i.it_domain && (
                          <span>
                            Домен: {highlightMatch(i.it_domain, search)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      onClick={() => navigate(`/initiatives/${i.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Паспорт инициативы"
                    >
                      <Info size={18} />
                    </button>
                    <button
                      onClick={() => handleEditOpen(i)}
                      className="text-gray-500 hover:text-lentaBlue"
                      title="Редактировать"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(i.id)}
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
              <li className="text-gray-500 text-sm">Нет инициатив</li>
            )}
          </ul>
        )}

        {showCreateModal && (
          <CreateModal
            title="Создание инициативы"
            onClose={() => setShowCreateModal(false)}
            onSubmit={() => createFormRef.current && createFormRef.current.submit()}
          >
            <InitiativeForm ref={createFormRef} onCreated={handleCreatedOrUpdated} />
          </CreateModal>
        )}

        {showEditModal && editingItem && (
          <EditModal
            title="Редактирование инициативы"
            onClose={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
            onSubmit={() => editFormRef.current && editFormRef.current.submit()}
          >
            <InitiativeForm
              ref={editFormRef}
              existingData={editingItem}
              onCreated={handleCreatedOrUpdated}
            />
          </EditModal>
        )}
      </main>
    </div>
  );
}
