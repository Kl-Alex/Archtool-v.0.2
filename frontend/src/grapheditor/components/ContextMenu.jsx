import { useEffect, useState } from "react";
import { getCellDataAttr } from "../utils/xml";

export default function ContextMenu({ graph }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!graph) return;

    // перехват правого клика
    graph.addListener(window.mxEvent.FIRE_MOUSE_EVENT, (_s, me) => {
      if (me.getEvent().type === "contextmenu") {
        const e = me.getEvent();
        e.preventDefault();
        setPos({ x: e.clientX, y: e.clientY });
        graph.setSelectionCell(me.getCell());
        setOpen(true);
      }
    });

    const close = () => setOpen(false);
    document.addEventListener("click", close);
    window.addEventListener("blur", close);
    return () => {
      document.removeEventListener("click", close);
      window.removeEventListener("blur", close);
    };
  }, [graph]);

  if (!open) return null;

  const cell = graph?.getSelectionCell?.();
  const objectId = cell ? getCellDataAttr(cell, "objectId") : null;
  const dataType = cell ? getCellDataAttr(cell, "dataType") : null;

  function openCard() {
    if (dataType && objectId) {
      window.open(`/registry/${encodeURIComponent(dataType)}/${encodeURIComponent(objectId)}`, "_blank");
    }
    setOpen(false);
  }
  function lockCell() {
    if (!graph || !cell) return;
    graph.setCellStyles(window.mxConstants.STYLE_MOVABLE, 0, [cell]);
    graph.setCellStyles(window.mxConstants.STYLE_EDITABLE, 0, [cell]);
    setOpen(false);
  }
  function groupCells() {
    if (!graph) return;
    const cells = graph.getSelectionCells();
    if (cells?.length > 1) graph.groupCells(null, 10);
    setOpen(false);
  }
  function ungroupCells() {
    if (!graph) return;
    graph.ungroupCells(graph.getSelectionCells());
    setOpen(false);
  }

  return (
    <div
      className="fixed z-50 bg-white border rounded shadow text-sm min-w-48"
      style={{ left: pos.x + 2, top: pos.y + 2 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={openCard} disabled={!objectId || !dataType}>
        Открыть карточку объекта
      </button>
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={groupCells}>Сгруппировать</button>
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={ungroupCells}>Разгруппировать</button>
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={lockCell}>Заблокировать</button>
    </div>
  );
}
