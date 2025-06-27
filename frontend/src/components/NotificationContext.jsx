import { createContext, useContext, useState, useCallback } from "react";
import Notification from "./Notification";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((type, message, duration = 3000) => {
    // Не дублируем одинаковые активные уведомления
    const exists = notifications.find(n => n.message === message && n.type === type);
    if (exists) return;

    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message, duration }]);

    // Автоудаление через timeout
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration + 100); // небольшая задержка для fade-out (если будет)
  }, [notifications]);

  // Упрощённые методы
  const notifySuccess = (msg, duration) => showNotification("success", msg, duration);
  const notifyError = (msg, duration) => showNotification("error", msg, duration);
  const notifyInfo = (msg, duration) => showNotification("info", msg, duration);
  const notifyWarning = (msg, duration) => showNotification("warning", msg, duration);

  return (
    <NotificationContext.Provider value={{ notifySuccess, notifyError, notifyInfo, notifyWarning }}>
      {children}
      <div className="fixed top-5 right-5 z-[100] flex flex-col gap-2">
        {notifications.map((n) => (
          <Notification
            key={n.id}
            type={n.type}
            message={n.message}
            duration={n.duration}
            onClose={() => setNotifications((prev) => prev.filter((note) => note.id !== n.id))}
          />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
