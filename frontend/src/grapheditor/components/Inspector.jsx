import { useEffect, useState } from "react";
import { ensureValueNode, getCellDataAttr, setCellDataAttr } from "../utils/xml";

export default function Inspector({ graph }) {
  const [cell, setCell] = useState(null);
  const [label, setLabel] = useState("");
  const [dataType, setDataType] = useState("");
  const [objectId, setObjectId] = useState("");

  useEffect(() => {
    if (!graph) return;
    const handler = () => {
      const c = graph.getSelectionCell();
      setCell(c || null);
      if (c) {
        const l = typeof c.value === "string" ? c.value : c.value?.getAttribute?.("label") || "";
        setLabel(l);
        setDataType(getCellDataAttr(c, "dataType") || "");
        setObjectId(getCellDataAttr(c, "objectId") || "");
      } else {
        setLabel(""); setDataType(""); setObjectId("");
      }
    };
    handler();
    graph.getSelectionModel().addListener(window.mxEvent.CHANGE, handler);
    return () => graph.getSelectionModel().removeListener(handler);
  }, [graph]);

  function apply() {
    if (!graph || !cell) return;
    graph.getModel().beginUpdate();
    try {
      ensureValueNode(cell);
      cell.value.setAttribute("label", label);
      if (dataType) setCellDataAttr(cell, "dataType", dataType);
      if (objectId) setCellDataAttr(cell, "objectId", objectId);
      graph.refresh(cell);
    } finally {
      graph.getModel().endUpdate();
    }
  }

  if (!cell) {
    return (
      <div className="col-span-2 border-l p-2 bg-white text-sm text-gray-500">
        <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Инспектор</div>
        Ничего не выбрано
      </div>
    );
  }

  const isVertex = graph.getModel().isVertex(cell);

  return (
    <div className="col-span-2 border-l p-2 bg-white">
      <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Инспектор</div>
      <div className="space-y-2 text-sm">
        <div className="text-gray-600">Тип: <b>{isVertex ? "Вершина" : "Ребро"}</b></div>

        <div>
          <div className="text-xs text-gray-500 mb-1">Заголовок (label)</div>
          <input className="border rounded px-2 py-1 w-full" value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="text-xs text-gray-500 mb-1">dataType</div>
            <input className="border rounded px-2 py-1 w-full" value={dataType} onChange={(e) => setDataType(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">objectId</div>
            <input className="border rounded px-2 py-1 w-full" value={objectId} onChange={(e) => setObjectId(e.target.value)} />
          </div>
        </div>

        {(dataType && objectId) && (
          <a
            className="inline-block text-blue-600 hover:underline text-sm"
            href={`/registry/${encodeURIComponent(dataType)}/${encodeURIComponent(objectId)}`}
            target="_blank" rel="noreferrer"
          >
            Открыть карточку объекта →
          </a>
        )}

        <div className="pt-2">
          <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={apply}>Применить</button>
        </div>
      </div>
    </div>
  );
}
