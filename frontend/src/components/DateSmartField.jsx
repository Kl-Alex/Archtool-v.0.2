function DateSmartField({ value, onChange, error }) {
  // определяем текущий режим по значению
  const detectMode = (v) => {
    if (DATE_PATTERNS.full.test(v)) return "day";
    if (DATE_PATTERNS.month.test(v)) return "month";
    if (DATE_PATTERNS.quarter.test(v)) return "quarter";
    if (DATE_PATTERNS.year.test(v)) return "year";
    return "day";
  };

  const [mode, setMode] = useState(detectMode(String(value || "")));
  const [local, setLocal] = useState(String(value || ""));
  const [hint, setHint] = useState("");

  useEffect(() => {
    setMode(detectMode(String(value || "")));
    setLocal(String(value || ""));
  }, [value]);

  // валидация на лету
  useEffect(() => {
    const msg = validateDateValue(local);
    setHint(msg || "");
  }, [local]);

  const baseInputCls =
    `w-full px-3 py-2 border rounded-md text-sm ` +
    (error || hint ? "border-red-500 ring-1 ring-red-300" : "border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-100");

  return (
    <div className="space-y-2">
      {/* Переключатель режимов */}
      <div className="inline-flex rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {[
          { key: "day", label: "День" },
          { key: "month", label: "Месяц" },
          { key: "quarter", label: "Квартал" },
          { key: "year", label: "Год" },
        ].map((m) => (
          <button
            type="button"
            key={m.key}
            className={`px-3 py-1.5 text-sm transition ${
              mode === m.key ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 text-gray-700"
            }`}
            onClick={() => {
              setMode(m.key);
              // при смене режима подчищаем локальное значение в подходящий шаблон
              const normalized = coerceToTemplate(local, m.key);
              setLocal(normalized);
              onChange?.(normalized);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Поле ввода для каждого режима */}
      {mode === "day" && (
        // даём нативный календарь, но конвертируем в dd.mm.yyyy
        <input
          type="date"
          className={baseInputCls}
          value={toNativeDate(local) /* yyyy-mm-dd */}
          onChange={(e) => {
            const next = fromNativeDate(e.target.value); // dd.mm.yyyy
            setLocal(next);
            onChange?.(next);
          }}
        />
      )}

      {mode === "month" && (
        <input
          type="month"
          className={baseInputCls}
          value={toNativeMonth(local) /* yyyy-mm */}
          onChange={(e) => {
            const next = fromNativeMonth(e.target.value); // mm.yyyy
            setLocal(next);
            onChange?.(next);
          }}
        />
      )}

      {mode === "quarter" && (
        <div className="flex gap-2">
          <select
            className={baseInputCls}
            value={extractQuarter(local) /* q1..q4 */}
            onChange={(e) => {
              const next = `q${clampQuarter(e.target.value)}.${extractYear(local) || new Date().getFullYear()}`;
              setLocal(next);
              onChange?.(next);
            }}
          >
            <option value="q1">Q1</option>
            <option value="q2">Q2</option>
            <option value="q3">Q3</option>
            <option value="q4">Q4</option>
          </select>
          <input
            type="number"
            className={baseInputCls}
            placeholder="Год"
            min={1900}
            max={2100}
            value={extractYear(local) || ""}
            onChange={(e) => {
              const y = sanitizeYear(e.target.value);
              const next = `q${clampQuarter(extractQuarter(local))}.${y}`;
              setLocal(next);
              onChange?.(next);
            }}
          />
        </div>
      )}

      {mode === "year" && (
        <input
          type="number"
          className={baseInputCls}
          placeholder="Год (напр. 2025)"
          min={1900}
          max={2100}
          step={1}
          value={extractYear(local) || ""}
          onChange={(e) => {
            const y = sanitizeYear(e.target.value);
            setLocal(y);
            onChange?.(y);
          }}
        />
      )}

      {/* Тонкая строка помощи + свободное поле (опционально) */}
      <div className="text-xs text-gray-500">
        Допустимые форматы: <code>дд.мм.гггг</code>, <code>мм.гггг</code>, <code>q1.гггг</code>, <code>гггг</code>.
      </div>
      {hint && <div className="text-xs text-red-600">{hint}</div>}

      {/* Свободный ввод (с авто-парсингом) */}
      <input
        type="text"
        className={`${baseInputCls} bg-gray-50`}
        placeholder="или введите вручную: 31.12.2025 / 12.2025 / q4.2025 / 2025"
        value={local}
        onChange={(e) => {
          const v = e.target.value;
          setLocal(v);
          onChange?.(v); // родитель проверит ещё раз на submit
          setMode(detectMode(v));
        }}
      />
    </div>
  );
}
export default DateSmartField