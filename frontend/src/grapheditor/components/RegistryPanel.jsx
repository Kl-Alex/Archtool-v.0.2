import { useEffect, useState } from "react";
import { fetchRegistries, searchRegistryItems } from "../services/registriesApi";
import { setCellDataAttr } from "../utils/xml";

export default function RegistryPanel({ graph }) {
  const [registries, setRegistries] = useState([]);
  const [activeReg, setActiveReg] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const regs = await fetchRegistries();
        setRegistries(regs);
        if (regs?.length) setActiveReg(regs[0].key);
      } catch (e) { console.error(e); }
    })();
  }, []);

  useEffect(() => {
    if (!activeReg) return;
    setLoading(true);
    searchRegistryItems(activeReg, q, 100)
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeReg, q]);

  useEffect(() => {
    if (!graph || !window.mxUtils) return;
    const { mxUtils } = window;

    const cleanups = [];
    for (const it of items) {
      const id = `reg-${activeReg}-${it.id}`;
      const el = document.getElementById(id);
      if (!el) continue;

      const dropFunct = (g, evt, _cell, x, y) => {
        const parent = g.getDefaultParent();
        g.getModel().beginUpdate();
        try {
          const v = g.insertVertex(
            parent, null, it.name, x, y, 180, 60,
            "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;"
          );
          setCellDataAttr(v, "dataType", activeReg);
          setCellDataAttr(v, "objectId", String(it.id));
          setCellDataAttr(v, "label", it.name);
        } finally {
          g.getModel().endUpdate();
        }
      };

      const dragElt = document.createElement("div");
      dragElt.style.border = "1px dashed #9ca3af";
      dragElt.style.width = "120px";
      dragElt.style.height = "30px";

      const ds = mxUtils.makeDraggable(el, graph, dropFunct, dragElt, 0, 0, true, true);
      ds.setGuidesEnabled(true);

      cleanups.push(() => { el.onmousedown = null; });
    }
    return () => cleanups.forEach(fn => fn());
  }, [graph, items, activeReg]);

  return (
    <div className="col-span-2 border-r bg-gray-50 p-2 overflow-auto">
      <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Реестры</div>
      <div className="flex gap-2 mb-2">
        <select
          value={activeReg}
          onChange={(e) => setActiveReg(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-full"
        >
          {registries.map(r => <option key={r.key} value={r.key}>{r.name}</option>)}
        </select>
      </div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Поиск…"
        className="border rounded px-2 py-1 text-sm w-full mb-2"
      />

      {loading ? (
        <div className="text-xs text-gray-500">Загрузка…</div>
      ) : (
        <div className="space-y-1">
          {items.map(it => (
            <div
              key={it.id}
              id={`reg-${activeReg}-${it.id}`}
              className="p-2 rounded border bg-white hover:bg-gray-50 cursor-move select-none text-sm text-gray-800"
              title="Перетащите на холст"
            >
              <div className="font-medium truncate">{it.name}</div>
              <div className="text-xs text-gray-500 truncate">#{it.id}</div>
            </div>
          ))}
          {!items.length && <div className="text-xs text-gray-400">Ничего не найдено</div>}
        </div>
      )}
    </div>
  );
}
