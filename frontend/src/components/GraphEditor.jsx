// src/pages/GraphEditor.jsx
import { useEffect, useRef, useState } from "react";

/** --- Хук: загрузка mxGraph из CDN один раз --- */
function useMxGraphReady() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.mxClient && window.mxGraph) {
      setReady(true);
      return;
    }

    // Пути для внутренних ресурсов mxGraph (на CDN)
    window.mxBasePath = "https://unpkg.com/mxgraph@4.2.2/javascript/src";
    window.mxImageBasePath = "https://unpkg.com/mxgraph@4.2.2/javascript/src/images";
    window.mxLoadResources = false;
    window.mxLoadStylesheets = false;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/mxgraph@4.2.2/javascript/mxClient.js";
    script.async = true;
    script.onload = () => setReady(!!window.mxGraph);
    script.onerror = () => console.error("Не удалось загрузить mxGraph с CDN");
    document.head.appendChild(script);
  }, []);

  return ready;
}

/** --- Утилита для скачивания текстовых файлов --- */
function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** --- Главный компонент редактора --- */
export default function GraphEditor() {
  const mxReady = useMxGraphReady();

  const containerRef = useRef(null);
  const outlineRef = useRef(null);
  const fileInputRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [undoMgr, setUndoMgr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [status, setStatus] = useState("Готово");
  const [autosaveOn, setAutosaveOn] = useState(true);

  // Палитра: простые пресеты
  const palette = [
    { key: "rect", label: "Прямоуг.", style: "rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "round", label: "Скругл.", style: "rounded=1;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "ellipse", label: "Эллипс", style: "ellipse;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "rhomb", label: "Ромб", style: "rhombus;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "doc", label: "Документ", style: "shape=document;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "db", label: "БД", style: "shape=cylinder;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
    { key: "cloud", label: "Облако", style: "shape=cloud;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#1f2937;" },
  ];

  /** Инициализация mxGraph */
  useEffect(() => {
    if (!mxReady || !containerRef.current) return;

    const {
      mxClient,
      mxGraph,
      mxRubberband,
      mxKeyHandler,
      mxUtils,
      mxConstants,
      mxGraphHandler,
      mxEvent,
      mxOutline,
      mxUndoManager,
      mxCodec,
      mxPerimeter,
    } = window;

    if (!mxClient.isBrowserSupported()) {
      alert("Браузер не поддерживается mxGraph.");
      return;
    }

    // Создаём граф
    const graphInst = new mxGraph(containerRef.current);

    // Базовые настройки
    graphInst.setPanning(true);
    graphInst.panningHandler.useLeftButtonForPanning = true;
    graphInst.setConnectable(true);
    graphInst.setCellsEditable(true);
    graphInst.setAllowDanglingEdges(false);
    graphInst.setDisconnectOnMove(false);
    graphInst.setGridEnabled(true);
    graphInst.view.gridColor = "#e5e7eb"; // Tailwind gray-200
    graphInst.view.backgroundColor = "#ffffff";
    graphInst.setTooltips(true);

    // Стиль вершин по умолчанию
    let vStyle = graphInst.getStylesheet().getDefaultVertexStyle();
    vStyle[mxConstants.STYLE_ROUNDED] = 0;
    vStyle[mxConstants.STYLE_FONTSIZE] = 12;
    vStyle[mxConstants.STYLE_FONTCOLOR] = "#111827"; // gray-900
    vStyle[mxConstants.STYLE_FILLCOLOR] = "#ffffff";
    vStyle[mxConstants.STYLE_STROKECOLOR] = "#1f2937"; // gray-800
    vStyle[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;

    // Стиль ребра
    let eStyle = graphInst.getStylesheet().getDefaultEdgeStyle();
    eStyle[mxConstants.STYLE_STROKECOLOR] = "#1f2937";
    eStyle[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = "#ffffff";
    eStyle[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ELBOW;
    eStyle[mxConstants.STYLE_ROUNDED] = 1;

    // Выделение резинкой
    const rb = new mxRubberband(graphInst);
    rb.defaultOpacity = 0.2;

    // Undo/Redo
    const undoManager = new mxUndoManager();
    const listener = function (_sender, evt) {
      undoManager.undoableEditHappened(evt.getProperty("edit"));
    };
    graphInst.getModel().addListener(mxEvent.UNDO, listener);
    graphInst.getView().addListener(mxEvent.UNDO, listener);

    // Миникарта (Outline)
    if (outlineRef.current) {
      // eslint-disable-next-line no-new
      new mxOutline(graphInst, outlineRef.current);
    }

    // Хоткеи
    const keyHandler = new mxKeyHandler(graphInst);
    keyHandler.bindKey(46, () => deleteSelection(graphInst)); // Delete
    keyHandler.bindControlKey(90, () => undoManager.undo()); // Ctrl+Z
    keyHandler.bindControlKey(89, () => undoManager.redo()); // Ctrl+Y
    keyHandler.bindControlKey(67, () => document.execCommand("copy")); // Ctrl+C (браузерный буфер)
    keyHandler.bindControlKey(86, () => document.execCommand("paste")); // Ctrl+V
    keyHandler.bindControlKey(83, (evt) => {
      evt?.preventDefault();
      onSaveXML(graphInst);
    }); // Ctrl+S
    keyHandler.bindControlKey(79, (evt) => {
      evt?.preventDefault();
      fileInputRef.current?.click();
    }); // Ctrl+O
    keyHandler.bindControlKey(187, () => setZoom((z) => zoomIn(graphInst, z))); // Ctrl+'+' (187)
    keyHandler.bindControlKey(189, () => setZoom((z) => zoomOut(graphInst, z))); // Ctrl+'-' (189)
    keyHandler.bindControlKey(48, () => setZoom(zoomTo(graphInst, 1))); // Ctrl+'0'
    keyHandler.bindControlKey(71, () => toggleGrid(graphInst)); // Ctrl+G
    keyHandler.bindControlKey(68, () => duplicateSelection(graphInst)); // Ctrl+D

    // Автосохранение / восстановление
    const STORAGE_KEY = "grapheditor:autosave";
    const restore = () => {
      try {
        const xml = localStorage.getItem(STORAGE_KEY);
        if (xml) decodeXMLIntoGraph(graphInst, xml);
      } catch {
        // ignore
      }
    };
    restore();
    let autosaveTimer = null;
    if (autosaveOn) {
      autosaveTimer = setInterval(() => {
        try {
          const xml = encodeGraphToXML(graphInst);
          localStorage.setItem(STORAGE_KEY, xml);
          setStatus("Автосохранено");
        } catch {
          /* ignore */
        }
      }, 2000);
    }

    // Очистка
    setGraph(graphInst);
    setUndoMgr(undoManager);
    setZoom(graphInst.view.scale);

    return () => {
      if (autosaveTimer) clearInterval(autosaveTimer);
      graphInst.destroy();
      setGraph(null);
      setUndoMgr(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mxReady]);

  /** Вспомогательные действия над графом */
  function deleteSelection(g) {
    if (!g) return;
    g.removeCells();
  }

  function duplicateSelection(g) {
    if (!g) return;
    const cells = g.getSelectionCells();
    if (!cells || !cells.length) return;

    g.getModel().beginUpdate();
    try {
      const clones = g.cloneCells(cells, true);
      // Смещаем дубликаты
      const dx = 20, dy = 20;
      g.moveCells(clones, dx, dy, false);
      g.setSelectionCells(clones);
    } finally {
      g.getModel().endUpdate();
    }
  }

  function zoomIn(g, current) {
    if (!g) return current;
    g.zoomIn();
    return g.view.scale;
  }
  function zoomOut(g, current) {
    if (!g) return current;
    g.zoomOut();
    return g.view.scale;
  }
  function zoomTo(g, scale) {
    if (!g) return scale;
    g.zoomTo(scale);
    return g.view.scale;
  }

  function toggleGrid(g) {
    if (!g) return;
    g.setGridEnabled(!g.isGridEnabled());
    g.refresh();
    setGridEnabled(g.isGridEnabled());
  }

  function fitToScreen() {
    if (!graph) return;
    graph.fit(8, false, 20, true, false, false);
    setZoom(graph.view.scale);
  }

  /** Кодирование/декодирование XML */
  function encodeGraphToXML(g) {
    const { mxCodec, mxUtils } = window;
    const enc = new mxCodec();
    const node = enc.encode(g.getModel());
    return mxUtils.getXml(node);
  }

  function decodeXMLIntoGraph(g, xml) {
    const { mxUtils, mxCodec } = window;
    const doc = mxUtils.parseXml(xml);
    const decoder = new mxCodec(doc);
    g.getModel().beginUpdate();
    try {
      g.removeCells(g.getChildVertices(g.getDefaultParent()));
      decoder.decode(doc.documentElement, g.getModel());
    } finally {
      g.getModel().endUpdate();
    }
  }

  /** Экспорт XML */
  function onSaveXML(g = graph) {
    if (!g) return;
    const xml = encodeGraphToXML(g);
    downloadText("diagram.xml", xml);
    setStatus("XML сохранён");
  }

  /** Импорт XML */
  function onOpenXMLFile(e) {
    const file = e.target.files?.[0];
    if (!file || !graph) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        decodeXMLIntoGraph(graph, String(reader.result));
        setStatus("XML загружен");
      } catch (err) {
        console.error(err);
        alert("Ошибка импорта XML");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  /** Экспорт в SVG (клиентский, без серверной части) */
  function exportSVG() {
    if (!graph) return;
    const { mxUtils, mxXmlCanvas2D, mxImageExport } = window;

    // границы
    const bounds = graph.getGraphBounds();
    const scale = 1;
    const width = Math.ceil(bounds.x + bounds.width) - Math.floor(bounds.x);
    const height = Math.ceil(bounds.y + bounds.height) - Math.floor(bounds.y);

    const xmlDoc = mxUtils.createXmlDocument();
    const root = xmlDoc.createElement("svg");
    root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    root.setAttribute("version", "1.1");
    root.setAttribute("width", `${width}`);
    root.setAttribute("height", `${height}`);
    xmlDoc.appendChild(root);

    const svgCanvas = new mxXmlCanvas2D(root);
    svgCanvas.translate(-Math.floor(bounds.x), -Math.floor(bounds.y));
    const imgExport = new mxImageExport();
    imgExport.drawState(graph.getView().getState(graph.model.root), svgCanvas);

    const svg = mxUtils.getXml(root);
    downloadText("diagram.svg", svg);
    setStatus("SVG экспортирован");
  }

  /** Добавление фигуры из палитры */
  function addVertex(style, w = 140, h = 60, value = "Новая фигура") {
    if (!graph) return;
    const parent = graph.getDefaultParent();
    graph.getModel().beginUpdate();
    try {
      const x = 40 + Math.round(Math.random() * 40);
      const y = 40 + Math.round(Math.random() * 40);
      graph.insertVertex(parent, null, value, x, y, w, h, style);
    } finally {
      graph.getModel().endUpdate();
    }
  }

  /** DnD из палитры на холст */
  useEffect(() => {
    if (!graph) return;
    const { mxUtils, mxEvent } = window;

    const cleanup = [];
    // Навешиваем draggable на элементы палитры
    for (const item of palette) {
      const el = document.getElementById(`palette-${item.key}`);
      if (!el) continue;

      const funct = (graph_, evt, _cell, x, y) => {
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
      dragElt.style.border = "1px dashed #9ca3af"; // gray-400
      dragElt.style.width = "80px";
      dragElt.style.height = "40px";

      const ds = mxUtils.makeDraggable(el, graph, funct, dragElt, 0, 0, true, true);
      ds.setGuidesEnabled(true);

      cleanup.push(() => {
        el.onmousedown = null;
      });
    }

    return () => cleanup.forEach((fn) => fn());
  }, [graph]);

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 p-2 border-b bg-white">
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => addVertex("rounded=0;whiteSpace=wrap;html=1;")}
          title="Добавить прямоугольник"
        >
          + Прямоугольник
        </button>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => addVertex("ellipse;whiteSpace=wrap;html=1;", 80, 80)}
          title="Добавить эллипс"
        >
          + Эллипс
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => setZoom((z) => zoomIn(graph, z))}
          title="Zoom In (Ctrl + +)"
        >
          Zoom +
        </button>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => setZoom((z) => zoomOut(graph, z))}
          title="Zoom Out (Ctrl + -)"
        >
          Zoom -
        </button>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={fitToScreen}
          title="Вписать в экран"
        >
          Fit
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <button
          className={`px-3 py-1 rounded border hover:bg-gray-50 ${gridEnabled ? "bg-gray-50" : ""}`}
          onClick={() => toggleGrid(graph)}
          title="Сетка (Ctrl+G)"
        >
          Сетка: {gridEnabled ? "Вкл" : "Выкл"}
        </button>

        <div className="h-6 w-px bg-gray-200 mx-1" />

        <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => onSaveXML()} title="Сохранить XML (Ctrl+S)">
          Экспорт XML
        </button>
        <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={exportSVG} title="Экспорт SVG">
          Экспорт SVG
        </button>
        <button
          className="px-3 py-1 rounded border hover:bg-gray-50"
          onClick={() => fileInputRef.current?.click()}
          title="Открыть XML (Ctrl+O)"
        >
          Импорт XML
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".xml"
          className="hidden"
          onChange={onOpenXMLFile}
        />

        <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
          <span>Масштаб: {(zoom * 100).toFixed(0)}%</span>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              className="rounded border-gray-300"
              checked={autosaveOn}
              onChange={(e) => setAutosaveOn(e.target.checked)}
            />
            Автосохранение
          </label>
          <span className="text-gray-400">| {status}</span>
        </div>
      </div>

      {/* Рабочая область */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Левая панель (палитра) */}
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

        {/* Холст */}
        <div className="col-span-8 relative">
          <div
            ref={containerRef}
            className="absolute inset-0 bg-white"
            style={{ cursor: "grab" }}
          />
        </div>

        {/* Правая панель (outline / миникарта) */}
        <div className="col-span-2 border-l p-2 bg-white">
          <div className="text-xs uppercase text-gray-500 font-semibold mb-2">Миникарта</div>
          <div ref={outlineRef} className="border rounded h-56 bg-white" />
          <div className="mt-4 text-xs text-gray-500">
            <p className="mb-1 font-semibold">Состояние:</p>
            <ul className="list-disc pl-4 space-y-1">
              <li>Выделено: {graph ? graph.getSelectionCount() : 0}</li>
              <li>Вершин: {graph ? graph.getChildVertices(graph.getDefaultParent()).length : 0}</li>
              <li>Рёбер: {graph ? graph.getChildEdges(graph.getDefaultParent()).length : 0}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
