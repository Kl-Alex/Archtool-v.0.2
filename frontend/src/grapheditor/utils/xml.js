/** Кодирование модели графа в XML-строку */
export function encodeGraphToXML(graph) {
  const { mxCodec, mxUtils } = window;
  const enc = new mxCodec();
  const node = enc.encode(graph.getModel());
  return mxUtils.getXml(node);
}

/** Декодирование XML-строки в текущий граф (заменяет содержимое) */
export function decodeXMLIntoGraph(graph, xml) {
  const { mxUtils, mxCodec } = window;
  const doc = mxUtils.parseXml(xml);
  const decoder = new mxCodec(doc);
  graph.getModel().beginUpdate();
  try {
    graph.removeCells(graph.getChildVertices(graph.getDefaultParent()));
    decoder.decode(doc.documentElement, graph.getModel());
  } finally {
    graph.getModel().endUpdate();
  }
}
