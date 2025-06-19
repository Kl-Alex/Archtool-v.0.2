import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

export default function DictionaryManager() {
  const [availableDictionaries, setAvailableDictionaries] = useState([]);
  const [selectedDict, setSelectedDict] = useState("");
  const [values, setValues] = useState([]);
  const [newValue, setNewValue] = useState("");

  // Загрузка списка доступных справочников
  useEffect(() => {
    fetch("/api/dictionaries", {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
      .then(res => res.json())
      .then(data => {
        setAvailableDictionaries(data);
        if (data.length > 0) {
          setSelectedDict(data[0]);
        }
      });
  }, []);

  // Загрузка значений текущего справочника
  useEffect(() => {
    if (!selectedDict) return;

    fetch(`/api/dictionaries/${selectedDict}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(res => res.json())
      .then(data => setValues(data));
  }, [selectedDict]);

  const addValue = async () => {
    if (!newValue.trim()) return;

    const res = await fetch(`/api/dictionaries/${selectedDict}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`
      },
      body: JSON.stringify({ value: newValue.trim() })
    });

    if (res.ok) {
      setNewValue("");
      const updated = await fetch(`/api/dictionaries/${selectedDict}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      }).then(res => res.json());
      setValues(updated);
    }
  };

  const deleteValue = async (id) => {
    const res = await fetch(`/api/dictionaries/${selectedDict}/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${getToken()}` }
    });

    if (res.ok) {
      setValues(prev => prev.filter(v => v.id !== id));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold">Управление справочниками</h2>

      <div className="flex gap-4 items-center">
        <label className="font-medium">Справочник:</label>
        <select
          value={selectedDict}
          onChange={e => setSelectedDict(e.target.value)}
          className="p-2 border rounded"
        >
          {availableDictionaries.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {selectedDict && (
        <>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              placeholder="Новое значение"
              className="p-2 border rounded w-64"
            />
            <button
              onClick={addValue}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Добавить
            </button>
          </div>

          <ul className="border rounded p-2 max-w-md divide-y text-sm">
            {values.map(v => (
              <li key={v.id} className="flex justify-between items-center py-1 px-2">
                <span>{v.value}</span>
                <button
                  onClick={() => deleteValue(v.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Удалить
                </button>
              </li>
            ))}
            {values.length === 0 && <li className="text-gray-500 py-2 px-2">Нет значений</li>}
          </ul>
        </>
      )}
    </div>
  );
}
