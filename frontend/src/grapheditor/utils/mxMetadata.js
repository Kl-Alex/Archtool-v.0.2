// src/grapheditor/utils/mxMetadata.js
export function getCellBinding(cell) {
  if (!cell) return null;
  const v = cell.value;
  if (v && v.getAttribute) {
    const object_id = v.getAttribute("data-object-id");
    const object_type = v.getAttribute("data-object-type");
    const name = v.getAttribute("data-name");
    if (object_id && object_type) {
      return { object_id: Number(object_id), object_type, name: name || null };
    }
  }
  return null;
}

export function setCellBinding(graph, cell, { object_id, object_type, name }) {
  graph.getModel().beginUpdate();
  try {
    let v = cell.value;
    if (!v || !v.getAttribute) {
      const doc = document.implementation.createDocument("", "", null);
      v = doc.createElement("div");
      v.setAttribute("label", name || "");
    }
    if (name) v.setAttribute("data-name", name);
    v.setAttribute("data-object-id", String(object_id));
    v.setAttribute("data-object-type", object_type);
    cell.value = v;
    graph.refresh(cell);
  } finally {
    graph.getModel().endUpdate();
  }
}

export function clearCellBinding(graph, cell) {
  graph.getModel().beginUpdate();
  try {
    const v = cell.value;
    if (v && v.getAttribute) {
      v.removeAttribute("data-object-id");
      v.removeAttribute("data-object-type");
      v.removeAttribute("data-name");
      cell.value = v;
      graph.refresh(cell);
    }
  } finally {
    graph.getModel().endUpdate();
  }
}
