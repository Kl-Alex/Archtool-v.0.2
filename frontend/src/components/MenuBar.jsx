// src/components/MenuBar.jsx
export default function MenuBar({ exec, ui }) {
  const Item = ({ label, onClick, hotkey }) => (
    <div className="px-3 py-1 hover:bg-gray-100 cursor-pointer flex items-center gap-3"
         onClick={onClick} title={hotkey || ""}>
      <span>{label}</span>
      {hotkey && <span className="ml-auto text-xs text-gray-500">{hotkey}</span>}
    </div>
  );

  const Menu = ({ title, children }) => {
    return (
      <div className="relative group">
        <button className="px-3 py-1 hover:bg-gray-100 rounded">{title}</button>
        <div className="absolute hidden group-hover:block bg-white border rounded shadow z-50 min-w-[220px]">
          {children}
        </div>
      </div>
    );
  };

  const Divider = () => <div className="h-px bg-gray-200 my-1" />;

  return (
    <div className="flex gap-2 items-center px-2 h-10 border-b bg-white">
      {/* File */}
      <Menu title="File">
        <Item label="New" onClick={() => exec("file.new")} hotkey="Ctrl+N" />
        <Item label="Import..." onClick={() => exec("file.import")} />
        <Item label="Export XML" onClick={() => exec("file.export")} />
      </Menu>

      {/* Edit */}
      <Menu title="Edit">
        <Item label="Undo" onClick={() => exec("edit.undo")} hotkey="Ctrl+Z" />
        <Item label="Redo" onClick={() => exec("edit.redo")} hotkey="Ctrl+Y" />
        <Divider />
        <Item label="Cut" onClick={() => exec("edit.cut")} hotkey="Ctrl+X" />
        <Item label="Copy" onClick={() => exec("edit.copy")} hotkey="Ctrl+C" />
        <Item label="Paste" onClick={() => exec("edit.paste")} hotkey="Ctrl+V" />
        <Item label="Duplicate" onClick={() => exec("edit.duplicate")} hotkey="Ctrl+D" />
        <Item label="Delete" onClick={() => exec("edit.delete")} hotkey="Del" />
        <Divider />
        <Item label="Select All" onClick={() => exec("edit.selectAll")} hotkey="Ctrl+A" />
      </Menu>

      {/* View */}
      <Menu title="View">
        <Item label="Zoom In" onClick={() => exec("view.zoomIn")} hotkey="Ctrl++" />
        <Item label="Zoom Out" onClick={() => exec("view.zoomOut")} hotkey="Ctrl+-" />
        <Item label="Actual Size" onClick={() => exec("view.zoomActual")} hotkey="Ctrl+0" />
        <Item label="Fit" onClick={() => exec("view.fit")} />
        <Divider />
        <Item label={ui.grid ? "Grid ✓" : "Grid"} onClick={() => exec("view.grid")} />
        <Item label={ui.snapGuides ? "Guides ✓" : "Guides"} onClick={() => exec("view.guides")} />
        <Item label={ui.connectable ? "Connections ✓" : "Connections"} onClick={() => exec("view.connect")} />
      </Menu>

      {/* Arrange */}
      <Menu title="Arrange">
        <Item label="Group" onClick={() => exec("arrange.group")} hotkey="Ctrl+G" />
        <Item label="Ungroup" onClick={() => exec("arrange.ungroup")} hotkey="Ctrl+Shift+G" />
        <Divider />
        <Item label="Bring to Front" onClick={() => exec("arrange.toFront")} />
        <Item label="Send to Back" onClick={() => exec("arrange.toBack")} />
        <Divider />
        <Item label="Align Left" onClick={() => exec("arrange.alignLeft")} />
        <Item label="Align Right" onClick={() => exec("arrange.alignRight")} />
        <Item label="Align Top" onClick={() => exec("arrange.alignTop")} />
        <Item label="Align Bottom" onClick={() => exec("arrange.alignBottom")} />
        <Divider />
        <Item label="Distribute Horizontally" onClick={() => exec("arrange.distributeH")} />
        <Item label="Distribute Vertically" onClick={() => exec("arrange.distributeV")} />
        <Divider />
        <Item label="Hierarchical Layout" onClick={() => exec("arrange.layout.hier")} />
      </Menu>

      {/* Extras */}
      <Menu title="Extras">
        <Item label="Collapse All" onClick={() => exec("extras.collapseAll")} />
        <Item label="Expand All" onClick={() => exec("extras.expandAll")} />
      </Menu>

      {/* Help */}
      <Menu title="Help">
        <Item label="About" onClick={() => exec("help.about")} />
      </Menu>
    </div>
  );
}
