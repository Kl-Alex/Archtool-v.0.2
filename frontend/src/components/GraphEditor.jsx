import { useEffect, useRef, useState } from "react";

function useMxGraphReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.mxClient && window.mxGraph) {
      setReady(true);
      return;
    }

    // 1) Указываем, где лежит SRC (для внутренних подзагрузок)
    window.mxBasePath = "https://unpkg.com/mxgraph@4.2.2/javascript/src";
    window.mxImageBasePath = "https://unpkg.com/mxgraph@4.2.2/javascript/src/images";
    window.mxLoadResources = false;
    window.mxLoadStylesheets = false;

    // 2) Загружаем сам загрузчик
    const script = document.createElement("script");
    script.src = "https://unpkg.com/mxgraph@4.2.2/javascript/mxClient.js";
    script.async = true;
    script.onload = () => {
      if (window.mxGraph) {
        setReady(true);
      } else {
        console.error("mxClient загрузился, но mxGraph не найден (проверьте доступ к CDN).");
      }
    };
    script.onerror = () => {
      console.error("Не удалось загрузить mxGraph с CDN (unpkg).");
    };
    document.head.appendChild(script);
  }, []);

  return ready;
}

export default function GraphEditor({ onOpenCard }) {
  const containerRef = useRef(null);
  const paletteRef = useRef(null);
  const graphRef = useRef(null);

  const ready = useMxGraphReady();

  useEffect(() => {
    if (!ready) return;

    const {
      mxClient, mxGraph, mxRubberband, mxEvent,
      mxUtils, mxCodec, mxConstants, mxCellOverlay, mxImage
    } = window;

    if (!mxClient?.isBrowserSupported()) {
      alert("Ваш браузер не поддерживается mxGraph");
      return;
    }

    const container = containerRef.current;
    if (!container) return;

    container.style.height = "100%";
    container.style.background = "#fafafa";

    const graph = new mxGraph(container);
    graphRef.current = graph;

    graph.setPanning(true);
    graph.setConnectable(true);
    graph.setTooltips(true);
    new mxRubberband(graph);

    const vs = graph.getStylesheet().getDefaultVertexStyle();
    vs[mxConstants.STYLE_ROUNDED] = 1;
    vs[mxConstants.STYLE_FILLCOLOR] = "#EEF2FF";
    vs[mxConstants.STYLE_STROKECOLOR] = "#3B82F6";
    vs[mxConstants.STYLE_FONTCOLOR] = "#111827";
    vs[mxConstants.STYLE_SPACING] = 8;

    const repoStyle = mxUtils.clone(vs);
    repoStyle[mxConstants.STYLE_FILLCOLOR] = "#ECFEFF";
    repoStyle[mxConstants.STYLE_STROKECOLOR] = "#06B6D4";
    graph.getStylesheet().putCellStyle("repoObject", repoStyle);

    const es = graph.getStylesheet().getDefaultEdgeStyle();
    es[mxConstants.STYLE_STROKECOLOR] = "#64748B";
    es[mxConstants.STYLE_ENDARROW] = mxConstants.ARROW_CLASSIC;

    graph.addListener(mxEvent.DOUBLE_CLICK, (sender, evt) => {
      const cell = evt.getProperty("cell");
      if (!cell) return;
      const v = cell.value;
      if (v?.getAttribute) {
        const id = v.getAttribute("object_id");
        const type = v.getAttribute("type");
        if (id && onOpenCard) onOpenCard({ id, type });
      }
    });

    // DnD из палитры
    const items = paletteRef.current?.querySelectorAll(".repo-item") || [];
    Array.from(items).forEach((el) => {
      window.mxUtils.makeDraggable(
        el,
        graph,
        (graph, evt, target, x, y) => {
          const type = el.dataset.type;
          const name = el.dataset.name;
          const objectId = el.dataset.objectId;

          const doc = window.mxUtils.createXmlDocument();
          const value = doc.createElement("object");
          value.setAttribute("type", type);
          value.setAttribute("name", name);
          value.setAttribute("object_id", objectId);

          const parent = graph.getDefaultParent();
          graph.getModel().beginUpdate();
          try {
            const w = 180, h = 60;
            const cell = graph.insertVertex(parent, null, value, x, y, w, h, "repoObject");

            const overlay = new window.mxCellOverlay(
              new window.mxImage(
                "https://cdn.jsdelivr.net/gh/simple-icons/simple-icons/icons/openaccess.svg",
                16, 16
              ),
              "Открыть карточку"
            );
            overlay.addListener(window.mxEvent.CLICK, () => {
              const v = cell.value;
              const id = v?.getAttribute?.("object_id");
              const t = v?.getAttribute?.("type");
              window.dispatchEvent(new CustomEvent("archtool:open-card", { detail: { id, type: t } }));
            });
            graph.addCellOverlay(cell, overlay);

            graph.scrollCellToVisible(cell);
            graph.setSelectionCell(cell);
          } finally {
            graph.getModel().endUpdate();
          }
        },
        null,
        0, 0, true, true
      );
    });
  }, [ready, onOpenCard]);

  const exportXml = () => {
    if (!graphRef.current || !window.mxCodec || !window.mxUtils) return "";
    const enc = new window.mxCodec();
    const node = enc.encode(graphRef.current.getModel());
    const xml = window.mxUtils.getXml(node);
    console.log(xml);
    return xml;
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", height: "100%" }}>
      <div
        ref={paletteRef}
        style={{
          borderRight: "1px solid #e5e7eb",
          padding: 12,
          overflow: "auto",
          background: "white",
        }}
      >
        <h3 style={{ marginBottom: 8 }}>Арх‑реестр</h3>
        <div className="repo-item" data-type="business_capability" data-name="БС: Продажи" data-object-id="bc-101"
             style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, cursor: "grab" }}>
          БС: Продажи
          <div style={{ fontSize: 12, color: "#6b7280" }}>business_capability · bc-101</div>
        </div>
        <div className="repo-item" data-type="application" data-name="Приложение: CRM" data-object-id="app-42"
             style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, cursor: "grab" }}>
          Приложение: CRM
          <div style={{ fontSize: 12, color: "#6b7280" }}>application · app-42</div>
        </div>
        <div className="repo-item" data-type="process" data-name="Процесс: Обработка заказа" data-object-id="proc-7"
             style={{ padding: 8, border: "1px solid #e5e7eb", borderRadius: 10, marginBottom: 8, cursor: "grab" }}>
          Процесс: Обработка заказа
          <div style={{ fontSize: 12, color: "#6b7280" }}>process · proc-7</div>
        </div>
        <hr style={{ margin: "12px 0" }} />
        <button onClick={exportXml}>Экспорт XML (в консоль)</button>
      </div>
      <div ref={containerRef} style={{ height: "100%" }} />
    </div>
  );
}
