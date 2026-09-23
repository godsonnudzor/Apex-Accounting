import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../context/auth";
import { formatCurrency } from "../utils/taxCalculator";

const PayrollLiabilities = () => {
  const [records, setRecords] = useState([]);
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/payroll/liabilities"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load payroll liabilities");
        setRecords(result.liabilities || []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredRecords = useMemo(
    () => status === "all" ? records : records.filter((record) => record.status === status),
    [records, status],
  );

  const totals = useMemo(() => filteredRecords.reduce((summary, record) => ({
    paye: summary.paye + record.paye,
    ssnit: summary.ssnit + record.ssnit_employee + record.ssnit_employer,
    tier2: summary.tier2 + record.tier2_employee + record.tier2_employer,
    wages: summary.wages + record.net_pay,
  }), { paye: 0, ssnit: 0, tier2: 0, wages: 0 }), [filteredRecords]);

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Payroll liabilities</h1>
            <p className="mt-2 text-sm text-slate-500">Review amounts owed from saved payroll runs.</p>
          </div>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="processed">Processed</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["PAYE payable", totals.paye],
            ["SSNIT total", totals.ssnit],
            ["Tier 2 total", totals.tier2],
            ["Net wages payable", totals.wages],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(value)}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">Period</th>
                <th className="border-b border-slate-200 px-4 py-3">Status</th>
                <th className="border-b border-slate-200 px-4 py-3">PAYE</th>
                <th className="border-b border-slate-200 px-4 py-3">SSNIT</th>
                <th className="border-b border-slate-200 px-4 py-3">Tier 2</th>
                <th className="border-b border-slate-200 px-4 py-3">Net wages</th>
                <th className="border-b border-slate-200 px-4 py-3">Employer contributions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading liabilities...</td></tr> : filteredRecords.length ? filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{record.period_start} to {record.period_end}</td>
                  <td className="border-b border-slate-100 px-4 py-4 capitalize text-slate-600">{record.status}</td>
                  <td className="border-b border-slate-100 px-4 py-4">{formatCurrency(record.paye)}</td>
                  <td className="border-b border-slate-100 px-4 py-4">{formatCurrency(record.ssnit_employee + record.ssnit_employer)}</td>
                  <td className="border-b border-slate-100 px-4 py-4">{formatCurrency(record.tier2_employee + record.tier2_employer)}</td>
                  <td className="border-b border-slate-100 px-4 py-4 font-semibold text-teal-700">{formatCurrency(record.net_pay)}</td>
                  <td className="border-b border-slate-100 px-4 py-4">{formatCurrency(record.employer_contributions)}</td>
                </tr>
              )) : <tr><td colSpan="7" className="px-4 py-8 text-center text-slate-500">No saved payroll records found.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default PayrollLiabilities;
