import { useEffect } from "react";
import { X } from "lucide-react";

export default function Notification({ type = "info", message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getStyle = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-500 text-green-800";
      case "error":
        return "bg-red-50 border-red-500 text-red-800";
      case "warning":
        return "bg-yellow-50 border-yellow-500 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-500 text-blue-800";
    }
  };

  return (
    <div className={`fixed top-5 right-5 z-50 max-w-xs w-full border-l-4 px-4 py-3 rounded-md shadow-md transition-all animate-fade-in ${getStyle()}`}>
      <div className="flex justify-between items-start gap-3">
        <div className="text-sm leading-snug">{message}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
