import { useEffect, useRef, useState } from "react";
import useMxGraphReady from "../hooks/useMxGraphReady";
import { downloadText } from "../utils/downloadText";
import { encodeGraphToXML, decodeXMLIntoGraph } from "../utils/xml";

import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import Canvas from "../components/Canvas";
import MiniMap from "../components/MiniMap";

export default function GraphEditor() {
  const mxReady = useMxGraphReady();

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [undoMgr, setUndoMgr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [status, setStatus] = useState("Готово");
  const [autosaveOn, setAutosaveOn] = useState(true);

  // Палитра фигур
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
      mxConstants,
      mxPerimeter,
      mxEvent,
      mxUndoManager,
    } = window;

    if (!mxClient.isBrowserSupported()) {
      alert("Браузер не поддерживается mxGraph.");
      return;
    }

    const graphInst = new mxGraph(containerRef.current);

    // Базовые настройки
    graphInst.setPanning(true);
    graphInst.panningHandler.useLeftButtonForPanning = true;
    graphInst.setConnectable(true);
    graphInst.setCellsEditable(true);
    graphInst.setAllowDanglingEdges(false);
    graphInst.setDisconnectOnMove(false);
    graphInst.setGridEnabled(true);
    graphInst.view.gridColor = "#e5e7eb";
    graphInst.view.backgroundColor = "#ffffff";
    graphInst.setTooltips(true);

    // Стиль вершин
    const vStyle = graphInst.getStylesheet().getDefaultVertexStyle();
    vStyle[mxConstants.STYLE_ROUNDED] = 0;
    vStyle[mxConstants.STYLE_FONTSIZE] = 12;
    vStyle[mxConstants.STYLE_FONTCOLOR] = "#111827";
    vStyle[mxConstants.STYLE_FILLCOLOR] = "#ffffff";
    vStyle[mxConstants.STYLE_STROKECOLOR] = "#1f2937";
    vStyle[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;

    // Стиль рёбер
    const eStyle = graphInst.getStylesheet().getDefaultEdgeStyle();
    eStyle[mxConstants.STYLE_STROKECOLOR] = "#1f2937";
    eStyle[mxConstants.STYLE_LABEL_BACKGROUNDCOLOR] = "#ffffff";
    eStyle[mxConstants.STYLE_EDGE] = mxConstants.EDGESTYLE_ELBOW;
    eStyle[mxConstants.STYLE_ROUNDED] = 1;

    // Резинка
    const rb = new mxRubberband(graphInst);
    rb.defaultOpacity = 0.2;

    // Undo/Redo
    const undoManager = new mxUndoManager();
    const listener = function (_sender, evt) {
      undoManager.undoableEditHappened(evt.getProperty("edit"));
    };
    graphInst.getModel().addListener(mxEvent.UNDO, listener);
    graphInst.getView().addListener(mxEvent.UNDO, listener);

    // Хоткеи
    const keyHandler = new mxKeyHandler(graphInst);
    keyHandler.bindKey(46, () => deleteSelection(graphInst)); // Delete
    keyHandler.bindControlKey(90, () => undoManager.undo());  // Ctrl+Z
    keyHandler.bindControlKey(89, () => undoManager.redo());  // Ctrl+Y
    keyHandler.bindControlKey(67, () => document.execCommand("copy")); // Ctrl+C
    keyHandler.bindControlKey(86, () => document.execCommand("paste")); // Ctrl+V
    keyHandler.bindControlKey(83, (evt) => { evt?.preventDefault(); onSaveXML(graphInst); }); // Ctrl+S
    keyHandler.bindControlKey(79, (evt) => { evt?.preventDefault(); fileInputRef.current?.click(); }); // Ctrl+O
    keyHandler.bindControlKey(187, () => setZoom((z) => zoomIn(graphInst, z))); // Ctrl+'+'
    keyHandler.bindControlKey(189, () => setZoom((z) => zoomOut(graphInst, z))); // Ctrl+'-'
    keyHandler.bindControlKey(48, () => setZoom(zoomTo(graphInst, 1)));          // Ctrl+'0'
    keyHandler.bindControlKey(71, () => toggleGrid(graphInst));                  // Ctrl+G
    keyHandler.bindControlKey(68, () => duplicateSelection(graphInst));          // Ctrl+D

    setGraph(graphInst);
    setUndoMgr(undoManager);
    setZoom(graphInst.view.scale);
    setGridEnabled(graphInst.isGridEnabled());

    return () => {
      graphInst.destroy();
      setGraph(null);
      setUndoMgr(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mxReady]);

  /** Автосохранение */
  useEffect(() => {
    if (!graph) return;
    const STORAGE_KEY = "grapheditor:autosave";
    let timer = null;

    if (autosaveOn) {
      timer = setInterval(() => {
        try {
          const xml = encodeGraphToXML(graph);
          localStorage.setItem(STORAGE_KEY, xml);
          setStatus("Автосохранено");
        } catch {}
      }, 2000);
    }

    // Восстановление при первой инициализации
    try {
      const xml = localStorage.getItem(STORAGE_KEY);
      if (xml) decodeXMLIntoGraph(graph, xml);
    } catch {}

    return () => timer && clearInterval(timer);
  }, [graph, autosaveOn]);

  /** Действия */
  function deleteSelection(g) {
    if (!g) return;
    g.removeCells();
  }
  function duplicateSelection(g) {
    if (!g) return;
    const cells = g.getSelectionCells();
    if (!cells?.length) return;
    g.getModel().beginUpdate();
    try {
      const clones = g.cloneCells(cells, true);
      g.moveCells(clones, 20, 20, false);
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

  function onSaveXML(g = graph) {
    if (!g) return;
    const xml = encodeGraphToXML(g);
    downloadText("diagram.xml", xml);
    setStatus("XML сохранён");
  }

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

  function exportSVG() {
    if (!graph) return;
    const { mxUtils, mxXmlCanvas2D, mxImageExport } = window;
    const bounds = graph.getGraphBounds();
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

  return (
    <div className="h-full w-full flex flex-col">
      {/* Toolbar */}
      <Toolbar
        gridEnabled={gridEnabled}
        autosaveOn={autosaveOn}
        zoom={zoom}
        status={status}
        onAddRect={() => addVertex("rounded=0;whiteSpace=wrap;html=1;")}
        onAddEllipse={() => addVertex("ellipse;whiteSpace=wrap;html=1;", 80, 80)}
        onZoomIn={() => setZoom((z) => zoomIn(graph, z))}
        onZoomOut={() => setZoom((z) => zoomOut(graph, z))}
        onFit={fitToScreen}
        onToggleGrid={() => toggleGrid(graph)}
        onExportXML={() => onSaveXML()}
        onExportSVG={exportSVG}
        onImportXMLClick={() => fileInputRef.current?.click()}
        onToggleAutosave={(e) => setAutosaveOn(e.target.checked)}
      />

      {/* Импорт XML input */}
      <input ref={fileInputRef} type="file" accept=".xml" className="hidden" onChange={onOpenXMLFile} />

      {/* Рабочая область */}
      <div className="flex-1 grid grid-cols-12 overflow-hidden">
        {/* Левая панель — палитра */}
        <Palette graph={graph} palette={palette} />

        {/* Холст */}
        <Canvas ref={containerRef} />

        {/* Правая панель — миникарта */}
        <MiniMap graph={graph} />
      </div>
    </div>
  );
}
