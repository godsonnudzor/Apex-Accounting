import { useEffect, useMemo, useState } from "react";

const TABS = ["Display", "Filters", "Header/Footer", "Fonts & Numbers"];
const DATE_RANGES = [
  ["all", "All"],
  ["today", "Today"],
  ["this-week", "This Week"],
  ["this-month", "This Month"],
  ["this-quarter", "This Quarter"],
  ["this-year", "This Year"],
  ["last-month", "Last Month"],
  ["last-year", "Last Year"],
  ["custom", "Custom"],
];
const FONTS = [
  ["Arial, sans-serif", "Arial"],
  ["Segoe UI, sans-serif", "Segoe UI"],
  ["Georgia, serif", "Georgia"],
  ["monospace", "Monospace"],
];
const NUMBER_FORMATS = [
  ["parentheses", "(1,234.00)"],
  ["minus", "-1,234.00"],
];

const QuickReportCustomize = ({
  accountName,
  columns,
  settings,
  transactionTypes,
  onApply,
  onCancel,
}) => {
  const [tab, setTab] = useState("Display");
  const [draft, setDraft] = useState(settings);
  const [columnSearch, setColumnSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        if (helpOpen) {
          setHelpOpen(false);
        } else {
          onCancel();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [helpOpen, onCancel]);

  const visibleColumnRows = useMemo(
    () =>
      draft.columnOrder
        .map((key) => columns.find((column) => column[0] === key))
        .filter(
          (column) =>
            column &&
            column[1].toLowerCase().includes(columnSearch.toLowerCase()),
        ),
    [columnSearch, columns, draft.columnOrder],
  );

  const update = (key, value) => {
    setError("");
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateColumn = (key, checked) => {
    const next = { ...draft.visibleColumns, [key]: checked };
    if (!Object.values(next).some(Boolean)) {
      setError("Select at least one column to display.");
      return;
    }
    setError("");
    update("visibleColumns", next);
  };

  const moveColumn = (key, direction) => {
    const index = draft.columnOrder.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= draft.columnOrder.length) return;
    const columnOrder = [...draft.columnOrder];
    [columnOrder[index], columnOrder[target]] = [
      columnOrder[target],
      columnOrder[index],
    ];
    update("columnOrder", columnOrder);
  };

  const apply = () => {
    if (draft.dateRange === "custom" && draft.fromDate && draft.toDate && draft.fromDate > draft.toDate) {
      setError("The start date must be on or before the end date.");
      return;
    }
    if (!Object.values(draft.visibleColumns).some(Boolean)) {
      setError("Select at least one column to display.");
      return;
    }
    onApply(draft);
  };

  const toggleType = (type) => {
    const selected = draft.transactionTypes.includes(type)
      ? draft.transactionTypes.filter((value) => value !== type)
      : [...draft.transactionTypes, type];
    update("transactionTypes", selected);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-3 sm:p-6 print:hidden"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        aria-labelledby="quick-report-customize-title"
        aria-modal="true"
        className="quick-report-customize-dialog flex max-h-[92vh] w-full max-w-[930px] flex-col overflow-hidden border border-slate-400 bg-white text-sm text-slate-900 shadow-2xl"
        role="dialog"
      >
        <header className="flex items-center justify-between bg-gradient-to-b from-slate-700 to-slate-800 px-4 py-2 text-white">
          <h2 id="quick-report-customize-title" className="font-semibold">
            Modify Report: Account QuickReport
          </h2>
          <span className="sr-only">{accountName}</span>
          <button
            type="button"
            aria-label="Close customization"
            className="px-1 text-lg leading-none text-white/80 hover:text-white"
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-3">
          <div className="flex flex-wrap items-end gap-1 border-b border-slate-300 px-1">
            {TABS.map((name) => (
              <button
                key={name}
                type="button"
                aria-selected={tab === name}
                className={`min-w-[118px] rounded-t-md border border-b-0 px-3 py-1.5 ${
                  tab === name
                    ? "relative top-px border-slate-300 bg-white font-semibold"
                    : "border-transparent bg-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                onClick={() => setTab(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="min-h-[400px] border-x border-b border-slate-300 p-3 sm:p-4">
            {tab === "Display" ? (
              <div className="space-y-4">
                <fieldset className="border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">
                    Report Date Range
                  </legend>
                  <div className="grid gap-3 md:grid-cols-[minmax(330px,0.8fr)_1fr] md:items-center">
                    <div className="space-y-2">
                      <label className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-2">
                        <span>Dates</span>
                        <select
                          className="min-w-0 rounded border border-slate-300 bg-white px-2 py-1.5"
                          value={draft.dateRange}
                          onChange={(event) => update("dateRange", event.target.value)}
                        >
                          {DATE_RANGES.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <div className="grid grid-cols-[48px_minmax(0,1fr)_20px_minmax(0,1fr)] items-center gap-2">
                        <label htmlFor="quick-report-from">From</label>
                        <input
                          id="quick-report-from"
                          type="date"
                          disabled={draft.dateRange !== "custom"}
                          value={draft.fromDate}
                          onChange={(event) => update("fromDate", event.target.value)}
                          className="min-w-0 rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
                        />
                        <label htmlFor="quick-report-to">To</label>
                        <input
                          id="quick-report-to"
                          type="date"
                          disabled={draft.dateRange !== "custom"}
                          value={draft.toDate}
                          onChange={(event) => update("toDate", event.target.value)}
                          className="min-w-0 rounded border border-slate-300 px-2 py-1.5 disabled:bg-slate-100"
                        />
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      {draft.dateRange === "all"
                        ? "All available transactions for this account."
                        : draft.dateRange === "custom"
                          ? "Choose an inclusive start and end date."
                          : `Transactions in ${DATE_RANGES.find(([value]) => value === draft.dateRange)?.[1].toLowerCase()}.`}
                    </p>
                  </div>
                </fieldset>

                <fieldset className="border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">
                    Report Basis
                  </legend>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                    {[
                      ["accrual", "Accrual"],
                      ["cash", "Cash"],
                    ].map(([value, label]) => (
                      <label key={value} className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="quick-report-basis"
                          checked={draft.reportBasis === value}
                          onChange={() => update("reportBasis", value)}
                        />
                        {label}
                      </label>
                    ))}
                    <span className="text-slate-600">
                      {draft.reportBasis === "cash"
                        ? "Shows posted receipt and supplier-payment transactions."
                        : "Shows all posted transactions for this account."}
                    </span>
                  </div>
                </fieldset>

                <fieldset className="border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">
                    Columns
                  </legend>
                  <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(250px,1fr)_145px]">
                    <div>
                      <label className="mb-2 flex items-center gap-2">
                        Look For
                        <input
                          type="search"
                          value={columnSearch}
                          onChange={(event) => setColumnSearch(event.target.value)}
                          className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1"
                        />
                      </label>
                      <div className="max-h-40 overflow-auto border border-slate-300">
                        {visibleColumnRows.map(([key, label]) => (
                          <label
                            key={key}
                            className="flex items-center gap-2 border-b border-slate-100 px-2 py-1.5 last:border-0 hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              checked={draft.visibleColumns[key]}
                              onChange={(event) => updateColumn(key, event.target.checked)}
                            />
                            <span className="min-w-0 flex-1">{label}</span>
                            <span className="flex gap-1">
                              <button
                                type="button"
                                aria-label={`Move ${label} up`}
                                className="rounded px-1 text-slate-500 hover:bg-slate-200"
                                disabled={draft.columnOrder[0] === key}
                                onClick={() => moveColumn(key, -1)}
                              >
                                ↑
                              </button>
                              <button
                                type="button"
                                aria-label={`Move ${label} down`}
                                className="rounded px-1 text-slate-500 hover:bg-slate-200"
                                disabled={draft.columnOrder.at(-1) === key}
                                onClick={() => moveColumn(key, 1)}
                              >
                                ↓
                              </button>
                            </span>
                          </label>
                        ))}
                        {!visibleColumnRows.length ? (
                          <p className="p-3 text-xs text-slate-500">No matching columns.</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="grid grid-cols-[60px_1fr] items-center gap-2">
                        Sort by
                        <select
                          value={draft.sortBy}
                          onChange={(event) => update("sortBy", event.target.value)}
                          className="rounded border border-slate-300 bg-white px-2 py-1.5"
                        >
                          <option value="default">Default (Date)</option>
                          {columns.map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </label>
                      {[
                        ["ascending", "Ascending order"],
                        ["descending", "Descending order"],
                      ].map(([value, label]) => (
                        <label key={value} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="quick-report-sort-direction"
                            checked={draft.sortDirection === value}
                            onChange={() => update("sortDirection", value)}
                          />
                          {label}
                        </label>
                      ))}
                      <p className="pt-4 text-slate-600">
                        Check the columns to include in your report and use the arrows to change their order.
                      </p>
                    </div>
                    <div className="flex flex-row gap-2 lg:flex-col lg:justify-end">
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-slate-50 px-3 py-2 font-semibold hover:bg-slate-100"
                        onClick={() => setAdvancedOpen((value) => !value)}
                      >
                        {advancedOpen ? "Hide Advanced" : "Advanced..."}
                      </button>
                      <button
                        type="button"
                        className="rounded border border-slate-300 bg-slate-50 px-3 py-2 font-semibold hover:bg-slate-100"
                        onClick={() => {
                          setDraft(settings);
                          setError("");
                        }}
                      >
                        Revert
                      </button>
                    </div>
                  </div>
                  {advancedOpen ? (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.hideZeroAmounts}
                          onChange={(event) => update("hideZeroAmounts", event.target.checked)}
                        />
                        Hide transactions with a zero amount
                      </label>
                    </div>
                  ) : null}
                </fieldset>
              </div>
            ) : null}

            {tab === "Filters" ? (
              <div className="space-y-5">
                <fieldset className="border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">Find Transactions</legend>
                  <label className="grid max-w-xl grid-cols-[120px_1fr] items-center gap-3">
                    Look for
                    <input
                      type="search"
                      autoFocus
                      value={draft.lookFor}
                      onChange={(event) => update("lookFor", event.target.value)}
                      placeholder="Name, memo, split, or transaction number"
                      className="rounded border border-slate-300 px-2 py-1.5"
                    />
                  </label>
                </fieldset>
                <fieldset className="border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">Transaction Type</legend>
                  <p className="mb-3 text-slate-600">Clear a check to exclude that transaction type. Check all types to include every type.</p>
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {transactionTypes.map((type) => (
                      <label key={type} className="flex items-center gap-2 capitalize">
                        <input
                          type="checkbox"
                          checked={!draft.transactionTypes.includes(type)}
                          onChange={() => toggleType(type)}
                        />
                        {type.replaceAll("_", " ")}
                      </label>
                    ))}
                  </div>
                  {!transactionTypes.length ? (
                    <p className="text-sm text-slate-500">Transaction types appear after report entries are loaded.</p>
                  ) : null}
                </fieldset>
                <button
                  type="button"
                  className="rounded border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
                  onClick={() => {
                    update("lookFor", "");
                    update("transactionTypes", []);
                  }}
                >
                  Clear Filters
                </button>
              </div>
            ) : null}

            {tab === "Header/Footer" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <fieldset className="space-y-3 border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">Report Header</legend>
                  {[
                    ["showReportTitle", "Report title"],
                    ["showAccountName", "Account name"],
                    ["showDateRange", "Date range"],
                    ["showBasis", "Report basis"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft[key]}
                        onChange={(event) => update(key, event.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <fieldset className="space-y-3 border border-slate-300 p-3">
                  <legend className="px-1 text-xs font-bold uppercase tracking-wide">Report Footer</legend>
                  {[
                    ["showTotals", "Show report totals"],
                    ["showGeneratedDate", "Show generated date"],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={draft[key]}
                        onChange={(event) => update(key, event.target.checked)}
                      />
                      {label}
                    </label>
                  ))}
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={draft.showHeader}
                      onChange={(event) => update("showHeader", event.target.checked)}
                    />
                    Show report header
                  </label>
                </fieldset>
                <p className="text-xs text-slate-500 md:col-span-2">
                  Header and footer settings affect the on-screen report and printed output.
                </p>
              </div>
            ) : null}

            {tab === "Fonts & Numbers" ? (
              <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                <label className="grid gap-1">
                  Font
                  <select
                    value={draft.fontFamily}
                    onChange={(event) => update("fontFamily", event.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    {FONTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  Font size
                  <select
                    value={draft.fontSize}
                    onChange={(event) => update("fontSize", Number(event.target.value))}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    {[10, 11, 12, 14, 16, 18].map((size) => <option key={size} value={size}>{size} px</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  Decimal places
                  <select
                    value={draft.decimalPlaces}
                    onChange={(event) => update("decimalPlaces", Number(event.target.value))}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    {[0, 2, 3, 4].map((places) => <option key={places} value={places}>{places}</option>)}
                  </select>
                </label>
                <label className="grid gap-1">
                  Currency display
                  <select
                    value={draft.currencyDisplay}
                    onChange={(event) => update("currencyDisplay", event.target.value)}
                    className="rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    <option value="code">GHC 1,234.00</option>
                    <option value="symbol">GH₵ 1,234.00</option>
                    <option value="none">1,234.00</option>
                  </select>
                </label>
                <label className="grid gap-1 sm:col-span-2">
                  Negative numbers
                  <select
                    value={draft.negativeStyle}
                    onChange={(event) => update("negativeStyle", event.target.value)}
                    className="max-w-xs rounded border border-slate-300 bg-white px-2 py-1.5"
                  >
                    {NUMBER_FORMATS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <div className="rounded border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
                  <span className="text-xs text-slate-500">Preview</span>
                  <p style={{ fontFamily: draft.fontFamily, fontSize: `${draft.fontSize}px` }}>
                    {draft.currencyDisplay === "code" ? "GHC " : draft.currencyDisplay === "symbol" ? "GH₵ " : ""}
                    {draft.negativeStyle === "parentheses" ? "(1,234.56)" : "-1,234.56"}
                  </p>
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm text-red-700" role="alert">{error}</p> : null}
          </div>
        </div>

        {helpOpen ? (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
            <section aria-labelledby="quick-report-help-title" aria-modal="true" className="w-full max-w-md border border-slate-300 bg-white p-5 shadow-xl" role="dialog">
              <h3 id="quick-report-help-title" className="text-lg font-semibold">QuickReport settings</h3>
              <p className="mt-2 text-sm text-slate-600">Choose the dates, basis, columns, sort order, filters, header and number formatting for this account report. Select OK to apply your changes, or Cancel to discard them.</p>
              <button type="button" className="mt-4 rounded border border-slate-300 px-4 py-1.5" onClick={() => setHelpOpen(false)}>Close Help</button>
            </section>
          </div>
        ) : null}

        <footer className="flex flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50 px-3 py-2">
          <button type="button" className="min-w-28 rounded border border-blue-700 bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700" onClick={apply}>
            OK
          </button>
          <button type="button" className="min-w-28 rounded border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-100" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="min-w-28 rounded border border-slate-300 bg-white px-4 py-2 font-semibold hover:bg-slate-100" onClick={() => setHelpOpen(true)}>
            Help
          </button>
        </footer>
      </section>
    </div>
  );
};

export default QuickReportCustomize;
