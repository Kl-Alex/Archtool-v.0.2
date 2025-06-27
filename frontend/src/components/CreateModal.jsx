import { useState, useEffect } from "react";

const CreateModal = ({ title, children, onClose, onSubmit, submitLabel = "Создать" }) => {
  const [shake, setShake] = useState(false);

  // Обработка кнопки Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSubmit = async () => {
    const result = await onSubmit?.();
    if (result === false) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
      <div
        className={`relative bg-white rounded-2xl w-full max-w-lg sm:max-w-xl p-6 shadow-xl animate-fade-in ${shake ? 'animate-shake' : ''}`}
      >
        <button
          className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-red-500 transition"
          onClick={onClose}
        >
          &times;
        </button>

        {title && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
            <div className="h-[2px] bg-gray-100 mt-2" />
          </div>
        )}

        <div>{children}</div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-600 hover:bg-gray-100 transition"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 rounded-md bg-lentaBlue text-sm text-white hover:bg-blue-700 transition"
            onClick={handleSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateModal;
