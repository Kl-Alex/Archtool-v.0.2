import { useEffect } from "react";
import { X } from "lucide-react";

export default function Notification({ type = "info", message, onClose, duration = 3000 }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBgColor = () => {
    switch (type) {
      case "success":
        return "bg-green-100 border-green-500 text-green-700";
      case "error":
        return "bg-red-100 border-red-500 text-red-700";
      case "warning":
        return "bg-yellow-100 border-yellow-500 text-yellow-700";
      default:
        return "bg-blue-100 border-blue-500 text-blue-700";
    }
  };

  return (
    <div className={`fixed top-5 right-5 z-50 p-4 rounded shadow-lg border-l-4 ${getBgColor()} animate-slide-in`}>
      <div className="flex items-start justify-between gap-2">
        <div className="text-sm font-medium">{message}</div>
        <button onClick={onClose}>
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
