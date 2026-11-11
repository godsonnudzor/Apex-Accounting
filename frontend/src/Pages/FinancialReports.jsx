import { useEffect, useState } from "react";
import { getApiUrl } from "../context/auth";
import QuickReport from "../components/QuickReport";

const money = (value) => `GHC ${Number(value || 0).toFixed(2)}`;

const REPORT_TITLES = {
  "profit-loss": "Profit & Loss",
  "balance-sheet": "Balance Sheet",
  "supplier-aging": "Supplier Aging",
  "customer-aging": "Customer Aging",
};

const FinancialReports = ({ reportType = "profit-loss" }) => {
  const [report, setReport] = useState(null);
  const [aging, setAging] = useState({ suppliers: [], customers: [] });
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [detailAccount, setDetailAccount] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const isAging = reportType === "supplier-aging" || reportType === "customer-aging";
  const agingRows = reportType === "supplier-aging" ? aging.suppliers : aging.customers;
  const reportTitle = REPORT_TITLES[reportType] || REPORT_TITLES["profit-loss"];

  useEffect(() => {
    setLoading(true);
    setError("");

    const url = isAging
      ? getApiUrl("/api/reports/aging")
      : `${getApiUrl("/api/reports/financial")}?year=${year}`;

    fetch(url, { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) {
          throw new Error(
            result.message ||
              (isAging ? "Unable to load aging reports" : "Unable to load financial reports"),
          );
        }
        return result;
      })
      .then((result) => {
        if (isAging) {
          setAging(result);
        } else {
          setReport(result);
        }
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, [isAging, reportType, year]);

  const incomeAccounts =
    report?.profitLoss?.filter((account) => account.account_type === "income") || [];
  const expenseAccounts =
    report?.profitLoss?.filter((account) => account.account_type === "expense") || [];
  const incomeTotal = incomeAccounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );
  const expenseTotal = expenseAccounts.reduce(
    (sum, account) => sum + Number(account.balance || 0),
    0,
  );
  const total =
    reportType === "profit-loss" ? report?.netProfit : report?.balanceSheetTotal;

  const showLedgerDetails = async (account) => {
    setDetailLoading(true);
    setDetail(null);
    setDetailAccount(account);
    try {
      const params = new URLSearchParams({
        account: `${account.code} - ${account.name}`,
        year: "all",
      });
      const response = await fetch(
        `${getApiUrl("/api/reports/financial/details")}?${params}`,
        { credentials: "include" },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to load ledger details");
      }
      setDetail(result);
    } catch (detailError) {
      setError(detailError.message);
    } finally {
      setDetailLoading(false);
    }
  };

  if (!isAging && report) {
    return (
      <main className="min-h-screen bg-slate-100 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
                Reports
              </p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">{reportTitle}</h1>
              <p className="mt-2 text-sm text-slate-500">
                Detailed statement for {year}, based on posted journal entries.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              Year
              <input
                className="w-24 rounded border border-slate-300 bg-white px-3 py-2"
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(event) => setYear(event.target.value)}
              />
            </label>
          </div>
          {error ? (
            <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mt-5">
              {reportType === "profit-loss" ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {[
                    { title: "Income", accounts: incomeAccounts, total: incomeTotal },
                    { title: "Expenses", accounts: expenseAccounts, total: expenseTotal },
                  ].map((column) => (
                    <div key={column.title}>
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
                          {column.title}
                        </h2>
                        <span className="text-sm font-semibold text-slate-700">
                          {money(column.total)}
                        </span>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {column.accounts.length ? (
                          column.accounts.map((account) => (
                            <button
                              key={account.code}
                              type="button"
                              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3 text-left hover:bg-slate-50"
                              onClick={() => showLedgerDetails(account)}
                              onContextMenu={(event) => {
                                event.preventDefault();
                                showLedgerDetails(account);
                              }}
                            >
                              <span className="min-w-0">
                                <span className="font-semibold text-slate-800">
                                  {account.code}
                                </span>
                                <span className="ml-2 text-slate-700">{account.name}</span>
                              </span>
                              <span className="text-right text-slate-600">
                                {money(account.balance)}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="py-4 text-sm text-slate-500">
                            No {column.title.toLowerCase()} accounts.
                          </p>
                        )}
                      </div>
                      <div className="flex justify-between border-t border-slate-200 pt-3 text-sm font-semibold text-slate-800">
                        <span>Total {column.title}</span>
                        <span>{money(column.total)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="mt-5 flex justify-between border-t-2 border-slate-300 pt-4 font-bold text-slate-900 md:col-span-2">
                    <span>Net profit / loss</span>
                    <span>{money(total)}</span>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Account</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2 text-right">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(report.balanceSheet || []).map((account) => (
                        <tr
                          key={account.code}
                          className="border-t border-slate-100"
                          onContextMenu={(event) => {
                            event.preventDefault();
                            showLedgerDetails(account);
                          }}
                        >
                          <td className="px-3 py-3">
                            <button
                              type="button"
                              className="text-left font-semibold text-slate-800 hover:text-teal-700"
                              onClick={() => showLedgerDetails(account)}
                            >
                              {account.code} - {account.name}
                            </button>
                          </td>
                          <td className="px-3 py-3 capitalize text-slate-600">
                            {account.account_type}
                          </td>
                          <td className="px-3 py-3 text-right">
                            {money(account.balance)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 font-bold text-slate-900">
                        <td colSpan="2" className="px-3 py-3">
                          Balance sheet total
                        </td>
                        <td className="px-3 py-3 text-right">{money(total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </section>
          {detailAccount ? (
            <div
              className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4"
              role="presentation"
              onClick={() => {
                setDetail(null);
                setDetailAccount(null);
              }}
            >
              <section
                className="max-h-[80vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 shadow-xl"
                role="dialog"
                aria-modal="true"
                onClick={(event) => event.stopPropagation()}
              >
                <QuickReport
                  account={detailAccount}
                  entries={detail?.entries || []}
                  loading={detailLoading}
                  sourcePage={`${reportTitle} report · ledger details`}
                  onRefresh={() => showLedgerDetails(detailAccount)}
                  onClose={() => {
                    setDetail(null);
                    setDetailAccount(null);
                  }}
                />
              </section>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
            {isAging ? (reportType === "supplier-aging" ? "Suppliers" : "Customers") : "Reports"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{reportTitle}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isAging
              ? "Outstanding balances grouped by days since each bill or invoice date."
              : `Financial statement for ${year}, based on posted journal entries.`}
          </p>
        </div>
        {error ? (
          <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">
            {error}
          </p>
        ) : null}
        {loading ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500">
            Loading report...
          </div>
        ) : !isAging ? (
          <div className="rounded-xl bg-white p-8 text-center text-slate-500">
            {error ? "The report could not be loaded." : "No report data is available."}
          </div>
        ) : (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">{reportTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">
              {agingRows.length
                ? "Outstanding balances grouped by days since each bill or credit date."
                : "No aging records are available yet. Bills and invoices must be saved before aging can be calculated."}
            </p>
            {agingRows.length ? (
              <div className="mt-5 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">0-30 days</th>
                      <th className="px-3 py-2">31-60 days</th>
                      <th className="px-3 py-2">61-90 days</th>
                      <th className="px-3 py-2">90+ days</th>
                      <th className="px-3 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agingRows.map((row) => (
                      <tr
                        key={row.supplier_id || row.customer_id || row.name}
                        className="border-t border-slate-100"
                      >
                        <td className="px-3 py-3 font-semibold">{row.name}</td>
                        {["days1to30", "days31to60", "days61to90", "over90", "total"].map(
                          (key) => (
                            <td key={key} className="px-3 py-3">
                              {money(row[key])}
                            </td>
                          ),
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>
        )}
      </div>
    </main>
  );
};

export default FinancialReports;
