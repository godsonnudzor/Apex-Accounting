import { useEffect, useMemo, useState } from "react";
import { getApiUrl, readApiResponse } from "../context/auth";
import QuickReportCustomize from "./QuickReportCustomize";

const columns = [
  ["type", "Type"],
  ["date", "Date"],
  ["number", "Num"],
  ["name", "Name"],
  ["memo", "Memo"],
  ["split", "Split"],
  ["debit", "Debit"],
  ["credit", "Credit"],
  ["amount", "Amount"],
  ["balance", "Balance"],
];
const columnKeys = columns.map(([key]) => key);
const dateRangeOptions = [
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
const defaultSettings = {
  dateRange: "all",
  fromDate: "",
  toDate: "",
  reportBasis: "accrual",
  visibleColumns: Object.fromEntries(columnKeys.map((key) => [key, true])),
  columnOrder: columnKeys,
  sortBy: "default",
  sortDirection: "ascending",
  lookFor: "",
  transactionTypes: [],
  hideZeroAmounts: false,
  showHeader: true,
  showReportTitle: true,
  showAccountName: true,
  showDateRange: true,
  showBasis: true,
  showTotals: true,
  showGeneratedDate: true,
  fontFamily: "Arial, sans-serif",
  fontSize: 12,
  decimalPlaces: 2,
  currencyDisplay: "code",
  negativeStyle: "parentheses",
};
const cashSources = new Set(["receipt", "supplier_payment"]);

const localDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getDateBounds = (settings) => {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfQuarter = new Date(
    now.getFullYear(),
    Math.floor(now.getMonth() / 3) * 3,
    1,
  );
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
  const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);

  const ranges = {
    all: [null, null],
    today: [localDateString(now), localDateString(now)],
    "this-week": [localDateString(startOfWeek), localDateString(now)],
    "this-month": [localDateString(startOfMonth), localDateString(now)],
    "this-quarter": [localDateString(startOfQuarter), localDateString(now)],
    "this-year": [localDateString(startOfYear), localDateString(now)],
    "last-month": [
      localDateString(lastMonthStart),
      localDateString(lastMonthEnd),
    ],
    "last-year": [localDateString(lastYearStart), localDateString(lastYearEnd)],
    custom: [settings.fromDate || null, settings.toDate || null],
  };
  return ranges[settings.dateRange] || ranges.all;
};

const formatMoney = (value, settings) => {
  const amount = Number(value || 0);
  const formatted = Math.abs(amount).toLocaleString("en-GH", {
    minimumFractionDigits: settings.decimalPlaces,
    maximumFractionDigits: settings.decimalPlaces,
  });
  const signed =
    amount < 0
      ? settings.negativeStyle === "parentheses"
        ? `(${formatted})`
        : `-${formatted}`
      : formatted;
  const currency =
    settings.currencyDisplay === "code"
      ? "GHC "
      : settings.currencyDisplay === "symbol"
        ? "GH₵ "
        : "";
  return `${currency}${signed}`;
};

const normalizeSettings = (settings) => {
  const savedOrder = Array.isArray(settings?.columnOrder)
    ? [...new Set(settings.columnOrder.filter((key) => columnKeys.includes(key)))]
    : defaultSettings.columnOrder;
  const sortBy =
    settings?.sortBy === "date-desc"
      ? "date"
      : columnKeys.includes(settings?.sortBy) || settings?.sortBy === "default"
        ? settings.sortBy
        : defaultSettings.sortBy;
  return {
    ...defaultSettings,
    ...settings,
    sortBy,
    sortDirection:
      settings?.sortBy === "date-desc"
        ? "descending"
        : settings?.sortDirection || defaultSettings.sortDirection,
    visibleColumns: {
      ...defaultSettings.visibleColumns,
      ...(settings?.visibleColumns || {}),
    },
    columnOrder: [
      ...savedOrder,
      ...columnKeys.filter((key) => !savedOrder.includes(key)),
    ],
    transactionTypes: Array.isArray(settings?.transactionTypes)
      ? settings.transactionTypes
      : [],
  };
};

