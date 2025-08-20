import { useEffect, useRef } from "react";

/** Миникарта (mxOutline), создаётся при наличии graph */
export default function MiniMap({ graph }) {
  const outlineRef = useRef(null);

  useEffect(() => {
    if (!graph || !window.mxOutline) return;

    // eslint-disable-next-line no-new
    new window.mxOutline(graph, outlineRef.current);
  }, [graph]);

  const vertices = graph ? graph.getChildVertices(graph.getDefaultParent()).length : 0;
  const edges = graph ? graph.getChildEdges(graph.getDefaultParent()).length : 0;
  const selected = graph ? graph.getSelectionCount() : 0;

  return (
    <div className="col-span-2 border-l p-2 bg-white">
      <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Миникарта</div>
      <div ref={outlineRef} className="border rounded h-56 bg-white" />
      <div className="mt-4 text-xs text-gray-500">
        <p className="mb-1 font-semibold">Состояние:</p>
        <ul className="list-disc pl-4 space-y-1">
          <li>Выделено: {selected}</li>
          <li>Вершин: {vertices}</li>
          <li>Рёбер: {edges}</li>
        </ul>
      </div>
    </div>
  );
}
