import { useEffect, useState } from "react";
import { getApiUrl } from "../context/auth";

const money = (value) => `GHC ${Number(value || 0).toFixed(2)}`;
const title = (value) => value[0].toUpperCase() + value.slice(1);

const FinancialReports = () => {
  const [report, setReport] = useState(null);
  const [aging, setAging] = useState({ suppliers: [], customers: [] });
  const [tab, setTab] = useState("profit-loss");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${getApiUrl("/api/reports/financial")}?year=${year}`, { credentials: "include" }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load financial reports");
        return result;
      }),
      fetch(getApiUrl("/api/reports/aging"), { credentials: "include" }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load aging reports");
        return result;
      }),
    ]).then(([financial, agingResult]) => {
      setReport(financial);
      setAging(agingResult);
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, [year]);

  const rows = tab === "profit-loss" ? report?.profitLoss || [] : report?.balanceSheet || [];
  const total = tab === "profit-loss" ? report?.netProfit : report?.balanceSheetTotal;
  const isAging = tab === "supplier-aging" || tab === "customer-aging";
  const agingRows = tab === "supplier-aging" ? aging.suppliers : aging.customers;
  const showReportDetails = async (reportType) => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ report: reportType, year });
      const response = await fetch(`${getApiUrl("/api/reports/financial/details")}?${params}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load report details");
      setDetail(result);
    } catch (detailError) {
      setError(detailError.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const showLedgerDetails = async (account) => {
    setDetailLoading(true);
    try {
      const params = new URLSearchParams({ account: `${account.code} - ${account.name}`, year });
      const response = await fetch(`${getApiUrl("/api/reports/financial/details")}?${params}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load ledger details");
      setDetail(result);
    } catch (detailError) {
      setError(detailError.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (report && !isAging) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting reports</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Financial reports</h1>
            <p className="mt-2 text-sm text-slate-500">Condensed annual view from posted journal entries.</p>
          </div>
          <div className="mb-6 flex flex-wrap gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">Year<input className="w-24 rounded border border-slate-300 bg-white px-3 py-2" type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(event.target.value)} /></label>{[['profit-loss', 'Profit & Loss'], ['balance-sheet', 'Balance Sheet'], ['supplier-aging', 'Supplier Aging'], ['customer-aging', 'Customer Aging']].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === value ? "bg-teal-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{label}</button>)}
          </div>
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-h-56 flex-col items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-8 text-center"><p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{year} · {tab === "profit-loss" ? "Net profit / loss" : "Balance sheet total"}</p><p className={`mt-3 text-5xl font-bold ${Number(total) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(total)}</p><button type="button" className="mt-5 rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700" onClick={() => showReportDetails(tab)}>View entry key</button><p className="mt-2 text-xs text-slate-500">Press Enter or click a ledger below for details.</p></div>
            <div className="mt-5"><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Ledger accounts</h3><div className="grid gap-2 md:grid-cols-2">{(tab === "profit-loss" ? report.profitLoss : report.balanceSheet).map((account) => <button key={account.code} type="button" className="flex items-center justify-between rounded border border-slate-200 bg-white px-4 py-3 text-left hover:border-teal-500" onClick={() => showLedgerDetails(account)} onKeyDown={(event) => { if (event.key === "Enter") showLedgerDetails(account); }}><span className="font-semibold text-slate-800">{account.code} - {account.name}</span><span className="text-slate-600">{money(account.balance)}</span></button>)}</div></div>
          </section>
          {detail ? <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4" role="presentation" onClick={() => setDetail(null)}><section className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-xl" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}><div className="mb-4 flex items-start justify-between"><div><h2 className="text-xl font-semibold text-slate-900">Entry details</h2><p className="mt-1 text-sm text-slate-500">{detail.account}{detail.month ? ` · ${detail.month}` : ""}</p></div><button type="button" className="rounded border border-slate-300 px-3 py-1 text-sm" onClick={() => setDetail(null)}>Close</button></div>{detailLoading ? <p className="text-slate-500">Loading details...</p> : detail.entries.length ? <div className="space-y-3">{detail.entries.map((entry) => <article key={entry.id} className="rounded border border-slate-200 p-4"><div className="flex flex-wrap justify-between gap-2"><strong>{entry.entry_date}</strong><span className="text-slate-500">{entry.reference || entry.source}</span></div><p className="mt-1 text-sm text-slate-700">{entry.description || "No description"}</p>{entry.lines.map((line) => <div key={`${entry.id}-${line.account}`} className="mt-2 flex justify-between text-sm"><span>{line.memo || line.account}</span><span>Debit {money(line.debit)} · Credit {money(line.credit)}</span></div>)}</article>)}</div> : <p className="text-slate-500">No posted entries found.</p>}</section></div> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting reports</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Financial reports</h1>
          <p className="mt-2 text-sm text-slate-500">Live balances from posted journal entries.</p>
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {[['profit-loss', 'Profit & Loss'], ['balance-sheet', 'Balance Sheet'], ['supplier-aging', 'Supplier Aging'], ['customer-aging', 'Customer Aging']].map(([value, label]) => <button key={value} onClick={() => setTab(value)} className={`rounded px-4 py-2 text-sm font-semibold ${tab === value ? "bg-teal-600 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{label}</button>)}
        </div>
        {error && <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</p>}
        {loading ? <div className="rounded-xl bg-white p-8 text-center text-slate-500">Loading report...</div> : isAging ? <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">{tab === "supplier-aging" ? "Supplier aging" : "Customer aging"}</h2><p className="mt-2 text-sm text-slate-500">{agingRows.length ? "Outstanding balances by age." : "No aging records are available yet. Bills and invoices must be saved before aging can be calculated."}</p>{agingRows.length ? <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Current</th><th className="px-3 py-2">1-30 days</th><th className="px-3 py-2">31-60 days</th><th className="px-3 py-2">61-90 days</th><th className="px-3 py-2">90+ days</th><th className="px-3 py-2">Total</th></tr></thead><tbody>{agingRows.map((row) => <tr key={row.name} className="border-t border-slate-100"><td className="px-3 py-3 font-semibold">{row.name}</td>{["current", "days1to30", "days31to60", "days61to90", "over90", "total"].map((key) => <td key={key} className="px-3 py-3">{money(row[key])}</td>)}</tr>)}</tbody></table></div> : null}</section> : <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-semibold text-slate-900">{tab === "profit-loss" ? "Profit & Loss" : "Balance Sheet"}</h2><p className="mt-1 text-sm text-slate-500">As of the latest posted transaction.</p></div><p className={`text-xl font-bold ${Number(total) >= 0 ? "text-emerald-700" : "text-red-700"}`}>{money(total)}</p></div><table className="w-full max-w-3xl text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Account</th><th className="px-3 py-2">Type</th><th className="px-3 py-2 text-right">Balance</th></tr></thead><tbody>{rows.map((row) => <tr key={row.code} className="border-t border-slate-100"><td className="px-3 py-3 font-semibold">{row.code} - {row.name}</td><td className="px-3 py-3 capitalize text-slate-600">{title(row.account_type)}</td><td className="px-3 py-3 text-right">{money(row.balance)}</td></tr>)}</tbody></table></section>}
      </div>
    </main>
  );
};

export default FinancialReports;
