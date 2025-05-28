import { createContext, useContext, useState, useCallback } from "react";
import Notification from "./Notification";

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = useCallback((type, message, duration = 3000) => {
    const id = Date.now();
    setNotifications((prev) => [...prev, { id, type, message, duration }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, duration);
  }, []);

  const notifySuccess = (msg, duration) => showNotification("success", msg, duration);
  const notifyError = (msg, duration) => showNotification("error", msg, duration);
  const notifyInfo = (msg, duration) => showNotification("info", msg, duration);
  const notifyWarning = (msg, duration) => showNotification("warning", msg, duration);

  return (
    <NotificationContext.Provider value={{ notifySuccess, notifyError, notifyInfo, notifyWarning }}>
      {children}
      {notifications.map((n) => (
        <Notification
          key={n.id}
          type={n.type}
          message={n.message}
          duration={n.duration}
          onClose={() =>
            setNotifications((prev) => prev.filter((note) => note.id !== n.id))
          }
        />
      ))}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
