import { Combobox } from "@headlessui/react";
import { useState } from "react";

const OwnerCombobox = ({ owners, selectedOwner, setSelectedOwner }) => {
  const [query, setQuery] = useState("");

  const filteredOwners =
    query === ""
      ? owners
      : owners.filter((owner) =>
  typeof owner === "string" &&
  owner.toLowerCase().includes(query.toLowerCase())
);

  return (
    <Combobox value={selectedOwner} onChange={setSelectedOwner}>
      <div className="relative">
        <Combobox.Input
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Все владельцы"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(owner) => owner}
        />
        <Combobox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-y-auto">
          <Combobox.Option value="">
            {({ active }) => (
              <div
                className={`px-4 py-2 ${
                  active ? "bg-lentaYellow text-white" : "text-black"
                }`}
              >
                Все владельцы
              </div>
            )}
          </Combobox.Option>
          {filteredOwners.map((owner) => (
            <Combobox.Option key={owner} value={owner}>
              {({ active }) => (
                <div
                  className={`px-4 py-2 ${
                    active ? "bg-lentaYellow text-white" : "text-black"
                  }`}
                >
                  {owner}
                </div>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

export default OwnerCombobox;
