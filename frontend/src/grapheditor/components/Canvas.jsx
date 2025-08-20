import { forwardRef } from "react";

/** Просто контейнер для mxGraph — сам граф создаётся в родителе */
const Canvas = forwardRef(function Canvas(_props, ref) {
  return (
    <div className="col-span-8 relative">
      <div ref={ref} className="absolute inset-0 bg-white" style={{ cursor: "grab" }} />
    </div>
  );
});

export default Canvas;
