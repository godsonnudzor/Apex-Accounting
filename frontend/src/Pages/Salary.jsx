import { useEffect, useMemo, useState } from "react";
import { getApiUrl } from "../context/auth";
import { formatCurrency } from "../utils/taxCalculator";
import {
  calculateGhanaPayroll,
  calculatePayrollTotals,
  GHANA_PAYROLL_RATES,
} from "../utils/ghanaPayroll";

const PAYROLL_COLUMNS = [
  { key: "grossPay", label: "Gross", value: (entry) => entry.grossPay },
  { key: "paye", label: "PAYE", value: (entry) => entry.paye },
  {
    key: "ssnitEmployee",
    label: "SSNIT employee",
    value: (entry) => entry.ssnitEmployee,
  },
  {
    key: "tier2Employee",
    label: "Tier 2 employee",
    value: (entry) => entry.tier2Employee,
  },
  {
    key: "netPay",
    label: "Net pay",
    value: (entry) => entry.netPay,
    emphasis: true,
  },
  {
    key: "ssnitEmployer",
    label: "SSNIT employer",
    value: (entry) => entry.ssnitEmployer,
  },
  {
    key: "tier2Employer",
    label: "Tier 2 employer",
    value: (entry) => entry.tier2Employer,
  },
  {
    key: "employerCost",
    label: "Employer cost",
    value: (entry) => entry.employerCost,
    emphasis: true,
  },
];

