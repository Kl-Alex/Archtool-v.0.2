// src/grapheditor/components/Palette.jsx
import { useEffect, useMemo } from "react";

/** Палитра фигур в стиле draw.io (фикс множественной вставки без ds.addListener) */
export default function Palette({ graph, palette }) {
  const items = useMemo(() => {
    return (palette || []).map((p) => ({
      ...p,
      w: p.key === "ellipse" ? 80 : 140,
      h: p.key === "ellipse" ? 80 : 60,
    }));
  }, [palette]);

  useEffect(() => {
    if (!graph || !window.mxUtils) return;
    const { mxUtils } = window;

    const dropFunctFactory = (item) => (graph_, evt, _cell, x, y) => {
      const parent = graph_.getDefaultParent();
      const w = item.w;
      const h = item.h;
      const cx = x - w / 2;
      const cy = y - h / 2;

      graph_.getModel().beginUpdate();
      try {
        graph_.insertVertex(parent, null, item.label, cx, cy, w, h, item.style);
      } finally {
        graph_.getModel().endUpdate();
      }
    };

    const makeDragPreview = (item) => {
      const ghost = document.createElement("div");
      ghost.className =
        "pointer-events-none rounded border border-dashed border-gray-400 bg-white/70";
      ghost.style.width = `${Math.max(64, Math.min(120, item.w))}px`;
      ghost.style.height = `${Math.max(36, Math.min(90, item.h))}px`;
      return ghost;
    };

    const destroyers = [];

    for (const item of items) {
      const el = document.getElementById(`palette-${item.key}`);
      if (!el) continue;

      // --- локальное отслеживание «настоящего» перетаскивания ---
      let pointerDown = false;
      let moved = false;
      let startX = 0;
      let startY = 0;
      let suppressClick = false; // гасим ближайший click после dnd
      let suppressDblClick = false;

      const onPointerDown = (e) => {
        pointerDown = true;
        moved = false;
        startX = e.clientX;
        startY = e.clientY;
      };
      const onPointerMove = (e) => {
        if (!pointerDown) return;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (!moved && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
          moved = true;
        }
      };
      const onPointerUp = () => {
        if (pointerDown && moved) {
          // Было реальное перетаскивание → после него часто приходит click/dblclick
          suppressClick = true;
          suppressDblClick = true;
          // Снимаем флаги в следующем тике
          setTimeout(() => {
            suppressClick = false;
            suppressDblClick = false;
          }, 0);
        }
        pointerDown = false;
      };

      el.addEventListener("mousedown", onPointerDown);
      document.addEventListener("mousemove", onPointerMove, true);
      document.addEventListener("mouseup", onPointerUp, true);

      const dragElt = makeDragPreview(item);
      const ds = mxUtils.makeDraggable(
        el,
        graph,
        dropFunctFactory(item),
        dragElt,
        0,
        0,
        true,
        true
      );
      ds.setGuidesEnabled?.(true);

      // Click — вставка слева-сверху видимой области (только если НЕ было DnD)
      const onClick = (e) => {
        if (suppressClick) return;
        if (!graph) return;

        const view = graph.view;
        const scale = view.scale || 1;
        const vx = (view.translate.x * scale * -1) / scale;
        const vy = (view.translate.y * scale * -1) / scale;

        const x = vx + 40;
        const y = vy + 40;

        graph.getModel().beginUpdate();
        try {
          graph.insertVertex(
            graph.getDefaultParent(),
            null,
            item.label,
            x,
            y,
            item.w,
            item.h,
            item.style
          );
        } finally {
          graph.getModel().endUpdate();
        }
      };

      // Dblclick — вставка по центру viewport (только если НЕ было DnD)
      const onDblClick = (e) => {
        if (suppressDblClick) return;
        if (!graph) return;

        const view = graph.view;
        const scale = view.scale || 1;
        const bounds = graph.container.getBoundingClientRect();
        const cx =
          (graph.container.scrollLeft + bounds.width / 2) / scale -
          view.translate.x;
        const cy =
          (graph.container.scrollTop + bounds.height / 2) / scale -
          view.translate.y;

        graph.getModel().beginUpdate();
        try {
          graph.insertVertex(
            graph.getDefaultParent(),
            null,
            item.label,
            cx - item.w / 2,
            cy - item.h / 2,
            item.w,
            item.h,
            item.style
          );
        } finally {
          graph.getModel().endUpdate();
        }
      };

      el.addEventListener("click", onClick);
      el.addEventListener("dblclick", onDblClick);

      destroyers.push(() => {
        try {
          ds?.destroy?.();
        } catch {}
        el.removeEventListener("mousedown", onPointerDown);
        document.removeEventListener("mousemove", onPointerMove, true);
        document.removeEventListener("mouseup", onPointerUp, true);
        el.removeEventListener("click", onClick);
        el.removeEventListener("dblclick", onDblClick);
      });
    }

    return () => destroyers.forEach((fn) => fn && fn());
  }, [graph, items]);

  return (
    <div className="col-span-2 border-r bg-gray-50 p-2 overflow-auto">
      <div className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-2">
        Палитра
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((p) => (
          <button
            key={p.key}
            id={`palette-${p.key}`}
            type="button"
            className="group w-full flex items-center gap-2 p-2 rounded-lg border bg-white hover:bg-gray-50 cursor-move select-none text-sm text-gray-800 shadow-sm hover:shadow transition"
            title="Перетащите на холст. Двойной клик — вставить по центру."
          >
            <div className="shrink-0">
              <ShapeIcon kind={p.key} />
            </div>
            <div className="truncate">{p.label}</div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1 font-semibold">Подсказки:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Перетаскивайте фигуры на холст. Двойной клик — по центру вида.</li>
          <li>ЛКМ на пустом поле и перетаскивание — панорамирование.</li>
          <li>Выделение рамкой — мышью по пустому полю.</li>
          <li>Соединение — потянуть из маркера вершины.</li>
          <li>Del — удалить, Ctrl+Z/Y — undo/redo.</li>
          <li>Ctrl+S — экспорт XML, Ctrl+O — импорт.</li>
          <li>Ctrl++ / Ctrl+- — масштаб, Ctrl+0 — 100%.</li>
        </ul>
      </div>
    </div>
  );
}

function ShapeIcon({ kind }) {
  switch (kind) {
    case "rect":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <rect x="1.5" y="1.5" width="25" height="17" fill="#fff" stroke="#1f2937" />
        </svg>
      );
    case "round":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <rect x="1.5" y="1.5" width="25" height="17" rx="6" ry="6" fill="#fff" stroke="#1f2937" />
        </svg>
      );
    case "ellipse":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <ellipse cx="14" cy="10" rx="12.5" ry="8.5" fill="#fff" stroke="#1f2937" />
        </svg>
      );
    case "rhomb":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <path d="M14 1.5 L26.5 10 L14 18.5 L1.5 10 Z" fill="#fff" stroke="#1f2937" />
        </svg>
      );
    case "doc":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <path d="M6 2.5 H17 L22 7.5 V17.5 H6 Z" fill="#fff" stroke="#1f2937" />
          <path d="M17 2.5 V7.5 H22" fill="none" stroke="#1f2937" />
        </svg>
      );
    case "db":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <ellipse cx="14" cy="4.5" rx="10.5" ry="3.5" fill="#fff" stroke="#1f2937" />
          <path d="M3.5 4.5 V15.5 C3.5 17 9 18.5 14 18.5 C19 18.5 24.5 17 24.5 15.5 V4.5"
                fill="none" stroke="#1f2937" />
          <path d="M3.5 10.5 C3.5 12 9 13.5 14 13.5 C19 13.5 24.5 12 24.5 10.5"
                fill="none" stroke="#1f2937" />
        </svg>
      );
    case "cloud":
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <path
            d="M7 14c-2.2 0-4-1.7-4-3.8 0-1.8 1.2-3.3 2.9-3.7C6.4 4.4 8.5 3 11 3c3 0 5.4 2 5.9 4.6 1.8.1 3.2 1.5 3.2 3.3 0 1.9-1.6 3.5-3.7 3.5H7z"
            fill="#fff"
            stroke="#1f2937"
          />
        </svg>
      );
    default:
      return (
        <svg width="28" height="20" viewBox="0 0 28 20">
          <rect x="1.5" y="1.5" width="25" height="17" fill="#fff" stroke="#1f2937" />
        </svg>
      );
  }
}
