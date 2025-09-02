export default function Toolbar({
  onBindObject,
  gridEnabled,
  autosaveOn,
  zoom,
  status,
  onAddRect,
  onAddEllipse,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleGrid,
  onExportXML,
  onExportSVG,
  onImportXMLClick,
  onToggleAutosave,
}) {
  return (
    <div className="flex items-center gap-2 p-2 border-b bg-white">
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onAddRect} title="Добавить прямоугольник">
        + Прямоугольник
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onAddEllipse} title="Добавить эллипс">
        + Эллипс
      </button>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onZoomIn} title="Zoom In (Ctrl + +)">
        Zoom +
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onZoomOut} title="Zoom Out (Ctrl + -)">
        Zoom -
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onFit} title="Вписать в экран">
        Fit
      </button>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <button
        className={`px-3 py-1 rounded border hover:bg-gray-50 ${gridEnabled ? "bg-gray-50" : ""}`}
        onClick={onToggleGrid}
        title="Сетка (Ctrl+G)"
      >
        Сетка: {gridEnabled ? "Вкл" : "Выкл"}
      </button>

      <div className="h-6 w-px bg-gray-200 mx-1" />

      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onExportXML} title="Сохранить XML (Ctrl+S)">
        Экспорт XML
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onExportSVG} title="Экспорт SVG">
        Экспорт SVG
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onImportXMLClick} title="Открыть XML (Ctrl+O)">
        Импорт XML
      </button>
      <button className="px-3 py-1 rounded border hover:bg-gray-50" onClick={onBindObject}>
        Привязать объект
      </button>

      <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
        <span>Масштаб: {(zoom * 100).toFixed(0)}%</span>
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" className="rounded border-gray-300" checked={autosaveOn} onChange={onToggleAutosave} />
          Автосохранение
        </label>
        <span className="text-gray-400">| {status}</span>
      </div>
    </div>
  );
}
