import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../context/auth";

const accountTypes = ["asset", "liability", "equity", "income", "expense"];
const initialForm = { code: "", name: "", accountType: "asset" };
const formatMoney = (value) => `GHC ${Number(value || 0).toFixed(2)}`;

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerYear, setLedgerYear] = useState(String(new Date().getFullYear()));
  const [fontSize, setFontSize] = useState("text-sm");
  const [columns, setColumns] = useState({ date: true, entryKey: true, description: true, source: true, debit: true, credit: true, memo: true });

  const loadAccounts = async () => {
    const response = await fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load chart of accounts");
    setAccounts(result.accounts || []);
  };

  useEffect(() => {
    loadAccounts().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  const visibleAccounts = useMemo(
    () => filter === "all" ? accounts : accounts.filter((account) => account.account_type === filter),
    [accounts, filter],
  );

  const updateForm = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const openLedgerReport = async (account) => {
    setSelectedAccount(account);
    setLedgerLoading(true);
    setLedgerSearch("");
    try {
      const params = new URLSearchParams({ account: `${account.code} - ${account.name}`, year: ledgerYear });
      const response = await fetch(`${getApiUrl("/api/reports/financial/details")}?${params}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load ledger report");
      setLedgerEntries(result.entries || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  const toggleColumn = (column) => setColumns((current) => ({ ...current, [column]: !current[column] }));
  const searchableEntries = ledgerEntries.filter((entry) => {
    const text = [entry.entry_date, entry.id, entry.reference, entry.description, entry.source, ...(entry.lines || []).map((line) => `${line.memo || ""} ${line.account}`)].join(" ").toLowerCase();
    return text.includes(ledgerSearch.toLowerCase());
  });
  const ledgerTotals = searchableEntries.reduce((summary, entry) => (entry.lines || []).reduce((lineSummary, line) => ({ debit: lineSummary.debit + Number(line.debit || 0), credit: lineSummary.credit + Number(line.credit || 0) }), summary), { debit: 0, credit: 0 });

  const saveAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(getApiUrl("/api/ledger/accounts"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create account");
      setAccounts((current) => [...current, result.account].sort((left, right) => left.code.localeCompare(right.code)));
      setForm(initialForm);
      setMessage("Ledger account created successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Chart of accounts</h1>
            <p className="mt-2 text-sm text-slate-500">Manage the accounts used by payroll, payments, and journal entries.</p>
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="all">All account types</option>
            {accountTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
          </select>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}

        <form onSubmit={saveAccount} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add ledger account</h2>
          <div className="grid gap-4 md:grid-cols-[160px_1fr_200px_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700">Code<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="code" value={form.code} onChange={updateForm} placeholder="5700" required /></label>
            <label className="text-sm font-medium text-slate-700">Account name<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="name" value={form.name} onChange={updateForm} placeholder="Bank charges" required /></label>
            <label className="text-sm font-medium text-slate-700">Type<select className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="accountType" value={form.accountType} onChange={updateForm}>{accountTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}</select></label>
            <button className="rounded bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50" disabled={saving}>{saving ? "Saving..." : "Add account"}</button>
          </div>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Loading accounts...</td></tr> : visibleAccounts.length ? visibleAccounts.map((account) => <tr key={account.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-900">{account.code}</td><td className="px-4 py-3">{account.name}</td><td className="px-4 py-3 capitalize text-slate-600">{account.account_type}</td><td className="px-4 py-3 text-right font-semibold">{formatMoney(account.balance)}</td><td className="px-4 py-3 text-emerald-700">Active</td><td className="px-4 py-3"><button type="button" className="rounded bg-teal-600 px-3 py-1 text-xs font-semibold text-white" onClick={() => openLedgerReport(account)}>Open report</button></td></tr>) : <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">No accounts found.</td></tr>}</tbody>
          </table>
        </div>

        {selectedAccount && <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Individual ledger report</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{selectedAccount.code} - {selectedAccount.name}</h2><p className="mt-1 text-sm text-slate-500">Entry key and transaction history for the selected ledger.</p></div>
            <div className="flex flex-wrap gap-2"><label className="text-xs font-semibold text-slate-500">Year<input className="mt-1 block w-24 rounded border border-slate-300 px-2 py-2 text-sm" type="number" min="2000" max="2100" value={ledgerYear} onChange={(event) => { setLedgerYear(event.target.value); }} onKeyDown={(event) => { if (event.key === "Enter") openLedgerReport(selectedAccount); }} /></label><label className="text-xs font-semibold text-slate-500">Search entries<input className="mt-1 block w-64 rounded border border-slate-300 px-2 py-2 text-sm" value={ledgerSearch} onChange={(event) => setLedgerSearch(event.target.value)} placeholder="Reference, memo, description..." /></label><label className="text-xs font-semibold text-slate-500">Font<select className="mt-1 block rounded border border-slate-300 bg-white px-2 py-2 text-sm" value={fontSize} onChange={(event) => setFontSize(event.target.value)}><option value="text-xs">Small</option><option value="text-sm">Medium</option><option value="text-base">Large</option></select></label><button type="button" className="self-end rounded border border-slate-300 px-3 py-2 text-sm" onClick={() => setSelectedAccount(null)}>Close</button></div>
          </div>
          <div className="mt-5 flex flex-wrap gap-3 border-y border-slate-200 py-3 text-sm">{Object.entries({ date: "Date", entryKey: "Entry key", description: "Description", source: "Source", debit: "Debit", credit: "Credit", memo: "Memo" }).map(([key, label]) => <label key={key} className="flex items-center gap-1"><input type="checkbox" checked={columns[key]} onChange={() => toggleColumn(key)} />{label}</label>)}<span className="ml-auto font-semibold">Debit {formatMoney(ledgerTotals.debit)} · Credit {formatMoney(ledgerTotals.credit)}</span></div>
          <div className="mt-4 overflow-x-auto">{ledgerLoading ? <p className="p-6 text-center text-slate-500">Loading ledger entries...</p> : <table className={`w-full min-w-[850px] text-left ${fontSize}`}><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.date && <th className="px-3 py-2">Date</th>}{columns.entryKey && <th className="px-3 py-2">Entry key</th>}{columns.description && <th className="px-3 py-2">Description</th>}{columns.source && <th className="px-3 py-2">Source</th>}{columns.debit && <th className="px-3 py-2 text-right">Debit</th>}{columns.credit && <th className="px-3 py-2 text-right">Credit</th>}{columns.memo && <th className="px-3 py-2">Memo</th>}</tr></thead><tbody>{searchableEntries.length ? searchableEntries.map((entry) => (entry.lines || []).map((line, lineIndex) => <tr key={`${entry.id}-${lineIndex}`} className="border-t border-slate-100">{columns.date && <td className="px-3 py-3">{entry.entry_date}</td>}{columns.entryKey && <td className="px-3 py-3 font-semibold">{entry.reference || `JE-${entry.id}`}</td>}{columns.description && <td className="px-3 py-3">{entry.description || "-"}</td>}{columns.source && <td className="px-3 py-3 capitalize">{entry.source}</td>}{columns.debit && <td className="px-3 py-3 text-right">{formatMoney(line.debit)}</td>}{columns.credit && <td className="px-3 py-3 text-right">{formatMoney(line.credit)}</td>}{columns.memo && <td className="px-3 py-3">{line.memo || "-"}</td>}</tr>)) : <tr><td colSpan="7" className="px-3 py-8 text-center text-slate-500">No matching transactions found.</td></tr>}</tbody></table>}</div>
        </section>}
      </div>
    </main>
  );
};

export default ChartOfAccounts;
