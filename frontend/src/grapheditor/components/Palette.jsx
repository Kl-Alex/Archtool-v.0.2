import { useEffect } from "react";

/** Панель с элементами, которые можно перетаскивать на холст */
export default function Palette({ graph, palette }) {
  useEffect(() => {
    if (!graph || !window.mxUtils) return;
    const { mxUtils } = window;

    const cleanups = [];

    for (const item of palette) {
      const el = document.getElementById(`palette-${item.key}`);
      if (!el) continue;

      const dropFunct = (graph_, evt, _cell, x, y) => {
        const parent = graph_.getDefaultParent();
        const w = item.key === "ellipse" ? 80 : 140;
        const h = item.key === "ellipse" ? 80 : 60;
        graph_.getModel().beginUpdate();
        try {
          graph_.insertVertex(parent, null, item.label, x, y, w, h, item.style);
        } finally {
          graph_.getModel().endUpdate();
        }
      };

      const dragElt = document.createElement("div");
      dragElt.style.border = "1px dashed #9ca3af";
      dragElt.style.width = "80px";
      dragElt.style.height = "40px";

      const ds = mxUtils.makeDraggable(el, graph, dropFunct, dragElt, 0, 0, true, true);
      ds.setGuidesEnabled(true);

      cleanups.push(() => {
        el.onmousedown = null;
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [graph, palette]);

  return (
    <div className="col-span-2 border-r bg-gray-50 p-2 overflow-auto">
      <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Палитра</div>
      <div className="space-y-2">
        {palette.map((p) => (
          <div
            key={p.key}
            id={`palette-${p.key}`}
            className="p-2 rounded border bg-white hover:bg-gray-50 cursor-move select-none text-sm text-gray-800"
            title="Перетащите на холст"
          >
            {p.label}
          </div>
        ))}
      </div>
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1 font-semibold">Подсказки:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>ЛКМ и перетаскивание на пустом поле — панорамирование.</li>
          <li>Выделение рамкой — мышью по пустому полю.</li>
          <li>Соединение — потянуть из маркера вершины.</li>
          <li>Del — удалить, Ctrl+Z/Y — undo/redo.</li>
          <li>Ctrl+S — экспорт XML, Ctrl+O — импорт.</li>
          <li>Ctrl++, Ctrl+- — масштаб.</li>
        </ul>
      </div>
    </div>
  );
}