const QuickReport = ({
  account,
  entries = [],
  loading = false,
  onRefresh,
  onClose,
}) => {
  const accountName = account?.partyType
    ? `${account.partyType[0].toUpperCase()}${account.partyType.slice(1)}: ${account.name}`
    : `${account?.code || ""} - ${account?.name || account?.account || ""}`.replace(
        /^ - | - $/g,
        "",
      );
  const reportKey = account?.code || accountName;
  const [settings, setSettings] = useState(defaultSettings);
  const [customizing, setCustomizing] = useState(false);
  const [message, setMessage] = useState("");
  const [openedEntry, setOpenedEntry] = useState(null);
  const [entryForm, setEntryForm] = useState(null);
  const [entryLoading, setEntryLoading] = useState(false);
  const [entryBusy, setEntryBusy] = useState(false);
  const [entryError, setEntryError] = useState("");
  const [availableAllocations, setAvailableAllocations] = useState([]);
  const [availableAllocationId, setAvailableAllocationId] = useState("");
  const [allocationLookupError, setAllocationLookupError] = useState("");

  useEffect(() => {
    setSettings(defaultSettings);
    setMessage("");
    try {
      const saved = window.localStorage.getItem(`quick-report:${reportKey}`);
      if (saved) setSettings(normalizeSettings(JSON.parse(saved)));
    } catch (loadError) {
      setMessage(`Unable to load saved report settings: ${loadError.message}`);
    }
  }, [reportKey]);

  const sourceRows = useMemo(() => {
    const [fromDate, toDate] = getDateBounds(settings);
    const term = settings.lookFor.trim().toLowerCase();
    const chronological = entries
      .filter(
        (entry) =>
          settings.reportBasis !== "cash" ||
          cashSources.has(String(entry.source || "").toLowerCase()),
      )
      .flatMap((entry) =>
        (entry.lines || []).map((line, lineIndex) => {
          const employee = line.employee;
          const employeeName = employee
            ? [employee.first_name, employee.last_name].filter(Boolean).join(" ") ||
              employee.users?.name ||
              ""
            : "";
          const row = {
            id: `${entry.id}-${lineIndex}`,
            entryId: entry.id,
            source: entry.source,
            type: String(entry.source || "Journal").replaceAll("_", " "),
            date: String(entry.entry_date || ""),
            number: entry.reference || `JE-${entry.id}`,
            name:
              line.party_name ||
              line.supplier?.name ||
              line.customer?.name ||
              employeeName ||
              (Array.isArray(entry.payment_records)
                ? entry.payment_records[0]?.payee
                : entry.payment_records?.payee) ||
              "",
            memo: line.memo || entry.description || "",
            split: line.split || "",
            debit: Number(line.debit || 0),
            credit: Number(line.credit || 0),
            amount:
              (Number(line.debit || 0) - Number(line.credit || 0)) *
              (["liability", "equity", "income"].includes(
                account?.account_type,
              )
                ? -1
                : 1),
          };
          return row;
        }),
      )
      .sort(
        (left, right) =>
          left.date.localeCompare(right.date) || left.id.localeCompare(right.id),
      );

    let balance = 0;
    const balancedRows = chronological.map((row) => {
      balance += row.amount;
      return { ...row, balance };
    });
    return balancedRows.filter((row) => {
      if (fromDate && row.date < fromDate) return false;
      if (toDate && row.date > toDate) return false;
      if (settings.transactionTypes.includes(row.type.replaceAll(" ", "_"))) {
        return false;
      }
      if (
        term &&
        ![row.name, row.memo, row.split, row.number, row.type]
          .join(" ")
          .toLowerCase()
          .includes(term)
      ) {
        return false;
      }
      return !settings.hideZeroAmounts || row.amount !== 0;
    });
  }, [account?.account_type, entries, settings]);

  const rows = useMemo(() => {
    const sortKey = settings.sortBy === "default" ? "date" : settings.sortBy;
    const direction = settings.sortDirection === "descending" ? -1 : 1;
    const sorted = [...sourceRows].sort((left, right) => {
      const leftValue = left[sortKey];
      const rightValue = right[sortKey];
      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }
      return (
        String(leftValue || "").localeCompare(String(rightValue || ""), undefined, {
          numeric: true,
          sensitivity: "base",
        }) * direction
      );
    });
    return sorted;
  }, [settings.sortBy, settings.sortDirection, sourceRows]);

  const transactionTypes = useMemo(
    () => [...new Set(entries.map((entry) => String(entry.source || "journal").toLowerCase()))].sort(),
    [entries],
  );
  const activeColumns = settings.columnOrder
    .map((key) => columns.find(([columnKey]) => columnKey === key))
    .filter(([key]) => settings.visibleColumns[key]);
  const amountTotal = rows.reduce((total, row) => total + row.amount, 0);
  const endingBalance = sourceRows.at(-1)?.balance || 0;
  const [fromDate, toDate] = getDateBounds(settings);
  const dateRangeLabel =
    settings.dateRange === "all"
      ? "All Transactions"
      : `${fromDate || "Beginning"} – ${toDate || "Today"}`;

  const applySettings = (nextSettings) => {
    const normalized = normalizeSettings(nextSettings);
    setSettings(normalized);
    setCustomizing(false);
    setMessage("");
  };

  const updateDateBound = (key, value) => {
    const otherKey = key === "fromDate" ? "toDate" : "fromDate";
    const invalidRange =
      value &&
      settings[otherKey] &&
      (key === "fromDate"
        ? value > settings.toDate
        : value < settings.fromDate);
    if (invalidRange) {
      setMessage("The start date must be on or before the end date.");
      return;
    }
    setMessage("");
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const rememberReport = () => {
    try {
      window.localStorage.setItem(
        `quick-report:${reportKey}`,
        JSON.stringify(settings),
      );
      setMessage("Report settings saved for this browser.");
    } catch (saveError) {
      setMessage(`Unable to save report settings: ${saveError.message}`);
    }
  };

  const exportCsv = () => {
    const csvRows = [
      activeColumns.map(([, label]) => label),
      ...rows.map((row) =>
        activeColumns.map(([key]) =>
          ["amount", "balance", "debit", "credit"].includes(key)
            ? formatMoney(row[key], settings)
            : row[key] || "",
        ),
      ),
    ];
    const csv = csvRows
      .map((row) =>
        row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `quick-report-${account?.code || "account"}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const emailReport = () => {
    const body = [
      activeColumns.map(([, label]) => label).join(" | "),
      ...rows.map((row) =>
        activeColumns
          .map(([key]) =>
            ["amount", "balance", "debit", "credit"].includes(key)
              ? formatMoney(row[key], settings)
              : row[key] || "",
          )
          .join(" | "),
      ),
    ].join("\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(
      `Quick Report - ${accountName}`,
    )}&body=${encodeURIComponent(body)}`;
  };

  const openEntry = async (row) => {
    setEntryError("");
    setAllocationLookupError("");
    setAvailableAllocations([]);
    setAvailableAllocationId("");
    setEntryForm(null);
    setOpenedEntry(null);
    setEntryLoading(true);
    try {
      const response = await fetch(
        getApiUrl(`/api/journal?id=${encodeURIComponent(row.entryId)}`),
        { credentials: "include" },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to open journal entry");
      }
      const entry = result.entry;
      const payment = entry.payment_records?.[0] || null;
      const savedAllocations = (payment?.payment_allocations || []).map((allocation) => {
        const document = allocation.customer_invoice || allocation.supplier_bill;
        return {
          documentId: allocation.customer_invoice_id || allocation.supplier_bill_id,
          amount: String(allocation.amount || ""),
          label:
            document?.invoice_number ||
            document?.reference ||
            `Document ${allocation.customer_invoice_id || allocation.supplier_bill_id}`,
        };
      });
      setOpenedEntry(entry);
      setEntryForm({
        entryDate: entry.entry_date || "",
        reference: entry.reference || "",
        description: entry.description || "",
        payment: payment
          ? {
              paymentType: payment.payment_type || "",
              payee: payment.payee || "",
              memo: payment.memo || "",
              bankAccount: payment.bank_account || "",
              cashBankAccountId: payment.cash_bank_account_id || null,
              settlementType: payment.settlement_type || "",
              customerId: payment.customer_id || null,
              supplierId: payment.supplier_id || null,
              currency: payment.currency || "GHS",
            }
          : null,
        allocations: savedAllocations,
        lines: (entry.journal_lines || []).map((line) => ({
          account: line.account || "",
          debit: String(line.debit || ""),
          credit: String(line.credit || ""),
          memo: line.memo || "",
          supplier_id: line.supplier_id,
          customer_id: line.customer_id,
          employee_id: line.employee_id,
        })),
      });
      if (payment?.settlement_type) {
        try {
          const query = new URLSearchParams({
            type: payment.settlement_type,
            partyId: String(payment.customer_id || payment.supplier_id || ""),
            currency: String(payment.currency || "GHS").toUpperCase(),
          });
          const pendingResponse = await fetch(
            getApiUrl(`/api/settlements-pending?${query}`),
            { credentials: "include" },
          );
          const pendingResult = await readApiResponse(pendingResponse);
          if (!pendingResponse.ok) {
            throw new Error(
              pendingResult.message || "Unable to load additional linked documents",
            );
          }
          const savedIds = new Set(savedAllocations.map((item) => String(item.documentId)));
          setAvailableAllocations(
            (pendingResult.transactions || [])
              .filter((document) => !savedIds.has(String(document.id)))
              .map((document) => ({
                documentId: document.id,
                amount: String(document.open_balance || ""),
                label:
                  document.invoice_number ||
                  document.reference ||
                  `Document ${document.id}`,
              })),
          );
        } catch (allocationError) {
          setAllocationLookupError(allocationError.message);
        }
      }
    } catch (loadError) {
      setEntryError(loadError.message);
    } finally {
      setEntryLoading(false);
    }
  };

  const updateEntryForm = (key, value) => {
    setEntryForm((current) => ({ ...current, [key]: value }));
  };

  const updateEntryLine = (index, key, value) => {
    setEntryForm((current) => {
      const lines = current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [key]: value } : line,
      );
      if (isDirectPayment()) {
        const linkedCashAccount = openedEntry.payment_records[0].bank_account;
        const cashIndex = lines.findIndex((line) => line.account === linkedCashAccount);
        if (cashIndex >= 0) {
          const expenseTotal = lines.reduce(
            (total, line, lineIndex) =>
              total + (lineIndex === cashIndex ? 0 : Number(line.debit || 0)),
            0,
          );
          lines[cashIndex] = {
            ...lines[cashIndex],
            debit: "0",
            credit: String(expenseTotal),
          };
        }
      }
      return { ...current, lines };
    });
  };

  const updatePayment = (key, value) => {
    setEntryForm((current) => ({
      ...current,
      payment: { ...current.payment, [key]: value },
    }));
  };

  const updateAllocation = (index, key, value) => {
    setEntryForm((current) => ({
      ...current,
      allocations: current.allocations.map((allocation, allocationIndex) =>
        allocationIndex === index
          ? { ...allocation, [key]: value }
          : allocation,
      ),
    }));
  };

  const addAllocation = () => {
    const allocation = availableAllocations.find(
      (item) => String(item.documentId) === String(availableAllocationId),
    );
    if (!allocation) return;
    setEntryForm((current) => ({
      ...current,
      allocations: [...current.allocations, allocation],
    }));
    setAvailableAllocations((current) =>
      current.filter((item) => String(item.documentId) !== String(availableAllocationId)),
    );
    setAvailableAllocationId("");
  };

  const removeAllocation = (index) => {
    const [removed] = entryForm.allocations.slice(index, index + 1);
    setEntryForm((current) => ({
      ...current,
      allocations: current.allocations.filter((_, allocationIndex) => allocationIndex !== index),
    }));
    if (removed) {
      setAvailableAllocations((current) => [...current, removed]);
    }
  };

  const isDirectPayment = (entry = openedEntry) =>
    Boolean(
      entry &&
        ["cheque", "cash", "bank_transfer"].includes(entry.source) &&
        entry.payment_records?.[0] &&
        !entry.payment_records[0].settlement_type,
    );

  const isSettlement = (entry = openedEntry) =>
    Boolean(
      entry &&
        ["receipt", "supplier_payment"].includes(entry.source) &&
        entry.payment_records?.[0]?.settlement_type === entry.source,
    );

  const canEditEntry = (entry = openedEntry) =>
    Boolean(
      entry?.status === "posted" &&
        (entry.source === "manual" || isDirectPayment(entry) || isSettlement(entry)),
    );

  const saveEntry = async (event) => {
    event.preventDefault();
    if (
      !openedEntry ||
      !entryForm ||
      !canEditEntry()
    ) return;
    setEntryBusy(true);
    setEntryError("");
    try {
      const response = await fetch(
        getApiUrl(`/api/journal?id=${encodeURIComponent(openedEntry.id)}`),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entryForm,
            payment: entryForm.payment
              ? {
                  paymentType: entryForm.payment.paymentType,
                  payee: entryForm.payment.payee,
                  memo: entryForm.payment.memo,
                }
              : undefined,
            allocations: entryForm.allocations?.map((allocation) => ({
              documentId: allocation.documentId,
              amount: Number(allocation.amount),
            })),
            page: `${window.location.pathname} — ${accountName}`,
          }),
        },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to update journal entry");
      }
      setOpenedEntry(null);
      setEntryForm(null);
      setMessage(`Journal entry ${openedEntry.id} updated.`);
      await onRefresh?.();
    } catch (saveError) {
      setEntryError(saveError.message);
    } finally {
      setEntryBusy(false);
    }
  };

  const voidEntry = async () => {
    if (
      !openedEntry ||
      openedEntry.source !== "manual" ||
      openedEntry.status !== "posted" ||
      !window.confirm("Void this manual journal entry? It will remain in the audit trail.")
    ) {
      return;
    }
    setEntryBusy(true);
    setEntryError("");
    try {
      const response = await fetch(
        getApiUrl(`/api/journal?id=${encodeURIComponent(openedEntry.id)}`),
        {
          method: "DELETE",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: `${window.location.pathname} — ${accountName}`,
          }),
        },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to void journal entry");
      }
      setOpenedEntry(null);
      setEntryForm(null);
      setMessage(`Journal entry ${openedEntry.id} voided.`);
      await onRefresh?.();
    } catch (voidError) {
      setEntryError(voidError.message);
    } finally {
      setEntryBusy(false);
    }
  };

  return (
    <section
      className="overflow-hidden border border-slate-300 bg-white text-slate-800 shadow-sm print:border-0 print:shadow-none"
      style={{ fontFamily: settings.fontFamily, fontSize: `${settings.fontSize}px` }}
    >
      <div className="quick-report-toolbar flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-100 p-2 print:hidden">
        <button type="button" onClick={() => setCustomizing(true)} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50">
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
        <button
          type="button"
          onClick={() => applySettings({ ...settings, showHeader: !settings.showHeader })}
          className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-semibold hover:bg-slate-50"
        >
          {settings.showHeader ? "Hide Header" : "Show Header"}
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

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-300 bg-slate-50 px-3 py-2 text-xs print:hidden">
        <label className="flex items-center gap-2">
          Dates
          <select
            value={settings.dateRange}
            onChange={(event) =>
              setSettings((current) => ({ ...current, dateRange: event.target.value }))
            }
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            {dateRangeOptions.map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          From
          <input
            aria-label="From date"
            type="date"
            value={settings.fromDate}
            disabled={settings.dateRange !== "custom"}
            onChange={(event) => updateDateBound("fromDate", event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100"
          />
        </label>
        <label className="flex items-center gap-2">
          To
          <input
            aria-label="To date"
            type="date"
            value={settings.toDate}
            disabled={settings.dateRange !== "custom"}
            onChange={(event) => updateDateBound("toDate", event.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1 disabled:bg-slate-100"
          />
        </label>
        <label className="ml-auto flex items-center gap-2">
          Sort By
          <select
            value={settings.sortBy}
            onChange={(event) =>
              setSettings((current) => ({ ...current, sortBy: event.target.value }))
            }
            className="rounded border border-slate-300 bg-white px-2 py-1"
          >
            <option value="default">Default</option>
            {columns.map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </label>
      </div>

      {message ? <p className="px-3 py-2 text-xs text-teal-800" role="status">{message}</p> : null}
      {settings.showHeader ? (
        <header className="quick-report-heading px-4 py-4 text-center">
          {settings.showReportTitle ? <h2 className="text-sm font-bold uppercase tracking-wide text-blue-900">Account QuickReport</h2> : null}
          {settings.showAccountName ? <p className="mt-1 text-sm font-semibold text-slate-800">{accountName}</p> : null}
          {settings.showDateRange ? <p className="mt-1 text-xs text-slate-500">{dateRangeLabel}</p> : null}
          {settings.showBasis ? <p className="mt-1 text-xs capitalize text-slate-500">{settings.reportBasis} Basis</p> : null}
        </header>
      ) : null}

      <p className="px-3 py-2 text-xs text-slate-500 print:hidden">
        Double-click a transaction to open its ledger entry. Manual journals, direct payments, receipts, and supplier payments can be edited with their linked records.
      </p>
      <div className="quick-report-table-wrap overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[860px] text-left print:min-w-0">
          <thead className="border-y border-slate-300 text-slate-600 print:table-header-group">
            <tr>
              {activeColumns.map(([key, label]) => (
                <th
                  key={key}
                  className={`whitespace-nowrap px-2 py-2 font-semibold ${["amount", "balance", "debit", "credit"].includes(key) ? "text-right" : ""}`}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={activeColumns.length} className="px-3 py-8 text-center text-slate-500">Loading report...</td></tr>
            ) : rows.length ? (
              rows.map((row) => (
                <tr
                  key={row.id}
                  className="cursor-pointer border-b border-slate-100 hover:bg-teal-50 focus:bg-teal-50"
                  title="Double-click to open ledger entry"
                  tabIndex={0}
                  onDoubleClick={() => openEntry(row)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openEntry(row);
                  }}
                >
                  {activeColumns.map(([key]) => (
                    <td
                      key={key}
                      className={`px-2 py-1.5 ${["type", "date", "number", "amount", "balance", "debit", "credit"].includes(key) ? "whitespace-nowrap" : "max-w-56 truncate"} ${["amount", "balance", "debit", "credit"].includes(key) ? "text-right" : ""} ${key === "type" ? "capitalize" : ""}`}
                    >
                      {["amount", "balance", "debit", "credit"].includes(key)
                        ? formatMoney(row[key], settings)
                        : row[key] || "—"}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr><td colSpan={activeColumns.length} className="px-3 py-8 text-center text-slate-500">No transactions found for this report.</td></tr>
            )}
          </tbody>
          {!loading && rows.length && settings.showTotals ? (
            <tfoot className="border-t-2 border-slate-300 font-semibold">
              <tr>
                {activeColumns.map(([key], index) => {
                  if (["debit", "credit"].includes(key)) {
                    const total = rows.reduce((sum, row) => sum + row[key], 0);
                    return <td key={key} className="px-2 py-2 text-right">{formatMoney(total, settings)}</td>;
                  }
                  if (key === "amount") {
                    return <td key={key} className="px-2 py-2 text-right">{formatMoney(amountTotal, settings)}</td>;
                  }
                  if (key === "balance") {
                    return <td key={key} className="px-2 py-2 text-right">{formatMoney(endingBalance, settings)}</td>;
                  }
                  return (
                    <td key={key} className="px-2 py-2">
                      {index === activeColumns.findIndex(
                        ([columnKey]) =>
                          !["amount", "balance", "debit", "credit"].includes(columnKey),
                      )
                        ? "Total"
                        : ""}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {settings.showGeneratedDate ? (
        <footer className="quick-report-page-footer px-3 py-2 text-right text-xs text-slate-500">
          Generated {new Date().toLocaleDateString()}
        </footer>
      ) : null}
      {customizing ? (
        <QuickReportCustomize
          key={reportKey}
          accountName={accountName}
          columns={columns}
          settings={normalizeSettings(settings)}
          transactionTypes={transactionTypes}
          onApply={applySettings}
          onCancel={() => setCustomizing(false)}
        />
      ) : null}
      {openedEntry || entryLoading || entryError ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 print:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !entryBusy) {
              setOpenedEntry(null);
              setEntryError("");
            }
          }}
        >
          <section
            className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-lg bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-report-entry-title"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 id="quick-report-entry-title" className="text-lg font-bold text-slate-900">
                  Ledger entry {openedEntry?.reference || `#${openedEntry?.id || ""}`}
                </h2>
                <p className="text-sm text-slate-500">
                  {openedEntry?.source === "manual"
                    ? "Manual journal entry"
                    : isDirectPayment()
                      ? "Direct payment and linked ledger posting"
                      : isSettlement()
                        ? "Settlement and linked invoice/bill allocations"
                        : "System-generated entry · read-only"}
                </p>
              </div>
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={() => {
                  setOpenedEntry(null);
                  setEntryForm(null);
                  setEntryError("");
                }}
                disabled={entryBusy}
              >
                Close
              </button>
            </div>
            {entryLoading ? (
              <p className="py-8 text-center text-slate-500">Loading ledger entry…</p>
            ) : entryError ? (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                {entryError}
              </p>
            ) : null}
            {openedEntry && entryForm ? (
              <form onSubmit={saveEntry}>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium">
                    Date
                    <input
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      type="date"
                      value={entryForm.entryDate}
                      disabled={!canEditEntry() || entryBusy}
                      onChange={(event) => updateEntryForm("entryDate", event.target.value)}
                      required
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Reference
                    <input
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      value={entryForm.reference}
                      disabled={!canEditEntry() || entryBusy}
                      onChange={(event) => updateEntryForm("reference", event.target.value)}
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Description
                    <input
                      className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                      value={entryForm.description}
                      disabled={!canEditEntry() || entryBusy}
                      onChange={(event) => updateEntryForm("description", event.target.value)}
                      required
                    />
                  </label>
                </div>
                {entryForm.payment && canEditEntry() ? (
                  <section className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
                    <h3 className="mb-3 text-sm font-semibold text-slate-800">
                      Payment details
                    </h3>
                    <div className="grid gap-3 md:grid-cols-3">
                      <label className="text-sm font-medium">
                        Method
                        <select
                          className="mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2"
                          value={entryForm.payment.paymentType}
                          disabled={entryBusy}
                          onChange={(event) => updatePayment("paymentType", event.target.value)}
                        >
                          <option value="bank_transfer">Bank transfer</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </label>
                      {isDirectPayment() ? (
                        <label className="text-sm font-medium">
                          Payee
                          <input
                            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                            value={entryForm.payment.payee}
                            disabled={entryBusy}
                            onChange={(event) => updatePayment("payee", event.target.value)}
                            required
                          />
                        </label>
                      ) : (
                        <label className="text-sm font-medium">
                          Party
                          <input
                            className="mt-1 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2"
                            value={entryForm.payment.payee}
                            readOnly
                          />
                        </label>
                      )}
                      <label className="text-sm font-medium">
                        Linked cash/bank account
                        <input
                          className="mt-1 w-full rounded border border-slate-300 bg-slate-100 px-3 py-2"
                          value={entryForm.payment.bankAccount}
                          readOnly
                        />
                      </label>
                      <label className="text-sm font-medium md:col-span-3">
                        Payment memo
                        <input
                          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                          value={entryForm.payment.memo}
                          disabled={entryBusy}
                          onChange={(event) => updatePayment("memo", event.target.value)}
                        />
                      </label>
                    </div>
                  </section>
                ) : null}
                {isSettlement() && canEditEntry() ? (
                  <section className="mt-4 rounded border border-slate-200 p-3">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-800">
                          Linked {openedEntry.source === "receipt" ? "invoices" : "supplier bills"}
                        </h3>
                        <p className="text-xs text-slate-500">
                          Allocation changes update document balances and the linked journal posting together.
                        </p>
                      </div>
                      <span className="text-sm font-semibold">
                        Total: {formatMoney(
                          entryForm.allocations.reduce(
                            (total, allocation) => total + Number(allocation.amount || 0),
                            0,
                          ),
                          entryForm.payment.currency,
                        )}
                      </span>
                    </div>
                    {allocationLookupError ? (
                      <p className="mb-3 text-xs text-amber-800" role="status">
                        {allocationLookupError}
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      {entryForm.allocations.map((allocation, index) => (
                        <div
                          key={`${allocation.documentId}-${index}`}
                          className="grid items-center gap-2 rounded bg-slate-50 p-2 md:grid-cols-[1fr_180px_auto]"
                        >
                          <span className="text-sm font-medium">{allocation.label}</span>
                          <label className="text-xs text-slate-600">
                            Amount
                            <input
                              className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-right text-sm"
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={allocation.amount}
                              disabled={entryBusy}
                              onChange={(event) =>
                                updateAllocation(index, "amount", event.target.value)
                              }
                              required
                            />
                          </label>
                          <button
                            type="button"
                            className="text-xs font-semibold text-red-700 disabled:opacity-50"
                            disabled={entryBusy || entryForm.allocations.length <= 1}
                            onClick={() => removeAllocation(index)}
                          >
                            Remove link
                          </button>
                        </div>
                      ))}
                    </div>
                    {availableAllocations.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <select
                          className="min-w-64 rounded border border-slate-300 px-3 py-2 text-sm"
                          value={availableAllocationId}
                          disabled={entryBusy}
                          onChange={(event) => setAvailableAllocationId(event.target.value)}
                        >
                          <option value="">Add an open document…</option>
                          {availableAllocations.map((allocation) => (
                            <option key={allocation.documentId} value={allocation.documentId}>
                              {allocation.label} · {formatMoney(allocation.amount, entryForm.payment.currency)}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold disabled:opacity-50"
                          disabled={entryBusy || !availableAllocationId}
                          onClick={addAllocation}
                        >
                          Add document link
                        </button>
                      </div>
                    ) : null}
                  </section>
                ) : null}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Account</th>
                        <th className="px-2 py-2 text-right">Debit</th>
                        <th className="px-2 py-2 text-right">Credit</th>
                        <th className="px-2 py-2">Memo</th>
                        {openedEntry.source === "manual" || isDirectPayment() ? <th /> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {entryForm.lines.map((line, index) => {
                        const directPayment = isDirectPayment();
                        const linkedCashLine =
                          directPayment &&
                          line.account === openedEntry.payment_records[0].bank_account;
                        return (
                          <tr key={`${openedEntry.id}-${index}`} className="border-t border-slate-100">
                            {["account", "debit", "credit", "memo"].map((key) => (
                              <td key={key} className="px-2 py-2">
                                <input
                                  className={`w-full rounded border border-slate-300 px-2 py-1.5 ${key === "debit" || key === "credit" ? "text-right" : ""}`}
                                  aria-label={`${key} for journal line ${index + 1}`}
                                  type={key === "debit" || key === "credit" ? "number" : "text"}
                                  min={key === "debit" || key === "credit" ? "0" : undefined}
                                  step={key === "debit" || key === "credit" ? "0.01" : undefined}
                                  value={line[key]}
                                  disabled={
                                    !canEditEntry() ||
                                    entryBusy ||
                                    isSettlement() ||
                                    (directPayment &&
                                      (key === "credit" ||
                                          (key === "account" && linkedCashLine) ||
                                          (key === "debit" && linkedCashLine)))
                                  }
                                  onChange={(event) => updateEntryLine(index, key, event.target.value)}
                                  required={key === "account" && !isSettlement()}
                                />
                              </td>
                            ))}
                            {openedEntry.source === "manual" || directPayment ? (
                              <td className="px-2 py-2">
                                <button
                                  type="button"
                                  className="text-xs font-semibold text-red-700 disabled:opacity-50"
                                  disabled={
                                    entryBusy ||
                                    entryForm.lines.length <= 2 ||
                                    (directPayment && linkedCashLine)
                                  }
                                  onClick={() =>
                                    setEntryForm((current) => ({
                                      ...current,
                                      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
                                    }))
                                  }
                                >
                                  Remove
                                </button>
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {openedEntry.source === "manual" || isDirectPayment() ? (
                  <div className="mt-4 flex flex-wrap justify-between gap-3">
                    <button
                      type="button"
                      className="rounded border border-slate-300 px-3 py-2 text-sm"
                      disabled={entryBusy}
                      onClick={() =>
                        setEntryForm((current) => ({
                          ...current,
                          lines: [
                            ...current.lines,
                            { account: "", debit: "", credit: "", memo: "" },
                          ],
                        }))
                      }
                    >
                      Add line
                    </button>
                    <div className="flex gap-2">
                      {openedEntry.source === "manual" ? (
                        <button
                          type="button"
                          className="rounded border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 disabled:opacity-50"
                          disabled={entryBusy || openedEntry.status !== "posted"}
                          onClick={voidEntry}
                        >
                          {entryBusy ? "Saving…" : "Void entry"}
                        </button>
                      ) : null}
                      <button
                        type="submit"
                        className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                        disabled={entryBusy || !canEditEntry()}
                      >
                        {entryBusy ? "Saving…" : "Save changes"}
                      </button>
                    </div>
                  </div>
                ) : isSettlement() && canEditEntry() ? (
                  <div className="mt-4 flex justify-end">
                    <button
                      type="submit"
                      className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                      disabled={entryBusy || !canEditEntry()}
                    >
                      {entryBusy ? "Saving…" : "Save payment and allocation changes"}
                    </button>
                  </div>
                ) : null}
              </form>
            ) : null}
          </section>
        </div>
      ) : null}
    </section>
  );
};

export default QuickReport;
