// src/pages/AppCapabilitiesRegistryPage.jsx
import { useEffect, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import { Trash2, Info, Pencil, XCircle, Filter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import LevelCombobox from "../components/LevelCombobox";
import OwnerCombobox from "../components/OwnerCombobox";
import DomainCombobox from "../components/DomainCombobox";
import { useNotification } from "../components/NotificationContext";
import { getToken } from "../utils/auth";
import { useNavigate } from "react-router-dom";

// форма способностей приложений
import ApplicationCapabilityForm from "../components/AppCapabilityForm";

const AppCapabilitiesRegistryPage = () => {
  const [capabilities, setCapabilities] = useState([]);
  const [treeData, setTreeData] = useState([]);
  const [search, setSearch] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const [loading, setLoading] = useState(false);
  const [expandAll, setExpandAll] = useState(false);
  const [highlightedId, setHighlightedId] = useState(null);
  const [openMap, setOpenMap] = useState({});

  const [filterLevel, setFilterLevel] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [sortAsc, setSortAsc] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const createFormRef = useRef();
  const editFormRef = useRef();

  const { notifyError, notifySuccess } = useNotification();
  const nav = useNavigate();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/app_capabilities", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка загрузки данных");
      const data = await res.json();
      setCapabilities(Array.isArray(data) ? data : []);

      const collapsedMap = {};
      (Array.isArray(data) ? data : []).forEach((item) => {
        collapsedMap[item.id] = false;
      });
      setOpenMap(collapsedMap);

      setTreeData(
        buildTreeFromList(Array.isArray(data) ? data : [], {
          level: filterLevel,
          owner: filterOwner,
          domain: filterDomain,
          sortAsc,
        })
      );
    } catch (e) {
      notifyError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLevel, filterOwner, filterDomain, sortAsc]);

  const buildTreeFromList = (list, filters) => {
    const { level, owner, domain, sortAsc } = filters;
    const map = new Map();
    const roots = [];

    const filtered = list.filter(
      (item) =>
        (!level || item.level === level) &&
        (!owner || item.owner === owner) &&
        (!domain || item.it_domain === domain)
    );

    filtered.forEach((item) => {
      const id = String(item.id).trim();
      map.set(id, { ...item, id, children: [] });
    });

    map.forEach((item) => {
      const parentId =
        item.parent_id !== undefined && item.parent_id !== null
          ? String(item.parent_id).trim()
          : "";
      if (parentId && parentId !== item.id && map.has(parentId)) {
        map.get(parentId).children.push(item);
      } else {
        roots.push(item);
      }
    });

    const sortByName = (a, b) =>
      sortAsc
        ? (a.name ?? "").localeCompare(b.name ?? "")
        : (b.name ?? "").localeCompare(a.name ?? "");

    const sortTree = (nodes) =>
      nodes
        .sort(sortByName)
        .map((node) => ({ ...node, children: sortTree(node.children || []) }));

    return sortTree(roots);
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;
    const parts = String(text || "").split(new RegExp(`(${query})`, "gi"));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-lentaYellow text-black">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  const handleCreatedOrUpdated = async (id) => {
    const prevOpen = { ...openMap };
    await fetchData();
    setOpenMap(prevOpen);
    setHighlightedId(String(id));
    notifySuccess("Способность приложения сохранена");
    setTimeout(() => setHighlightedId(null), 5000);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Удалить эту способность приложения?")) return;
    try {
      const res = await fetch(`/api/app_capabilities/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка при удалении");
      notifySuccess("Удалено");
      fetchData();
    } catch (e) {
      notifyError(e.message || "Ошибка при удалении");
    }
  };

  const handleEdit = async (node) => {
    try {
      const res = await fetch(`/api/app_capabilities/${node.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error("Ошибка при загрузке данных");
      const fullData = await res.json();
      setEditingItem(fullData);
      setShowEditModal(true);
    } catch {
      notifyError("Не удалось загрузить данные для редактирования");
    }
  };

  const TreeNode = ({ node, depth, query, highlightedId }) => {
    const open = openMap[node.id] ?? true;
    const hasChildren = node.children?.length > 0;

    const toggleOpen = () => {
      setOpenMap((prev) => ({ ...prev, [node.id]: !open }));
    };

    const matchesQuery = (cap) => {
      const q = query.toLowerCase();
      return (
        (cap.name || "").toLowerCase().includes(q) ||
        (cap.description || "").toLowerCase().includes(q) ||
        (cap.owner || "").toLowerCase().includes(q) ||
        (cap.it_domain || "").toLowerCase().includes(q) ||
        (cap.application_name || "").toLowerCase().includes(q)
      );
    };

    const shouldRender =
      query === "" || matchesQuery(node) || node.children?.some(matchesQuery);
    if (!shouldRender) return null;

    return (
      <div className="ml-[20px] mt-2">
        <div className="flex space-x-2 items-start">
          <div className="w-5 flex justify-center mt-1">
            {hasChildren && (
              <button onClick={toggleOpen} className="text-gray-500 hover:text-lentaBlue">
                {open ? "▼" : "▶"}
              </button>
            )}
          </div>

          <div
            className={`p-3 rounded shadow border flex-1 transition-colors duration-500 group ${
              String(highlightedId) === String(node.id)
                ? "bg-lentaYellow border-yellow-400"
                : "bg-white"
            }`}
          >
            <div className="flex justify-between">
              <div className="flex items-start">
                {depth > 0 && <span className="text-gray-400 mr-1 mt-1">↳</span>}
                <div>
                  <div className="font-semibold">
                    {highlightMatch(node.name || "", query)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {highlightMatch(node.description || "", query)}
                  </div>
                  <div className="text-xs text-lentaBlue">
                    Приложение: {highlightMatch(node.application_name || "—", query)} | Уровень:{" "}
                    {node.level || "—"} | Владелец: {highlightMatch(node.owner || "", query)} | Домен:{" "}
                    {highlightMatch(node.it_domain || "", query)}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2 items-start invisible group-hover:visible">
                <button
                  onClick={() => handleEdit(node)}
                  className="text-gray-400 hover:text-lentaBlue"
                  title="Изменить"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={() => nav(`/app-capabilities/${node.id}`)}
                  className="text-gray-400 hover:text-blue-500"
                  title="Открыть страницу объекта"
                >
                  <Info size={18} />
                </button>
                <button
                  onClick={() => handleDelete(node.id)}
                  className="text-gray-400 hover:text-red-500"
                  title="Удалить"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {open && hasChildren && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  query={query}
                  highlightedId={highlightedId}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-lentaWhite overflow-auto">
        <div className="flex items-center justify-between mb-4 gap-2">
          <h1 className="text-2xl font-bold text-lentaBlue">Способности приложений</h1>
          <div className="flex gap-2">
            <button
              className="text-sm text-lentaBlue border border-lentaBlue rounded px-3 py-1 hover:bg-lentaBlue hover:text-white"
              onClick={() => {
                const newMap = {};
                capabilities.forEach((cap) => (newMap[cap.id] = !expandAll));
                setOpenMap(newMap);
                setExpandAll((prev) => !prev);
              }}
            >
              {expandAll ? "Свернуть всё" : "Раскрыть всё"}
            </button>
            <button
              className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowCreateModal(true)}
            >
              Создать
            </button>
          </div>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Поиск по названию, описанию, владельцу, домену или приложению"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
        </div>

        <div className="mb-4 flex items-start flex-wrap sm:flex-nowrap gap-2">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowFilters((p) => !p)}
              className="flex items-center gap-1 text-lentaBlue border border-lentaBlue px-3 py-1 rounded hover:bg-lentaBlue hover:text-white"
            >
              <Filter size={16} />
              Фильтры
            </button>

            {showFilters && (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <button
                  onClick={() => {
                    setFilterLevel("");
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
                  <LevelCombobox
                    levels={[...new Set(capabilities.map((c) => c.level).filter(Boolean))]}
                    selectedLevel={filterLevel}
                    setSelectedLevel={setFilterLevel}
                  />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <OwnerCombobox
                    owners={[...new Set(capabilities.map((c) => c.owner).filter(Boolean))]}
                    selectedOwner={filterOwner}
                    setSelectedOwner={setFilterOwner}
                  />
                </div>

                <div className="flex-1 min-w-[150px]">
                  <DomainCombobox
                    domains={[...new Set(capabilities.map((c) => c.it_domain).filter(Boolean))]}
                    selectedDomain={filterDomain}
                    setSelectedDomain={setFilterDomain}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {loading ? (
            <Spinner />
          ) : (
            treeData.map((node) => (
              <TreeNode
                key={node.id}
                node={node}
                depth={0}
                query={search}
                highlightedId={highlightedId}
              />
            ))
          )}
        </div>

        {showCreateModal && (
          <CreateModal
            title="Создание способности приложения"
            onClose={() => setShowCreateModal(false)}
            onSubmit={() => {
              if (createFormRef.current) {
                return createFormRef.current.submit();
              }
              return false;
            }}
          >
            <ApplicationCapabilityForm
              ref={createFormRef}
              onCreated={handleCreatedOrUpdated}
              notifyError={notifyError}
            />
          </CreateModal>
        )}

        {showEditModal && editingItem && (
          <EditModal
            title="Изменение способности приложения"
            onClose={() => {
              setShowEditModal(false);
              setEditingItem(null);
            }}
            onSubmit={() => {
              if (editFormRef.current) {
                return editFormRef.current.submit();
              }
              return false;
            }}
          >
            <ApplicationCapabilityForm
              ref={editFormRef}
              existingData={editingItem}
              onCreated={handleCreatedOrUpdated}
              notifyError={notifyError}
            />
          </EditModal>
        )}
      </main>
    </div>
  );
};

export default AppCapabilitiesRegistryPage;
