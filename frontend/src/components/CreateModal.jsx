import { useState, useEffect, useRef } from "react";

const CreateModal = ({
  title,
  children,
  onClose,
  onSubmit,
  submitLabel = "Создать",
  closeOnBackdrop = true,
}) => {
  const [shake, setShake] = useState(false);
  const containerRef = useRef(null);

  // Esc + блокируем прокрутку боди
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "enter") {
        handleSubmit();
      }
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSubmit = async () => {
    const result = await onSubmit?.();
    if (result === false) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      onClose?.();
    }
  };

  const onBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
      onMouseDown={onBackdropClick}
    >
      <div
        ref={containerRef}
        className={`relative bg-white rounded-2xl w-full max-w-3xl shadow-xl animate-fade-in ${shake ? "animate-shake" : ""} flex flex-col max-h-[90vh]`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">{title}</h2>
          <button
            className="text-2xl leading-none text-gray-400 hover:text-red-500 transition"
            onClick={onClose}
            aria-label="Закрыть"
          >
            &times;
          </button>
        </div>

        {/* Body (scrollable) */}
        <div className="px-6 py-4 overflow-y-auto">
          {children}
        </div>

        {/* Footer (sticky) */}
        <div className="px-6 py-3 border-t bg-white sticky bottom-0 flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 transition"
            onClick={onClose}
            type="button"
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 rounded-md bg-lentaBlue text-sm text-white hover:bg-blue-700 transition"
            onClick={handleSubmit}
            type="button"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
