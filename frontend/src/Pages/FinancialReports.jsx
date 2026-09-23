import { useEffect, useState } from "react";
import { getApiUrl } from "../context/auth";

const money = (value) => `GHC ${Number(value || 0).toFixed(2)}`;
const title = (value) => value[0].toUpperCase() + value.slice(1);

const FinancialReports = () => {
  const [report, setReport] = useState(null);
  const [aging, setAging] = useState({ suppliers: [], customers: [] });
  const [tab, setTab] = useState("profit-loss");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/reports/financial"), { credentials: "include" }).then(async (response) => {
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
  }, []);

  const rows = tab === "profit-loss" ? report?.profitLoss || [] : report?.balanceSheet || [];
  const total = tab === "profit-loss" ? report?.netProfit : report?.balanceSheetTotal;
  const isAging = tab === "supplier-aging" || tab === "customer-aging";
  const agingRows = tab === "supplier-aging" ? aging.suppliers : aging.customers;

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
