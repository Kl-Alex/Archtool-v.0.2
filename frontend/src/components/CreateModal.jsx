const CreateModal = ({ title, children, onClose, onSubmit, submitLabel = "Создать" }) => {
  const handleSubmit = async () => {
    const result = await onSubmit?.();
    if (result !== false) onClose(); // Закрываем, если не вернулось строго false
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center px-4">
      <div className="relative bg-white rounded-xl w-full max-w-xl p-6 shadow-2xl animate-fade-in">
        <button
          className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-red-500"
          onClick={onClose}
        >
          &times;
        </button>

        {title && <h2 className="text-xl font-bold text-lentaBlue mb-4">{title}</h2>}

        <div>{children}</div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            className="px-4 py-2 rounded border border-gray-300 text-gray-600 hover:bg-gray-100"
            onClick={onClose}
          >
            Отмена
          </button>
          <button
            className="px-4 py-2 rounded bg-lentaBlue text-white hover:bg-blue-700"
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
