import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiUrl } from "../context/auth";

const workspaceTabs = ["Suppliers", "Transactions"];
const detailTabs = ["Transactions", "Contacts", "To Do's", "Notes"];

const formatMoney = (amount, currency = "GHS") => {
  if (amount == null || amount === "") return "—";
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const SuppliersCenter = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [bills, setBills] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [updatingLineId, setUpdatingLineId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [workspaceTab, setWorkspaceTab] = useState("Suppliers");
  const [detailTab, setDetailTab] = useState("Transactions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [supplierResponse, billResponse, accountResponse] = await Promise.all([
        fetch(getApiUrl("/api/suppliers?includeInactive=true"), { credentials: "include" }),
        fetch(getApiUrl("/api/supplier-bills"), { credentials: "include" }),
        fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }),
      ]);
      const [supplierResult, billResult, accountResult] = await Promise.all([
        supplierResponse.json(),
        billResponse.json(),
        accountResponse.json(),
      ]);
      if (!supplierResponse.ok) throw new Error(supplierResult.message || "Unable to load suppliers");
      if (!billResponse.ok) throw new Error(billResult.message || "Unable to load supplier transactions");
      if (!accountResponse.ok) throw new Error(accountResult.message || "Unable to load ledger accounts");
      setSuppliers(supplierResult.suppliers || []);
      setBills(billResult.bills || []);
      setAccounts(accountResult.accounts || []);
    };

    loadData()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const visibleSuppliers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return suppliers.filter((supplier) => {
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? supplier.is_active : !supplier.is_active);
      const matchesSearch = !normalizedSearch
        || [supplier.name, supplier.main_email, supplier.email, supplier.main_phone, supplier.phone]
          .some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      return matchesStatus && matchesSearch;
    });
  }, [search, statusFilter, suppliers]);

  const selectedSupplier = visibleSuppliers.find(
    (supplier) => String(supplier.id) === String(selectedSupplierId),
  ) || visibleSuppliers[0] || null;
  const selectedBills = useMemo(
    () => bills.filter((bill) => String(bill.supplier_id) === String(selectedSupplier?.id)),
    [bills, selectedSupplier?.id],
  );
  const expenseAccounts = accounts.filter((account) => account.account_type === "expense");

  const editSelectedSupplier = () => {
    if (!selectedSupplier) return;
    navigate("/suppliers", { state: { supplier: selectedSupplier } });
  };

  const createSupplierTransaction = () => {
    navigate("/bill", { state: { supplierId: selectedSupplier?.id } });
  };

  const updateLineAccount = async (billId, lineId, ledgerAccountId) => {
    setError("");
    setUpdatingLineId(lineId);
    try {
      const response = await fetch(getApiUrl(`/api/supplier-bill-lines/${lineId}`), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ledgerAccountId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to update ledger account");
      setBills((current) => current.map((bill) => (
        String(bill.id) !== String(billId)
          ? bill
          : {
            ...bill,
            lines: bill.lines.map((line) => (
              String(line.id) === String(lineId)
                ? { ...line, ledger_account_id: result.line.ledger_account_id, ledger_account: result.line.ledger_account }
                : line
            )),
          }
      )));
    } catch (updateError) {
      setError(updateError.message);
    } finally {
      setUpdatingLineId(null);
    }
  };

  const exportSuppliers = () => {
    const columns = ["name", "currency", "email", "phone", "is_active"];
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = visibleSuppliers.map((supplier) => [
      supplier.name,
      supplier.currency || "GHS",
      supplier.main_email || supplier.email,
      supplier.main_phone || supplier.phone,
      supplier.is_active ? "Active" : "Inactive",
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "suppliers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const selectedContact = selectedSupplier
    ? [
      selectedSupplier.salutation,
      selectedSupplier.first_name,
      selectedSupplier.middle_name,
      selectedSupplier.last_name,
    ].filter(Boolean).join(" ")
    : "";

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-800 sm:p-5">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2">
          <Link to="/suppliers" className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-800">
            + New Supplier
          </Link>
          <button type="button" onClick={createSupplierTransaction} disabled={!selectedSupplier} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">
            New Transactions
          </button>
          <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">
            Print
          </button>
          <button type="button" onClick={exportSuppliers} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">
            Export CSV
          </button>
        </header>

        {error && <p className="m-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <div className="grid min-h-[calc(100vh-170px)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-slate-300 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="flex border-b border-slate-300">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setWorkspaceTab(tab)}
                  className={`border-r border-slate-300 px-4 py-2 text-sm font-semibold ${
                    workspaceTab === tab ? "bg-white text-slate-900" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {workspaceTab === "Suppliers" ? <><div className="space-y-2 p-3">
              <label className="sr-only" htmlFor="supplier-status-filter">Supplier status</label>
              <select
                id="supplier-status-filter"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                <option value="active">Active Suppliers</option>
                <option value="inactive">Inactive Suppliers</option>
                <option value="all">All Suppliers</option>
              </select>
              <label className="relative block">
                <span className="sr-only">Search suppliers</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search suppliers"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 pr-9 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                />
                <span aria-hidden="true" className="absolute right-3 top-2 text-slate-400">⌕</span>
              </label>
            </div>

            <div className="overflow-x-auto lg:overflow-x-visible">
              <table className="w-full min-w-[480px] table-fixed text-left text-xs">
                <thead className="sticky top-0 bg-slate-100 uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-[52%] px-3 py-2">Name</th>
                    <th className="w-[18%] px-2 py-2">Currency</th>
                    <th className="px-2 py-2 text-right">Balance total</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-500">Loading suppliers…</td></tr>
                  ) : visibleSuppliers.length ? visibleSuppliers.map((supplier) => {
                    const selected = String(supplier.id) === String(selectedSupplier?.id);
                    return (
                      <tr
                        key={supplier.id}
                        onClick={() => setSelectedSupplierId(String(supplier.id))}
                        onDoubleClick={() => {
                          setSelectedSupplierId(String(supplier.id));
                          navigate("/suppliers", { state: { supplier } });
                        }}
                        className={`cursor-pointer border-t border-slate-200 ${
                          selected ? "bg-emerald-100" : "hover:bg-slate-100"
                        }`}
                        aria-selected={selected}
                      >
                        <td className="truncate px-3 py-2 font-medium" title={supplier.name}>{supplier.name}</td>
                        <td className="px-2 py-2">{supplier.currency || "GHS"}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{formatMoney(bills.filter((bill) => String(bill.supplier_id) === String(supplier.id)).reduce((sum, bill) => sum + Number(bill.signed_amount || 0), 0), supplier.currency || "GHS")}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-500">No suppliers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            </> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-xs">
                  <thead className="bg-slate-100 uppercase tracking-wide text-slate-500">
                    <tr><th className="px-3 py-2">Supplier</th><th className="px-2 py-2">Transaction</th><th className="px-2 py-2">Date</th><th className="px-2 py-2 text-right">Age</th></tr>
                  </thead>
                  <tbody>
                    {bills.length ? bills.map((bill) => (
                      <tr
                        key={bill.id}
                        onClick={() => {
                          setSelectedSupplierId(String(bill.supplier_id));
                          setStatusFilter("all");
                          setWorkspaceTab("Suppliers");
                        }}
                        className="cursor-pointer border-t border-slate-200 hover:bg-slate-100"
                      >
                        <td className="truncate px-3 py-2 font-medium">{bill.supplier?.name || "Supplier"}</td>
                        <td className="px-2 py-2 capitalize">{bill.document_type}</td>
                        <td className="whitespace-nowrap px-2 py-2">{bill.bill_date}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{bill.age_days ?? "—"}d</td>
                      </tr>
                    )) : (
                      <tr><td colSpan="4" className="px-3 py-6 text-center text-slate-500">No supplier transactions recorded.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </aside>

          <section className="min-w-0 bg-white">
            {selectedSupplier ? (
              <>
                <div className="relative border-b border-slate-300 px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4 xl:pr-56">
                    <div className="min-w-0">
                      <h1 className="truncate border-b-2 border-slate-200 pb-2 text-3xl font-light text-slate-700 sm:text-4xl">
                        Supplier Information
                      </h1>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                        <dt className="text-right text-slate-500">Company Name</dt>
                        <dd className="font-medium">{selectedSupplier.company_name || selectedSupplier.name}</dd>
                        <dt className="text-right text-slate-500">Full Name</dt>
                        <dd>{selectedContact || "—"}</dd>
                        <dt className="text-right text-slate-500">Billed From</dt>
                        <dd className="whitespace-pre-line">{selectedSupplier.billed_from || selectedSupplier.address || "—"}</dd>
                      </dl>
                    </div>
                    <button
                      type="button"
                      onClick={editSelectedSupplier}
                      aria-label="Edit supplier"
                      title="Edit supplier"
                      className="shrink-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-lg hover:bg-slate-100"
                    >
                      ✎
                    </button>
                  </div>
                  <div className="absolute right-8 top-6 hidden min-w-48 xl:block">
                    <p className="border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reports for this supplier</p>
                    <button type="button" onClick={() => setDetailTab("Transactions")} className="mt-2 block text-sm text-blue-700 hover:underline">QuickReport</button>
                    <button type="button" onClick={() => setDetailTab("Transactions")} className="mt-1 block text-sm text-blue-700 hover:underline">Open Balance</button>
                  </div>
                </div>

                <div className="p-3 sm:p-5">
                  <div className="flex flex-wrap border-b border-slate-300">
                    {detailTabs.map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setDetailTab(tab)}
                        className={`border border-b-0 border-slate-300 px-4 py-2 text-sm ${
                          detailTab === tab
                            ? "rounded-t-md bg-white font-semibold text-slate-800"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {detailTab === "Contacts" ? (
                    <div className="overflow-x-auto rounded-b-md border border-t-0 border-slate-300">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th></tr>
                        </thead>
                        <tbody>
                          <tr className="border-t border-slate-200">
                            <td className="px-4 py-3">{selectedContact || "Primary contact"}</td>
                            <td className="px-4 py-3">{selectedSupplier.job_title || "—"}</td>
                            <td className="px-4 py-3">{selectedSupplier.main_email || selectedSupplier.email || "—"}</td>
                            <td className="px-4 py-3">{selectedSupplier.main_phone || selectedSupplier.phone || "—"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : detailTab === "Transactions" ? (
                    <div className="mt-3 overflow-x-auto rounded-md border border-slate-200">
                      <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            {["Type", "Num", "Date", "Due date", "Age (days)", `Amount (${selectedSupplier.currency || "GHS"})`, "Open balance", "Ledger account"].map((label) => (
                              <th key={label} className="border-b border-slate-200 px-3 py-2 font-medium">{label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {selectedBills.length ? selectedBills.map((bill) => (
                            <tr key={bill.id} className="border-b border-slate-100 align-top last:border-0">
                              <td className="px-3 py-3 capitalize">{bill.document_type}</td>
                              <td className="px-3 py-3">{bill.reference || "—"}</td>
                              <td className="whitespace-nowrap px-3 py-3">{bill.bill_date}</td>
                              <td className="whitespace-nowrap px-3 py-3">{bill.due_date || "—"}</td>
                              <td className="px-3 py-3 tabular-nums">{bill.age_days ?? "—"}</td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatMoney(bill.signed_amount, bill.currency || selectedSupplier.currency || "GHS")}</td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums">{formatMoney(bill.signed_amount, bill.currency || selectedSupplier.currency || "GHS")}</td>
                              <td className="min-w-64 px-3 py-2">
                                {bill.lines?.length ? (
                                  <div className="space-y-2">
                                    {bill.lines.map((line) => (
                                      <label key={line.id} className="block">
                                        <span className="sr-only">Ledger account for {bill.reference || bill.document_type}</span>
                                        <select
                                          value={line.ledger_account_id || ""}
                                          disabled={updatingLineId === line.id}
                                          onChange={(event) => updateLineAccount(bill.id, line.id, event.target.value)}
                                          className="w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                                        >
                                          <option value="" disabled>Select account</option>
                                          {expenseAccounts.map((account) => (
                                            <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
                                          ))}
                                        </select>
                                      </label>
                                    ))}
                                  </div>
                                ) : <span className="text-slate-400">No line account</span>}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan="8" className="px-4 py-12 text-center text-slate-500">No bills or credits have been recorded for this supplier.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-64 items-center justify-center rounded-b-md border border-t-0 border-slate-300 px-4 text-center text-sm text-slate-500">
                      {detailTab === "Notes"
                        ? "No notes have been added for this supplier."
                        : "No to-do items have been added for this supplier."}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" onClick={() => setDetailTab("Transactions")} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Manage Transactions
                    </button>
                    <button type="button" onClick={() => setDetailTab("Transactions")} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Run Reports
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
                <h1 className="text-2xl font-semibold text-slate-800">{loading ? "Loading supplier center…" : "No supplier selected"}</h1>
                {!loading && <p className="mt-2 text-sm text-slate-500">Create a supplier or adjust the status and search filters.</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default SuppliersCenter;
