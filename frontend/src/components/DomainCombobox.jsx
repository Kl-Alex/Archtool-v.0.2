import { Combobox } from "@headlessui/react";
import { useState } from "react";

const DomainCombobox = ({ domains, selectedDomain, setSelectedDomain }) => {
  const [query, setQuery] = useState("");

  const filteredDomains =
    query === ""
      ? domains
      : domains.filter((domain) =>
          domain.toLowerCase().includes(query.toLowerCase())
        );

  return (
    <Combobox value={selectedDomain} onChange={setSelectedDomain}>
      <div className="relative">
        <Combobox.Input
          className="w-full border border-gray-300 rounded p-2"
          placeholder="Все домены"
          onChange={(event) => setQuery(event.target.value)}
          displayValue={(domain) => domain}
        />
        <Combobox.Options className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow max-h-60 overflow-y-auto">
          <Combobox.Option value="">
            {({ active }) => (
              <div
                className={`px-4 py-2 ${
                  active ? "bg-lentaYellow text-white" : "text-black"
                }`}
              >
                Все домены
              </div>
            )}
          </Combobox.Option>
          {filteredDomains.map((domain) => (
            <Combobox.Option key={domain} value={domain}>
              {({ active }) => (
                <div
                  className={`px-4 py-2 ${
                    active ? "bg-lentaYellow text-white" : "text-black"
                  }`}
                >
                  {domain}
                </div>
              )}
            </Combobox.Option>
          ))}
        </Combobox.Options>
      </div>
    </Combobox>
  );
};

export default DomainCombobox;
