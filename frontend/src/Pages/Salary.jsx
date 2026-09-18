import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../context/auth";
import { formatCurrency } from "../utils/taxCalculator";
import { calculateGhanaPayroll, calculatePayrollTotals, GHANA_PAYROLL_RATES } from "../utils/ghanaPayroll";

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [periodStart, setPeriodStart] = useState("2026-09-01");
  const [periodEnd, setPeriodEnd] = useState("2026-09-30");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/employees"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load employees");
        setEmployees(result.employees || []);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const entries = useMemo(() => employees.map((employee) => calculateGhanaPayroll(employee)), [employees]);
  const totals = useMemo(() => calculatePayrollTotals(entries), [entries]);

  const savePayrollRun = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(getApiUrl("/api/payroll/runs"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ periodStart, periodEnd, rates: GHANA_PAYROLL_RATES, totals, entries }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save payroll run");
      setMessage(`Payroll run ${result.runId} saved.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Salary workspace</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Ghana payroll</h1>
            <p className="mt-2 text-sm text-slate-500">Monthly PAYE, SSNIT, Tier 2, and total employer cost in one review.</p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
            <label className="text-xs font-semibold text-slate-500">Period start<input className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm" type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /></label>
            <label className="text-xs font-semibold text-slate-500">Period end<input className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm" type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></label>
            <button className="self-end rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50" onClick={savePayrollRun} disabled={saving || !entries.length}>{saving ? "Saving..." : "Save payroll run"}</button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[['Gross payroll', totals.gross], ['PAYE', totals.paye], ['Employee deductions', totals.deductions], ['Net pay', totals.net], ['Employer cost', totals.employerCost]].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(value)}</p></div>)}
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1080px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Employee", "Gross", "PAYE", "SSNIT employee", "Tier 2 employee", "Net pay", "SSNIT employer", "Tier 2 employer", "Employer cost"].map((heading) => <th className="border-b border-slate-200 px-4 py-3" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{entries.length ? entries.map((entry) => { const employee = employees.find((item) => item.id === entry.employeeId); return <tr className="hover:bg-slate-50" key={entry.employeeId}><td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{employee?.name || "Unnamed employee"}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.grossPay)}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.paye)}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.ssnitEmployee)}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.tier2Employee)}</td><td className="border-b border-slate-100 px-4 py-4 font-semibold text-teal-700">{formatCurrency(entry.netPay)}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.ssnitEmployer)}</td><td className="border-b border-slate-100 px-4 py-4">{formatCurrency(entry.tier2Employer)}</td><td className="border-b border-slate-100 px-4 py-4 font-semibold">{formatCurrency(entry.employerCost)}</td></tr>; }) : <tr><td className="px-4 py-10 text-center text-slate-500" colSpan="9">No employees available for payroll.</td></tr>}</tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">Rates used: employee SSNIT 5.5%, employer SSNIT 13%, employer Tier 2 5%. PAYE uses the Ghana monthly bracket library. Tier 2 employee rate is configurable and currently 0%.</p>
      </div>
    </main>
  );
};

export default Salary;
