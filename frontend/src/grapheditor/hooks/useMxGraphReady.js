import { useEffect, useState } from "react";

/** Подгружает mxGraph с CDN один раз и возвращает ready=true */
export default function useMxGraphReady() {
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
