// src/actions/graphActions.js
export function createActionRegistry(getGraph, deps = {}) {
  const g = () => getGraph?.();
  const A = {};

  const withModel = (fn) => {
    const graph = g(); if (!graph) return;
    graph.getModel().beginUpdate();
    try { fn(graph); } finally { graph.getModel().endUpdate(); }
  };

  // ==== File ====
  A["file.new"] = () => { withModel(graph => graph.getModel().clear()); };
  A["file.import"] = (openFile) => openFile?.();
  A["file.export"] = (exportXml) => exportXml?.();

  // ==== Edit ====
  A["edit.undo"]    = () => deps.undo?.undo();
  A["edit.redo"]    = () => deps.undo?.redo();
  A["edit.cut"]     = () => window.mxClipboard?.cut(g());
  A["edit.copy"]    = () => window.mxClipboard?.copy(g());
  A["edit.paste"]   = () => window.mxClipboard?.paste(g());
  A["edit.delete"]  = () => g()?.removeCells();
  A["edit.duplicate"] = () => {
    const graph = g(); if (!graph) return;
    const cells = graph.getSelectionCells();
    if (!cells?.length) return;
    const clones = graph.cloneCells(cells, 20, 20);
    graph.setSelectionCells(graph.importCells(clones, 20, 20));
  };
  A["edit.selectAll"] = () => {
    const graph = g(); if (!graph) return;
    const parent = graph.getDefaultParent();
    graph.selectCells(true, true, parent);
  };

  // ==== View ====
  A["view.zoomIn"]    = () => g()?.zoomIn();
  A["view.zoomOut"]   = () => g()?.zoomOut();
  A["view.zoomActual"]= () => g()?.zoomActual();
  A["view.fit"]       = () => g()?.fit(10, false, false, false);
  A["view.grid"]      = () => { const gr = g(); if (!gr) return; gr.setGridEnabled(!gr.isGridEnabled()); };
  A["view.guides"]    = () => { const gr = g(); if (!gr) return; gr.graphHandler.guidesEnabled = !gr.graphHandler.guidesEnabled; };
  A["view.connect"]   = () => { const gr = g(); if (!gr) return; gr.setConnectable(!gr.connectionHandler.isEnabled()); };

  // ==== Arrange ====
  A["arrange.group"]    = () => g()?.groupCells();
  A["arrange.ungroup"]  = () => g()?.ungroupCells();
  A["arrange.toFront"]  = () => g()?.orderCells(true);
  A["arrange.toBack"]   = () => g()?.orderCells(false);

  const alignBy = (dir) => withModel(graph => {
    const cells = graph.getSelectionCells()?.filter(c => graph.getModel().isVertex(c));
    if (!cells || cells.length < 2) return;
    const base = cells[0]; const bg = graph.getCellGeometry(base); if (!bg) return;
    cells.slice(1).forEach(c => {
      const geo = graph.getCellGeometry(c); if (!geo) return;
      const ng = geo.clone();
      if (dir === "left")   ng.x = bg.x;
      if (dir === "right")  ng.x = bg.x + bg.width - geo.width;
      if (dir === "top")    ng.y = bg.y;
      if (dir === "bottom") ng.y = bg.y + bg.height - geo.height;
      graph.getModel().setGeometry(c, ng);
    });
  });

  A["arrange.alignLeft"]   = () => alignBy("left");
  A["arrange.alignRight"]  = () => alignBy("right");
  A["arrange.alignTop"]    = () => alignBy("top");
  A["arrange.alignBottom"] = () => alignBy("bottom");

  const distribute = (axis) => withModel(graph => {
    const cells = graph.getSelectionCells()?.filter(c => graph.getModel().isVertex(c));
    if (!cells || cells.length < 3) return;
    const geos = cells.map(c => ({ c, g: graph.getCellGeometry(c) })).filter(x => x.g);
    const sorted = geos.sort((a,b) => axis==='x' ? a.g.x - b.g.x : a.g.y - b.g.y);
    const first = sorted[0].g, last = sorted[sorted.length-1].g;
    const totalSpan = axis==='x' ? (last.x - first.x) : (last.y - first.y);
    const gaps = sorted.length - 1;
    const step = totalSpan / gaps;
    for (let i=1;i<sorted.length-1;i++){
      const { c, g } = sorted[i];
      const ng = g.clone();
      if (axis==='x') ng.x = first.x + step*i;
      else            ng.y = first.y + step*i;
      graph.getModel().setGeometry(c, ng);
    }
  });

  A["arrange.distributeH"] = () => distribute("x");
  A["arrange.distributeV"] = () => distribute("y");

  A["arrange.layout.hier"] = () => withModel(graph => {
    const layout = new window.mxHierarchicalLayout(graph, window.mxConstants.DIRECTION_WEST);
    layout.interRankCellSpacing = 60;
    layout.intraCellSpacing = 40;
    layout.execute(graph.getDefaultParent());
  });

  // ==== Extras ====
  A["extras.collapseAll"] = () => {
    const graph = g(); if (!graph) return;
    const parent = graph.getDefaultParent();
    graph.foldCells(true, true, graph.getChildCells(parent, true, false));
  };
  A["extras.expandAll"] = () => {
    const graph = g(); if (!graph) return;
    const parent = graph.getDefaultParent();
    graph.foldCells(false, true, graph.getChildCells(parent, true, false));
  };

  // ==== Help ====
  A["help.about"] = () => alert("Archtool Diagram Editor — mxGraph");

  return (actionId, payload) => {
    const fn = A[actionId];
    if (fn) fn(payload);
    else console.warn("Unknown action:", actionId);
  };
}
