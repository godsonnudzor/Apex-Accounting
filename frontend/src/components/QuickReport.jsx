import { useEffect, useMemo, useState } from "react";

const columns = [
  ["type", "Type"],
  ["date", "Date"],
  ["number", "Num"],
  ["name", "Name"],
  ["memo", "Memo"],
  ["split", "Split"],
  ["amount", "Amount"],
  ["balance", "Balance"],
];
const defaultVisibleColumns = Object.fromEntries(
  columns.map(([key]) => [key, true]),
);

const money = (value) => {
  const amount = Number(value || 0);
  const formatted = Math.abs(amount).toLocaleString("en-GH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return amount < 0 ? `(${formatted})` : formatted;
};

const QuickReport = ({
  account,
  entries = [],
  loading = false,
  onRefresh,
  onClose,
}) => {
  const [customizing, setCustomizing] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [dateRange, setDateRange] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [message, setMessage] = useState("");
  const accountName = account?.partyType
    ? `${account.partyType[0].toUpperCase()}${account.partyType.slice(1)}: ${account.name}`
    : `${account?.code || ""} - ${account?.name || account?.account || ""}`.replace(
        /^ - | - $/g,
        "",
      );
  const reportKey = account?.code || accountName;

  useEffect(() => {
      setVisibleColumns(defaultVisibleColumns);
      setSortBy("default");
      setMessage("");
      try {
        const saved = window.localStorage.getItem(`quick-report:${reportKey}`);
        if (!saved) return;
        const preferences = JSON.parse(saved);
        if (
          !preferences ||
          typeof preferences.visibleColumns !== "object" ||
          !["default", "date-desc", "type"].includes(preferences.sortBy)
        ) {
          throw new Error("Saved report preferences are invalid.");
        }
        const restoredColumns = Object.fromEntries(
          columns.map(([key]) => [
            key,
            typeof preferences.visibleColumns[key] === "boolean"
              ? preferences.visibleColumns[key]
              : true,
          ]),
        );
        setVisibleColumns(restoredColumns);
        setSortBy(preferences.sortBy);
      } catch (loadError) {
        setMessage(`Unable to load saved report layout: ${loadError.message}`);
      }
  }, [reportKey]);
  const normalBalanceSign = ["liability", "equity", "income"].includes(
    account?.account_type,
  )
    ? -1
    : 1;

  const rows = useMemo(() => {
    const chronological = entries
      .flatMap((entry) =>
        (entry.lines || []).map((line, lineIndex) => ({
          id: `${entry.id}-${lineIndex}`,
          type: String(entry.source || "Journal").replaceAll("_", " "),
          date: String(entry.entry_date || ""),
          number: entry.reference || `JE-${entry.id}`,
          name: line.party_name || line.name || entry.payee || "",
          memo: line.memo || entry.description || "",
          split: line.split || "",
          amount:
            (Number(line.debit || 0) - Number(line.credit || 0)) *
            normalBalanceSign,
        })),
      )
      .sort((left, right) => left.date.localeCompare(right.date) || left.id.localeCompare(right.id));

    let balance = 0;
    const balancedRows = chronological.map((row) => {
      balance += row.amount;
      return { ...row, balance };
    });
    const filteredRows =
      dateRange === "custom"
        ? balancedRows.filter(
            (row) =>
              (!fromDate || row.date >= fromDate) &&
              (!toDate || row.date <= toDate),
          )
        : balancedRows;

    if (sortBy === "date-desc") {
      return [...filteredRows].reverse();
    }
    if (sortBy === "type") {
      return [...filteredRows].sort(
        (left, right) =>
          left.type.localeCompare(right.type) ||
          left.date.localeCompare(right.date),
      );
    }
    return filteredRows;
  }, [dateRange, entries, fromDate, normalBalanceSign, sortBy, toDate]);

  const toggleColumn = (key) => {
    setVisibleColumns((current) => {
      if (current[key] && Object.values(current).filter(Boolean).length === 1) {
        setMessage("At least one report column must remain visible.");
        return current;
      }
      setMessage("");
      return { ...current, [key]: !current[key] };
    });
  };

  const exportCsv = () => {
    const activeColumns = columns.filter(([key]) => visibleColumns[key]);
    const csvRows = [
      activeColumns.map(([, label]) => label),
      ...rows.map((row) =>
        activeColumns.map(([key]) =>
          key === "amount" || key === "balance"
            ? money(row[key])
            : row[key] || "",
        ),
      ),
    ];
    const csv = csvRows
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `quick-report-${account?.code || "account"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const emailReport = () => {
    const body = rows
      .map(
        (row) =>
          `${row.date} | ${row.type} | ${row.number} | ${row.memo} | ${money(row.amount)}`,
      )
      .join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(
      `Quick Report - ${accountName}`,
    )}&body=${encodeURIComponent(body)}`;
  };

  const rememberReport = () => {
    try {
      window.localStorage.setItem(
        `quick-report:${reportKey}`,
        JSON.stringify({ visibleColumns, sortBy }),
      );
      setMessage("Report layout saved for this browser.");
    } catch (saveError) {
      setMessage(`Unable to save report layout: ${saveError.message}`);
    }
  };

  const amountTotal = rows.reduce((total, row) => total + row.amount, 0);
  const endingBalance = rows.at(-1)?.balance || 0;

  return (
    <section className="overflow-hidden border border-slate-300 bg-white text-slate-800 shadow-sm">
      <div className="quick-report-toolbar flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-100 p-2">
        <button type="button" onClick={() => setCustomizing((value) => !value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Customise Report
        </button>
        <button type="button" onClick={rememberReport} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Memorise
        </button>
        <button type="button" onClick={() => window.print()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Print
        </button>
        <button type="button" onClick={emailReport} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          E-mail
        </button>
        <button type="button" onClick={exportCsv} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          Excel
        </button>
        <button type="button" onClick={() => setHeaderVisible((value) => !value)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
          {headerVisible ? "Hide Header" : "Show Header"}
        </button>
        {onRefresh ? (
          <button type="button" onClick={onRefresh} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
            Refresh
          </button>
        ) : null}
        {onClose ? (
          <button type="button" onClick={onClose} className="ml-auto rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
            Close
          </button>
        ) : null}
      </div>

      <div className="quick-report-filters flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-300 bg-slate-50 px-3 py-2 text-xs">
        <label className="flex items-center gap-2">
          Dates
          <select
            value={dateRange}
            onChange={(event) => setDateRange(event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            <option value="all">All</option>
            <option value="custom">Custom</option>
          </select>
        </label>
        <label className="flex items-center gap-2">
          From
          <input
            aria-label="From date"
            type="date"
            value={fromDate}
            disabled={dateRange !== "custom"}
            onChange={(event) => setFromDate(event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100"
          />
        </label>
        <label className="flex items-center gap-2">
          To
          <input
            aria-label="To date"
            type="date"
            value={toDate}
            disabled={dateRange !== "custom"}
            onChange={(event) => setToDate(event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100"
          />
        </label>
        <label className="ml-auto flex items-center gap-2">
          Sort By
          <select
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            <option value="default">Default</option>
            <option value="date-desc">Date (newest first)</option>
            <option value="type">Type</option>
          </select>
        </label>
      </div>

      {customizing ? (
        <div className="quick-report-customize flex flex-wrap gap-x-4 gap-y-2 border-b border-slate-200 px-3 py-2 text-xs">
          {columns.map(([key, label]) => (
            <label key={key} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={visibleColumns[key]}
                onChange={() => toggleColumn(key)}
              />
              {label}
            </label>
          ))}
        </div>
      ) : null}
      {message ? (
        <p className="px-3 py-2 text-xs text-teal-800" role="status">
          {message}
        </p>
      ) : null}

      {headerVisible ? (
        <header className="quick-report-heading px-4 py-4 text-center">
          <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900">
            Account QuickReport
          </h2>
          <p className="mt-1 text-sm font-semibold text-slate-800">{accountName}</p>
          <p className="mt-1 text-xs text-slate-500">All Transactions</p>
        </header>
      ) : null}

      <div className="quick-report-table-wrap overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-xs">
          <thead className="border-y border-slate-300 text-slate-600">
            <tr>
              {columns.map(([key, label]) =>
                visibleColumns[key] ? (
                  <th
                    key={key}
                    className={`whitespace-nowrap px-2 py-2 font-semibold ${["amount", "balance"].includes(key) ? "text-right" : ""}`}
                  >
                    {label}
                  </th>
                ) : null,
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.filter(([key]) => visibleColumns[key]).length} className="px-3 py-8 text-center text-slate-500">
                  Loading report...
                </td>
              </tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {visibleColumns.type ? <td className="whitespace-nowrap px-2 py-1.5 capitalize">{row.type}</td> : null}
                  {visibleColumns.date ? <td className="whitespace-nowrap px-2 py-1.5">{row.date}</td> : null}
                  {visibleColumns.number ? <td className="whitespace-nowrap px-2 py-1.5">{row.number}</td> : null}
                  {visibleColumns.name ? <td className="max-w-40 truncate px-2 py-1.5">{row.name || "—"}</td> : null}
                  {visibleColumns.memo ? <td className="max-w-56 truncate px-2 py-1.5">{row.memo || "—"}</td> : null}
                  {visibleColumns.split ? <td className="max-w-48 truncate px-2 py-1.5">{row.split || "—"}</td> : null}
                  {visibleColumns.amount ? <td className="whitespace-nowrap px-2 py-1.5 text-right">{money(row.amount)}</td> : null}
                  {visibleColumns.balance ? <td className="whitespace-nowrap px-2 py-1.5 text-right">{money(row.balance)}</td> : null}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.filter(([key]) => visibleColumns[key]).length} className="px-3 py-8 text-center text-slate-500">
                  No transactions found for this report.
                </td>
              </tr>
            )}
          </tbody>
          {!loading && rows.length ? (
            <tfoot className="border-t-2 border-slate-300 font-semibold">
              <tr>
                <td colSpan={columns.filter(([key]) => visibleColumns[key] && !["amount", "balance"].includes(key)).length || 1} className="px-2 py-2">
                  Total
                </td>
                {visibleColumns.amount ? <td className="px-2 py-2 text-right">{money(amountTotal)}</td> : null}
                {visibleColumns.balance ? <td className="px-2 py-2 text-right">{money(endingBalance)}</td> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
    </section>
  );
};

export default QuickReport;
