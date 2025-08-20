// src/grapheditor/pages/GraphEditor.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import useMxGraphReady from "../hooks/useMxGraphReady";
import { downloadText } from "../utils/downloadText";
import { encodeGraphToXML, decodeXMLIntoGraph } from "../utils/xml";

import { createDiagram, updateDiagram, getDiagram } from "../services/diagramApi";

import Toolbar from "../components/Toolbar";
import Palette from "../components/Palette";
import Canvas from "../components/Canvas";
import MiniMap from "../components/MiniMap";

export default function GraphEditor() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const nav = useNavigate();

  const mxReady = useMxGraphReady();

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  const [graph, setGraph] = useState(null);
  const [undoMgr, setUndoMgr] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [gridEnabled, setGridEnabled] = useState(true);
  const [status, setStatus] = useState("Готово");
  const [autosaveOn, setAutosaveOn] = useState(true);

  // Параметры диаграммы (БД)
  const [id, setId] = useState(routeId || null);
  const [name, setName] = useState(searchParams.get("name") || "Диаграмма");
  const [registryType, setRegistryType] = useState(searchParams.get("registry") || "business_capabilities");
  const [version, setVersion] = useState(null); // оптимистичная блокировка

  // Палитра базовых фигур — рисуем и руками, и из палитры
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
      mxGraphHandler,
      mxClipboard,
    } = window;

    if (!mxClient?.isBrowserSupported?.()) {
      alert("Браузер не поддерживается mxGraph.");
      return;
    }

    // Контейнер под холст
    const graphInst = new mxGraph(containerRef.current);

    // Базовые настройки
    graphInst.setPanning(true);
    graphInst.panningHandler.useLeftButtonForPanning = true;
    graphInst.setConnectable(true);
    graphInst.setAllowDanglingEdges(false);
    graphInst.setDisconnectOnMove(false);
    graphInst.setCellsEditable(true);
    graphInst.setCellsResizable(true);
    graphInst.setCellsMovable(true);
    graphInst.setGridEnabled(true);
    graphInst.setHtmlLabels(true);
    graphInst.view.gridColor = "#e5e7eb";
    graphInst.view.backgroundColor = "#ffffff";
    graphInst.setTooltips(true);
    graphInst.setAllowLoops(false);

    // Включаем дублирование по Alt+Drag (как в draw.io)
    mxGraphHandler.prototype.cloneEnabled = true;
    mxGraphHandler.prototype.guidesEnabled = true;

    // Стиль вершин
    const vStyle = graphInst.getStylesheet().getDefaultVertexStyle();
    vStyle[mxConstants.STYLE_ROUNDED] = 0;
    vStyle[mxConstants.STYLE_FONTSIZE] = 12;
    vStyle[mxConstants.STYLE_FONTCOLOR] = "#111827";
    vStyle[mxConstants.STYLE_FILLCOLOR] = "#ffffff";
    vStyle[mxConstants.STYLE_STROKECOLOR] = "#1f2937";
    vStyle[mxConstants.STYLE_PERIMETER] = mxPerimeter.RectanglePerimeter;
    vStyle[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_MIDDLE;
    vStyle[mxConstants.STYLE_ALIGN] = mxConstants.ALIGN_CENTER;

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
    const undoListener = (_sender, evt) => {
      undoManager.undoableEditHappened(evt.getProperty("edit"));
    };
    graphInst.getModel().addListener(mxEvent.UNDO, undoListener);
    graphInst.getView().addListener(mxEvent.UNDO, undoListener);

    // Отслеживаем масштаб/сетку — чтобы UI показывал актуальные значения
    const viewListener = () => setZoom(graphInst.view.scale);
    graphInst.getView().addListener(mxEvent.SCALE, viewListener);
    graphInst.getView().addListener(mxEvent.SCALE_AND_TRANSLATE, viewListener);

    // Хоткеи (без document.execCommand)
    const keyHandler = new mxKeyHandler(graphInst);
    keyHandler.bindKey(46, () => deleteSelection(graphInst)); // Delete
    keyHandler.bindControlKey(90, () => undoManager.undo());  // Ctrl+Z
    keyHandler.bindControlKey(89, () => undoManager.redo());  // Ctrl+Y
    keyHandler.bindControlKey(67, () => mxClipboard.copy(graphInst)); // Ctrl+C
    keyHandler.bindControlKey(86, () => mxClipboard.paste(graphInst)); // Ctrl+V
    keyHandler.bindControlKey(83, (evt) => { evt?.preventDefault(); onExportXML(graphInst); }); // Ctrl+S (локальный экспорт)
    keyHandler.bindControlKey(79, (evt) => { evt?.preventDefault(); fileInputRef.current?.click(); }); // Ctrl+O
    keyHandler.bindControlKey(187, () => setZoom((z) => zoomIn(graphInst, z))); // Ctrl+'+'
    keyHandler.bindControlKey(189, () => setZoom((z) => zoomOut(graphInst, z))); // Ctrl+'-'
    keyHandler.bindControlKey(48, () => setZoom(zoomTo(graphInst, 1)));          // Ctrl+'0'
    keyHandler.bindControlKey(71, () => toggleGrid(graphInst));                  // Ctrl+G
    // Дублирование выделения
    keyHandler.bindControlKey(68, () => duplicateSelection(graphInst));          // Ctrl+D

    setGraph(graphInst);
    setUndoMgr(undoManager);
    setZoom(graphInst.view.scale);
    setGridEnabled(graphInst.isGridEnabled());

    return () => {
      // Снимаем слушатели и уничтожаем граф
      graphInst.getModel().removeListener(undoListener);
      graphInst.getView().removeListener(undoListener);
      graphInst.getView().removeListener(viewListener);
      graphInst.destroy();
      setGraph(null);
      setUndoMgr(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mxReady]);

  // Если поменялся маршрут (/graph/:id) — обновим локальный id
  useEffect(() => {
    setId(routeId || null);
  }, [routeId]);

  /** Загрузка диаграммы из БД, если id есть в URL */
  useEffect(() => {
    if (!graph || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const d = await getDiagram(id);
        if (cancelled) return;
        setName(d.name || "Диаграмма");
        setRegistryType(d.registry_type || d.registryType || "business_capabilities");
        setVersion(d.version ?? null);
        if (d.xml) {
          decodeXMLIntoGraph(graph, d.xml);
          setStatus("Диаграмма загружена");
        }
      } catch (e) {
        alert("Не удалось загрузить диаграмму: " + (e.message || e));
      }
    })();
    return () => { cancelled = true; };
  }, [graph, id]);

  /** Автосохранение (localStorage) */
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
        } catch { /* noop */ }
      }, 2000);
    }

    // Восстановление при первой инициализации (только если это новая диаграмма без id)
    try {
      const xml = localStorage.getItem(STORAGE_KEY);
      if (xml && !id) {
        decodeXMLIntoGraph(graph, xml);
        setStatus("Автосейв восстановлен");
      }
    } catch { /* noop */ }

    return () => { if (timer) clearInterval(timer); };
  }, [graph, autosaveOn, id]);

  /** Действия на графе */
  function deleteSelection(g) {
    if (!g) return;
    const cells = g.getSelectionCells();
    if (!cells?.length) return;
    g.removeCells(cells, true);
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

  /** Экспорт в XML (локально) */
  function onExportXML(g = graph) {
    if (!g) return;
    const xml = encodeGraphToXML(g);
    downloadText("diagram.xml", xml);
    setStatus("XML сохранён");
  }

  /** Импорт XML из файла */
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

  /** Экспорт в SVG (локально) */
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

  /** Сохранение диаграммы в БД (create/update c оптимистичной блокировкой) */
  async function saveToServer() {
    if (!graph) return;
    const xml = encodeGraphToXML(graph);

    try {
      if (!id) {
        // На create чаще ждут snake_case для registry_type — подстрахуемся
        const created = await createDiagram({ name, registry_type: registryType, xml });
        setId(created.id);
        setVersion(created.version ?? 1);
        setStatus("Диаграмма создана");
        // перейти на /graph/:id
        nav(`/graph/${encodeURIComponent(created.id)}`, { replace: true });
      } else {
        const updated = await updateDiagram(id, { name, xml, expectedVersion: version });
        setVersion(updated.version ?? (version ? version + 1 : 1));
        setStatus("Диаграмма обновлена");
      }
    } catch (e) {
      if (String(e.message) === "version-conflict") {
        alert("Конфликт версий: кто-то уже сохранил изменения. Обнови страницу и попробуй снова.");
      } else {
        alert("Ошибка сохранения: " + (e.message || e));
      }
    }
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
        onExportXML={() => onExportXML()}
        onExportSVG={exportSVG}
        onImportXMLClick={() => fileInputRef.current?.click()}
        onToggleAutosave={(e) => setAutosaveOn(e.target.checked)}
      />

      {/* Верхняя панель — имя/версия/сохранение и переход к списку */}
      <div className="flex items-center gap-2 px-2 py-2 border-b bg-white">
        <input
          className="border rounded px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя диаграммы"
        />
        <span className="text-xs text-gray-500">Реестр: {registryType}</span>
        {version != null && <span className="text-xs text-gray-500">Версия: {version}</span>}
        <button className="ml-auto px-3 py-1 rounded border hover:bg-gray-50" onClick={saveToServer}>
          Сохранить в БД
        </button>
        <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={() => nav("/grapheditor/diagrams")}>
          К списку диаграмм
        </button>
      </div>

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
