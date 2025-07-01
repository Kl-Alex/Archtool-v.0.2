import { useState, useRef, useEffect } from "react";
import axios from "axios";
import { MessageCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function AssistantPanel() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // {role: 'user' | 'assistant', content: string}
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const prompt = input.trim();
    if (!prompt) return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("/api/assistant", { prompt });
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.answer }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Ошибка: " + err.message },
      ]);
    }

    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center shadow-xl transition-all duration-200"
          title="AI Ассистент"
        >
          <MessageCircle size={28} />
        </button>
      )}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="w-[360px] sm:w-[400px] h-[500px] bg-white border border-gray-200 rounded-2xl shadow-2xl flex flex-col"
          >
            {/* Заголовок */}
            <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center rounded-t-2xl">
              <span className="text-sm font-semibold">AI Ассистент</span>
              <button onClick={() => setOpen(false)} className="hover:text-gray-200">
                <X size={20} />
              </button>
            </div>

            {/* Сообщения */}
            <div className="flex-1 p-4 space-y-2 overflow-y-auto text-sm">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`max-w-[85%] px-4 py-2 rounded-xl whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-blue-100 self-end ml-auto"
                      : "bg-gray-100 self-start mr-auto"
                  }`}
                >
                  {msg.content}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Поле ввода */}
            <div className="border-t bg-gray-50 px-4 py-3">
              <textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Введите сообщение..."
                className="w-full resize-none rounded-lg border border-gray-300 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading}
                className="mt-2 w-full py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition disabled:opacity-50"
              >
                {loading ? "Обработка..." : "Отправить"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
