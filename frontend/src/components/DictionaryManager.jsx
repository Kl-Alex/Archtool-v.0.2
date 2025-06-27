import { useEffect, useState } from "react";
import { getToken } from "../utils/auth";

export default function DictionaryManager() {
  const [availableDictionaries, setAvailableDictionaries] = useState([]);
  const [selectedDict, setSelectedDict] = useState("");
  const [values, setValues] = useState([]);
  const [newValue, setNewValue] = useState("");

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
    <div className="mt-8 ml-6 max-w-3xl">
      <h2 className="text-2xl font-semibold text-gray-800 mb-6">Справочники</h2>

      <div className="bg-white shadow-sm rounded-lg p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Выберите справочник</label>
          <select
            value={selectedDict}
            onChange={e => setSelectedDict(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            {availableDictionaries.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {selectedDict && (
          <>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Новое значение</label>
                <input
                  type="text"
                  value={newValue}
                  onChange={e => setNewValue(e.target.value)}
                  placeholder="Введите значение"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
              </div>
              <button
                onClick={addValue}
                className="h-10 px-4 text-sm border border-gray-300 bg-white hover:bg-gray-100 rounded-md"
              >
                Добавить
              </button>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Значения справочника</h3>
              <ul className="divide-y border border-gray-200 rounded-md">
                {values.map(v => (
                  <li key={v.id} className="flex justify-between items-center px-4 py-2 text-sm">
                    <span>{v.value}</span>
                    <button
                      onClick={() => deleteValue(v.id)}
                      className="text-red-500 hover:text-red-600 text-xs"
                    >
                      удалить
                    </button>
                  </li>
                ))}
                {values.length === 0 && (
                  <li className="px-4 py-2 text-sm text-gray-500">Нет значений</li>
                )}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
