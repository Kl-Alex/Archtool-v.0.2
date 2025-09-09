import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "../components/Sidebar";
import CreateModal from "../components/CreateModal";
import EditModal from "../components/EditModal";
import Spinner from "../components/Spinner";
import { Pencil, Trash2, Info, Filter, XCircle, ChevronsUpDown, ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { getToken } from "../utils/auth";
import { useNotification } from "../components/NotificationContext";

import InitiativeForm from "../components/InitiativeForm";
import InitiativePassportPage from "./InitiativePassportPage";

const VISIBLE_COLS_PRIORITY = [
  "name","description","status","owner","it_domain","start_date","end_date","budget"
];

export default function InitiativesRegistryPage() {
  const { notifyError, notifySuccess } = useNotification();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDomain, setFilterDomain] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [sortKey, setSortKey] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedCard, setSelectedCard] = useState(null);

  const createRef = useRef(null);
  const editRef   = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/initiatives", {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Ошибка загрузки инициатив");
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      notifyError(e.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    if (!confirm("Удалить инициативу?")) return;
    const res = await fetch(`/api/initiatives/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    if (res.ok) {
      notifySuccess("Инициатива удалена");
      fetchData();
    } else {
      notifyError("Ошибка при удалении");
    }
  };

  const handleEditOpen = async (row) => {
    try {
      const res = await fetch(`/api/initiatives/${row.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (!res.ok) throw new Error("Не удалось получить данные инициативы");
      const full = await res.json();
      setEditingItem(full);
      setShowEdit(true);
    } catch (e) {
      notifyError(e.message || "Ошибка открытия");
    }
  };

  const handleCreatedOrUpdated = async () => {
    await fetchData();
    setShowCreate(false);
    setShowEdit(false);
    setEditingItem(null);
    notifySuccess("Сохранено");
  };

  // Колонки таблицы: берём пересечение «приоритетных» с реально имеющимися полями
  const allKeys = useMemo(() => {
    const keys = new Set();
    items.forEach(i => Object.keys(i || {}).forEach(k => keys.add(k)));
    return Array.from(keys);
  }, [items]);

  const visibleCols = useMemo(() => {
    const pr = VISIBLE_COLS_PRIORITY.filter(k => allKeys.includes(k));
    // всегда первая колонка — name, если есть
    return pr.length ? pr : allKeys.slice(0, 6);
  }, [allKeys]);

  const owners  = useMemo(() => Array.from(new Set(items.map(x => x.owner).filter(Boolean))), [items]);
  const domains = useMemo(() => Array.from(new Set(items.map(x => x.it_domain).filter(Boolean))), [items]);
  const statuses= useMemo(() => Array.from(new Set(items.map(x => x.status).filter(Boolean))), [items]);

  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = items.filter(i => {
      const matchesQ = !q || Object.values(i).some(v => String(v ?? "").toLowerCase().includes(q));
      const okOwner  = !filterOwner || i.owner === filterOwner;
      const okDom    = !filterDomain || i.it_domain === filterDomain;
      const okStat   = !filterStatus || i.status === filterStatus;
      return matchesQ && okOwner && okDom && okStat;
    });

    arr.sort((a, b) => {
      const av = (a?.[sortKey] ?? "").toString().toLowerCase();
      const bv = (b?.[sortKey] ?? "").toString().toLowerCase();
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ? 1 : -1;
      return 0;
    });

    return arr;
  }, [items, search, filterOwner, filterDomain, filterStatus, sortKey, sortAsc]);

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-lentaWhite overflow-auto">
        <div className="flex items-center justify-between gap-2 mb-4">
          <h1 className="text-2xl font-bold text-lentaBlue">Инициативы</h1>
          <div className="flex gap-2">
            <button
              className="bg-lentaBlue text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={() => setShowCreate(true)}
            >Создать</button>
          </div>
        </div>

        <div className="mb-3">
          <input
            className="w-full p-2 border rounded"
            placeholder="Поиск по любому столбцу"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
        </div>

        <div className="mb-4 flex items-start flex-wrap gap-2">
          <button
            onClick={()=>setShowFilters(p=>!p)}
            className="flex items-center gap-1 text-lentaBlue border border-lentaBlue px-3 py-1 rounded hover:bg-lentaBlue hover:text-white"
          >
            <Filter size={16} /> Фильтры
          </button>

          {showFilters && (
            <div className="flex flex-wrap gap-2 items-center">
              <button
                className="text-red-600 hover:text-red-800"
                title="Сбросить фильтры"
                onClick={()=>{
                  setFilterOwner(""); setFilterDomain(""); setFilterStatus(""); setSearch("");
                }}
              >
                <XCircle size={20} />
              </button>

              <select className="border rounded p-2" value={filterOwner} onChange={e=>setFilterOwner(e.target.value)}>
                <option value="">Владелец: все</option>
                {owners.map(o=> <option key={o} value={o}>{o}</option>)}
              </select>

              <select className="border rounded p-2" value={filterDomain} onChange={e=>setFilterDomain(e.target.value)}>
                <option value="">Домен: все</option>
                {domains.map(d=> <option key={d} value={d}>{d}</option>)}
              </select>

              <select className="border rounded p-2" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                <option value="">Статус: все</option>
                {statuses.map(s=> <option key={s} value={s}>{s}</option>)}
              </select>

              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-gray-500">Сортировка:</span>
                <select className="border rounded p-2" value={sortKey} onChange={e=>setSortKey(e.target.value)}>
                  {visibleCols.map(c=> <option key={c} value={c}>{c}</option>)}
                </select>
                <button
                  className="p-2 border rounded hover:bg-gray-50"
                  onClick={()=>setSortAsc(a=>!a)}
                  title="Сменить направление сортировки"
                >
                  {sortAsc ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl shadow overflow-hidden">
          {loading ? (
            <div className="p-6"><Spinner /></div>
          ) : (
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    {visibleCols.map(col=>(
                      <th key={col} className="text-left px-3 py-2 whitespace-nowrap">
                        <button
                          className="inline-flex items-center gap-1 hover:text-lentaBlue"
                          onClick={()=>{
                            if (sortKey === col) setSortAsc(a=>!a);
                            else { setSortKey(col); setSortAsc(true); }
                          }}
                        >
                          {col}
                          <ChevronsUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSorted.map(row=>(
                    <tr key={row.id} className="border-t hover:bg-gray-50">
                      {visibleCols.map(col=>(
                        <td key={col} className="px-3 py-2 align-top whitespace-nowrap">
                          {renderCell(row[col])}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button className="text-gray-500 hover:text-lentaBlue" title="Инфо" onClick={() => navigate(`/initiatives/${row.id}`)}>
                            <Info size={18}/>
                          </button>
                          <button className="text-gray-500 hover:text-lentaBlue" title="Изменить" onClick={()=>handleEditOpen(row)}>
                            <Pencil size={18}/>
                          </button>
                          <button className="text-gray-500 hover:text-red-600" title="Удалить" onClick={()=>handleDelete(row.id)}>
                            <Trash2 size={18}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filteredSorted.length && (
                    <tr><td className="px-3 py-6 text-center text-gray-400" colSpan={visibleCols.length+1}>Нет данных</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showCreate && (
          <CreateModal
            title="Создание инициативы"
            onClose={()=>setShowCreate(false)}
            onSubmit={() => createRef.current?.submit() ?? false}
          >
            <InitiativeForm ref={createRef} onCreated={handleCreatedOrUpdated} notifyError={(m)=>notifyError(m)} />
          </CreateModal>
        )}

        {showEdit && editingItem && (
          <EditModal
            title="Изменение инициативы"
            onClose={()=>{ setShowEdit(false); setEditingItem(null); }}
            onSubmit={() => editRef.current?.submit() ?? false}
          >
            <InitiativeForm ref={editRef} existingData={editingItem} onCreated={handleCreatedOrUpdated} notifyError={(m)=>notifyError(m)} />
          </EditModal>
        )}

        {selectedCard && (
          <InitiativePassportPage
            initiative={selectedCard}
            onClose={()=>setSelectedCard(null)}
            onUpdated={handleCreatedOrUpdated}
          />
        )}
      </main>
    </div>
  );
}

function renderCell(val) {
  if (val == null || val === "") return "—";
  if (val === true || val === "true") return "Да";
  if (val === false || val === "false") return "Нет";
  if (Array.isArray(val)) return val.length ? val.join(", ") : "—";
  const s = String(val);
  if ((s.startsWith("[") && s.endsWith("]")) || (s.startsWith("{") && s.endsWith("}"))) {
    try {
      const v = JSON.parse(s);
      return Array.isArray(v) ? (v.length ? v.join(", ") : "—") : s;
    } catch { return s; }
  }
  return s;
}
