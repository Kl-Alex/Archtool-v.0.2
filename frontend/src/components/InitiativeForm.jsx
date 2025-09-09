import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { getToken } from "../utils/auth";

const InitiativeForm = forwardRef(({ onCreated, existingData, notifyError }, ref) => {
  const [objectTypeId, setObjectTypeId] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [attributeValues, setAttributeValues] = useState({});
  const [errors, setErrors] = useState({});

  const authHeaders = () => ({
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  });

  useEffect(() => {
    const load = async () => {
      try {
        const tRes = await fetch("/api/object_types", { headers: authHeaders() });
        const types = await tRes.json();
        const type = Array.isArray(types) ? types.find(t => t.name === "Инициатива") : null;
        if (!type) throw new Error("Тип объекта «Инициатива» не найден");
        setObjectTypeId(type.id);

        const aRes = await fetch(`/api/object_types/${type.id}/attributes`, { headers: authHeaders() });
        const attrs = await aRes.json();
        setAttributes(Array.isArray(attrs) ? attrs : []);

        if (existingData?.attributes) {
          const map = {};
          for (const attr of attrs || []) {
            const found = existingData.attributes.find(a => a.attribute_id === attr.id);
            if (found) {
              map[attr.id] = attr.is_multiple ? safeParseArray(found.value_text) : (found.value_text ?? "");
            }
          }
          // частые «скалярные» поля (если приходят плоско)
          if (existingData.name) map[__nameKey(attrs)] = existingData.name;
          setAttributeValues(map);
        }
      } catch (e) {
        notifyError?.(e.message || "Ошибка инициализации формы");
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingData?.id]);

  const setVal = (attrId, v) => {
    setAttributeValues(prev => ({ ...prev, [attrId]: v }));
    setErrors(prev => ({ ...prev, [attrId]: false }));
  };

  const submit = async () => {
    const errs = {};
    attributes.forEach(a => {
      const val = attributeValues[a.id];
      const empty = (val === undefined || val === null || val === "" || (a.is_multiple && Array.isArray(val) && val.length === 0));
      if (a.is_required && empty) errs[a.id] = true;
    });
    setErrors(errs);
    if (Object.keys(errs).length) {
      notifyError?.("Заполните обязательные поля");
      return false;
    }

    const payload = {
      object_type_id: objectTypeId,
      attributes: Object.entries(attributeValues).map(([id, val]) => {
        const a = attributes.find(x => x.id === Number(id));
        return {
          attribute_id: Number(id),
          value: a?.is_multiple ? JSON.stringify(val ?? []) : (val ?? "")
        };
      }),
    };

    let url = "/api/initiatives";
    let method = "POST";
    if (existingData?.id) { url = `/api/initiatives/${existingData.id}`; method = "PUT"; }

    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(payload) });
    if (!res.ok) {
      notifyError?.("Ошибка сохранения");
      return false;
    }
    const result = await res.json();
    onCreated?.(result?.id || existingData?.id);
    return true;
  };

  useImperativeHandle(ref, () => ({ submit }));

  const filtered = attributes.filter(a => !["level","parent_id","parent_name"].includes(a.name));

  return (
    <form className="bg-white p-6 rounded-xl shadow border space-y-4 text-sm">
      {filtered.map(a => (
        <div key={a.id} className="flex flex-col">
          <label className="text-sm font-medium text-gray-700 mb-1">
            {a.display_name || a.name}
            {a.is_required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <FieldControl
            attr={a}
            value={attributeValues[a.id]}
            onChange={v => setVal(a.id, v)}
            error={errors[a.id]}
          />
        </div>
      ))}
    </form>
  );
});

export default InitiativeForm;

function FieldControl({ attr, value, onChange, error }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dictOptions, setDictOptions] = useState([]);
  const [loadedDict, setLoadedDict] = useState("");

  const isMultiple = !!attr.is_multiple;
  const selected = value ?? (isMultiple ? [] : "");

  // dict load
  useEffect(() => {
    const dictName = typeof attr.dictionary_name === "object" ? attr.dictionary_name?.String : attr.dictionary_name;
    if (dictName && loadedDict !== dictName) {
      fetch(`/api/dictionaries/${dictName}`, { headers: { Authorization: `Bearer ${getToken()}` } })
        .then(r => r.json())
        .then(data => {
          setDictOptions(Array.isArray(data) ? data.map(d => d.value) : []);
          setLoadedDict(dictName);
        })
        .catch(()=> setDictOptions([]));
    }
  }, [attr.dictionary_name, loadedDict]);

  const rawOptions = attr.dictionary_name ? dictOptions
    : Array.isArray(attr.options) ? attr.options.map(o => typeof o==="string"? o : o.value)
    : typeof attr.options === "string" ? safeParseArray(attr.options) : [];

  const filtered = (rawOptions || []).filter(o => String(o).toLowerCase().includes(search.toLowerCase()));

  if (attr.type === "date") {
    return (
      <input
        type="text"
        placeholder="дд.мм.гггг, мм.гггг, q1.2025, 2025"
        value={selected || ""}
        onChange={e=>onChange(e.target.value)}
        className={`w-full px-3 py-2 border rounded ${error? "border-red-500 ring-1 ring-red-300":"border-gray-300 focus:ring-2 focus:ring-blue-100"}`}
      />
    );
  }

  if (attr.type === "select" && isMultiple) {
    const arr = Array.isArray(selected) ? selected : safeParseArray(selected);
    return (
      <div className="relative">
        <div className="flex flex-wrap gap-1 mb-1">
          {(arr||[]).map(opt=>(
            <span key={String(opt)} className="bg-blue-50 text-blue-800 text-xs px-2 py-1 rounded-full border border-blue-200">
              {String(opt)}
              <button type="button" className="ml-1 font-bold" onClick={()=>onChange(arr.filter(v=>v!==opt))}>×</button>
            </span>
          ))}
        </div>
        <input
          className={`w-full px-3 py-2 border rounded ${error? "border-red-500 ring-1 ring-red-300":"border-gray-300 focus:ring-2 focus:ring-blue-100"}`}
          placeholder="Поиск и выбор…"
          value={search}
          onChange={e=>setSearch(e.target.value)}
          onFocus={()=>setIsOpen(true)}
          onBlur={()=>setTimeout(()=>setIsOpen(false),150)}
        />
        {isOpen && filtered.length>0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-48 overflow-y-auto p-2 space-y-1">
            {filtered.map(opt=>(
              <label key={String(opt)} className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded cursor-pointer">
                <input type="checkbox" className="h-4 w-4"
                  checked={arr.includes(opt)}
                  onChange={e=>{
                    onChange(e.target.checked ? [...arr,opt] : arr.filter(v=>v!==opt));
                  }}
                />
                <span>{String(opt)}</span>
              </label>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (attr.type === "select") {
    return (
      <div className="relative">
        <input
          className={`w-full px-3 py-2 border rounded ${error? "border-red-500 ring-1 ring-red-300":"border-gray-300 focus:ring-2 focus:ring-blue-100"}`}
          placeholder="Выберите…"
          value={search || selected}
          onChange={e=>{ setSearch(e.target.value); onChange(e.target.value); }}
          onFocus={()=>setIsOpen(true)}
          onBlur={()=>setTimeout(()=>setIsOpen(false),150)}
        />
        {isOpen && filtered.length>0 && (
          <ul className="absolute z-10 w-full bg-white border rounded shadow mt-1 max-h-40 overflow-y-auto">
            {filtered.map(opt=>(
              <li key={String(opt)} className="px-3 py-1 hover:bg-blue-100 cursor-pointer"
                  onClick={()=>{ onChange(opt); setSearch(String(opt)); setIsOpen(false); }}>
                {String(opt)}
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <input
      type="text"
      value={selected}
      onChange={e=>onChange(e.target.value)}
      className={`w-full px-3 py-2 border rounded ${error? "border-red-500 ring-1 ring-red-300":"border-gray-300 focus:ring-2 focus:ring-blue-100"}`}
    />
  );
}

function safeParseArray(x){
  try { const v = typeof x === "string" ? JSON.parse(x) : x; return Array.isArray(v) ? v : []; }
  catch { return []; }
}