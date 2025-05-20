import { Combobox } from "@headlessui/react";
import { useState } from "react";

const LevelCombobox = ({ levels, selectedLevel, setSelectedLevel }) => {
  const [query, setQuery] = useState("");

  const filteredLevels =
    query === ""
      ? levels
      : levels.filter((level) =>
          level.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox value={selectedLevel} onChange={setSelectedLevel}>
      <div className="relative">
        <Combobox.Input
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Все уровни"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(level) => level}
        />
        <Combobox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-y-auto">
          <Combobox.Option value="">
            {({ active }) => (
              <div
                className={`px-4 py-2 ${
                  active ? "bg-lentaYellow text-white" : "text-black"
                }`}
              >
                Все уровни
              </div>
            )}
          </Combobox.Option>
          {filteredLevels.map((level) => (
            <Combobox.Option key={level} value={level}>
              {({ active }) => (
                <div
                  className={`px-4 py-2 ${
                    active ? "bg-lentaYellow text-white" : "text-black"
                  }`}
                >
                  {level}
                </div>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

export default LevelCombobox;