const Salary = () => {
  const [employees, setEmployees] = useState([]);
  const [periodStart, setPeriodStart] = useState("2026-09-01");
  const [periodEnd, setPeriodEnd] = useState("2026-09-30");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() =>
    Object.fromEntries(PAYROLL_COLUMNS.map((column) => [column.key, true])),
  );

  useEffect(() => {
    fetch(getApiUrl("/api/employees"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load employees");
        setEmployees(result.employees || []);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  const entries = useMemo(
    () => employees.map((employee) => calculateGhanaPayroll(employee)),
    [employees],
  );
  const totals = useMemo(() => calculatePayrollTotals(entries), [entries]);
  const activeColumns = PAYROLL_COLUMNS.filter(
    (column) => visibleColumns[column.key],
  );

  const toggleColumn = (key) => {
    setVisibleColumns((current) => ({ ...current, [key]: !current[key] }));
  };

  const savePayrollRun = async () => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(getApiUrl("/api/payroll/runs"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart,
          periodEnd,
          rates: GHANA_PAYROLL_RATES,
          totals,
          entries,
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to save payroll run");
      setMessage(`Payroll run ${result.runId} saved and journal entry ${result.journalEntryId} posted.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl print:hidden">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
              Salary workspace
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Ghana payroll
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Monthly PAYE, SSNIT, Tier 2, and total employer cost in one
              review.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 rounded-xl bg-white p-3 shadow-sm">
            <label className="text-xs font-semibold text-slate-500">
              Period start
              <input
                className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
                type="date"
                value={periodStart}
                onChange={(event) => setPeriodStart(event.target.value)}
              />
            </label>
            <label className="text-xs font-semibold text-slate-500">
              Period end
              <input
                className="mt-1 block rounded border border-slate-300 px-2 py-1.5 text-sm"
                type="date"
                value={periodEnd}
                onChange={(event) => setPeriodEnd(event.target.value)}
              />
            </label>
            <button
              className="self-end rounded bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              onClick={savePayrollRun}
              disabled={saving || !entries.length}
            >
              {saving ? "Saving..." : "Save payroll run"}
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Gross payroll", totals.gross],
            ["PAYE", totals.paye],
            ["Employee deductions", totals.deductions],
            ["Net pay", totals.net],
            ["Employer cost", totals.employerCost],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-2 text-xl font-bold text-slate-900">
                {formatCurrency(value)}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <p
            className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
            role="status"
          >
            {message}
          </p>
        )}
        <div className="mb-2 flex justify-end">
          <div className="relative">
            <button
              type="button"
              aria-expanded={columnsOpen}
              onClick={() => setColumnsOpen((current) => !current)}
              className="rounded border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              Customize columns
            </button>
            {columnsOpen && (
              <div className="absolute right-0 z-10 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Visible columns
                </p>
                {PAYROLL_COLUMNS.map((column) => (
                  <label
                    key={column.key}
                    className="flex cursor-pointer items-center gap-2 px-1 py-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns[column.key]}
                      onChange={() => toggleColumn(column.key)}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    {column.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] border-collapse text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3">
                  Employee
                </th>
                {activeColumns.map((column) => (
                  <th
                    className="border-b border-slate-200 px-4 py-3"
                    key={column.key}
                  >
                    {column.label}
                  </th>
                ))}
                <th className="border-b border-slate-200 px-4 py-3">Payslip</th>
              </tr>
            </thead>
            <tbody>
              {entries.length ? (
                entries.map((entry) => {
                  const employee = employees.find(
                    (item) => item.id === entry.employeeId,
                  );
                  return (
                    <tr className="hover:bg-slate-50" key={entry.employeeId}>
                      <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">
                        {employee?.name || "Unnamed employee"}
                      </td>
                      {activeColumns.map((column) => (
                        <td
                          className={`border-b border-slate-100 px-4 py-4 ${column.emphasis ? "font-semibold text-teal-700" : ""}`}
                          key={column.key}
                        >
                          {formatCurrency(column.value(entry))}
                        </td>
                      ))}
                      <td className="border-b border-slate-100 px-4 py-4">
                        <button
                          className="font-semibold text-teal-700 hover:text-teal-900"
                          onClick={() =>
                            setSelectedPayslip({ employee, entry })
                          }
                        >
                          View payslip
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    className="px-4 py-10 text-center text-slate-500"
                    colSpan={activeColumns.length + 2}
                  >
                    No employees available for payroll.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Rates used: employee SSNIT 5.5%, employer SSNIT 8%, employer Tier 2
          5%. Employer contributions total 13%; total statutory contributions
          are 18.5%. PAYE uses the Ghana monthly bracket library.
        </p>
      </div>

      {selectedPayslip && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 print:static print:overflow-visible print:bg-white print:p-0"
          role="dialog"
          aria-modal="true"
          aria-label="Employee payslip"
        >
          <article className="mx-auto my-8 max-w-2xl bg-white p-6 shadow-2xl print:my-0 print:max-w-none print:p-8 print:shadow-none">
            <div className="mb-8 flex items-start justify-between border-b border-slate-200 pb-5">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
                  Apex ERP
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  Employee payslip
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {periodStart} to {periodEnd}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  className="rounded border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                  onClick={() => setSelectedPayslip(null)}
                >
                  Close
                </button>
                <button
                  className="rounded bg-teal-600 px-3 py-2 text-sm font-semibold text-white"
                  onClick={() => window.print()}
                >
                  Print
                </button>
              </div>
            </div>
            <div className="mb-6 grid gap-4 border-b border-slate-200 pb-6 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Employee
                </p>
                <p className="mt-1 font-semibold text-slate-900">
                  {selectedPayslip.employee?.name || "Unnamed employee"}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedPayslip.employee?.position || "Employee"}
                </p>
                <p className="text-sm text-slate-600">
                  {selectedPayslip.employee?.email || ""}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Payment details
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  Bank: {selectedPayslip.employee?.bank_name || "Not provided"}
                </p>
                <p className="text-sm text-slate-700">
                  Account:{" "}
                  {selectedPayslip.employee?.account_name || "Not provided"}
                </p>
                <p className="text-sm text-slate-700">
                  TIN: {selectedPayslip.employee?.tin_no || "Not provided"}
                </p>
              </div>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Earnings
                </h3>
                <PayslipLine
                  label="Basic pay"
                  value={selectedPayslip.entry.basicPay}
                />
                <PayslipLine
                  label="Allowance"
                  value={selectedPayslip.entry.allowance}
                />
                <PayslipLine
                  label="Gross pay"
                  value={selectedPayslip.entry.grossPay}
                  strong
                />
              </section>
              <section>
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  Employee deductions
                </h3>
                <PayslipLine label="PAYE" value={selectedPayslip.entry.paye} />
                <PayslipLine
                  label="SSNIT (5.5%)"
                  value={selectedPayslip.entry.ssnitEmployee}
                />
                <PayslipLine
                  label="Tier 2"
                  value={selectedPayslip.entry.tier2Employee}
                />
                <PayslipLine
                  label="Total deductions"
                  value={selectedPayslip.entry.totalEmployeeDeductions}
                  strong
                />
              </section>
            </div>
            <div className="mt-6 border-t-2 border-slate-900 pt-4">
              <PayslipLine
                label="Net pay"
                value={selectedPayslip.entry.netPay}
                strong
                large
              />
            </div>
            <div className="mt-8 border-t border-slate-200 pt-5">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                Contributions
              </h3>
              <div className="grid gap-2 sm:grid-cols-4">
                <PayslipLine
                  label="Employee SSNIT (5.5%)"
                  value={selectedPayslip.entry.ssnitEmployee}
                />
                <PayslipLine
                  label="Total SSNIT (13.5%)"
                  value={selectedPayslip.entry.totalSsnitContribution}
                />
                <PayslipLine
                  label="Tier 2 (5%)"
                  value={selectedPayslip.entry.tier2Employer}
                />
                <PayslipLine
                  label="Employer total (13%)"
                  value={selectedPayslip.entry.totalEmployerContributions}
                  strong
                />
              </div>
            </div>
            <p className="mt-8 text-xs text-slate-400">
              Generated by Apex ERP. Currency: GHS.
            </p>
          </article>
        </div>
      )}
    </main>
  );
};

function PayslipLine({ label, value, strong = false, large = false }) {
  return (
    <div
      className={`flex justify-between gap-4 py-1.5 ${strong ? "font-bold text-slate-900" : "text-slate-600"} ${large ? "text-xl" : "text-sm"}`}
    >
      <span>{label}</span>
      <span>{formatCurrency(value)}</span>
    </div>
  );
}

export default Salary;
