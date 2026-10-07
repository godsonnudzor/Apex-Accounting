import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const workspaceTabs = ["Customers & Jobs", "Transactions"];
const detailTabs = ["Transactions", "Contacts", "To Do's", "Notes"];

const formatMoney = (amount, currency = "GHS") => `${currency} ${Number(amount || 0).toLocaleString(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const CustomersCenter = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [workspaceTab, setWorkspaceTab] = useState("Customers & Jobs");
  const [detailTab, setDetailTab] = useState("Transactions");
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const [customerResponse, invoiceResponse] = await Promise.all([
        fetch(getApiUrl("/api/customers?includeInactive=true"), { credentials: "include" }),
        fetch(getApiUrl("/api/customer-invoices"), { credentials: "include" }),
      ]);
      const [customerResult, invoiceResult] = await Promise.all([
        readApiResponse(customerResponse),
        readApiResponse(invoiceResponse),
      ]);
      if (!customerResponse.ok) throw new Error(customerResult.message || "Unable to load customers");
      if (!invoiceResponse.ok) throw new Error(invoiceResult.message || "Unable to load customer transactions");
      setCustomers(customerResult.customers || []);
      setInvoices(invoiceResult.invoices || []);
    };
    loadData().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  const visibleCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return customers.filter((customer) => {
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "active" ? customer.is_active : !customer.is_active);
      const matchesSearch = !query || [
        customer.name, customer.company_name, customer.main_email, customer.email,
        customer.main_phone, customer.phone,
      ].some((value) => String(value || "").toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [customers, search, statusFilter]);

  const selectedCustomer = visibleCustomers.find(
    (customer) => String(customer.id) === String(selectedCustomerId),
  ) || visibleCustomers[0] || null;
  const customerInvoices = useMemo(
    () => invoices.filter((invoice) => String(invoice.customer_id) === String(selectedCustomer?.id)),
    [invoices, selectedCustomer?.id],
  );
  const selectedInvoices = customerInvoices.filter((invoice) => {
    const matchesStatus = transactionFilter === "all"
      || (transactionFilter === "open" ? Number(invoice.open_balance) > 0 : invoice.status === transactionFilter);
    const invoiceYear = new Date(`${invoice.invoice_date}T00:00:00Z`).getUTCFullYear();
    const currentYear = new Date().getUTCFullYear();
    const matchesDate = dateFilter === "all"
      || (dateFilter === "this-year" ? invoiceYear === currentYear : invoiceYear === currentYear - 1);
    return matchesStatus && matchesDate;
  });
  const balance = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.open_balance || 0), 0);

  const editCustomer = () => {
    if (selectedCustomer) navigate("/customers", { state: { customer: selectedCustomer } });
  };

  const startInvoice = () => {
    if (selectedCustomer) navigate("/invoices", { state: { customerId: selectedCustomer.id } });
  };

  const exportCustomers = () => {
    const columns = ["name", "currency", "email", "phone", "is_active"];
    const escapeCsv = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = visibleCustomers.map((customer) => [
      customer.name,
      customer.currency || "GHS",
      customer.main_email || customer.email,
      customer.main_phone || customer.phone,
      customer.is_active ? "Active" : "Inactive",
    ]);
    const csv = [columns, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "customers.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const fullName = selectedCustomer
    ? [selectedCustomer.salutation, selectedCustomer.first_name, selectedCustomer.middle_name, selectedCustomer.last_name]
      .filter(Boolean).join(" ")
    : "";

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-800 sm:p-5">
      <div className="mx-auto max-w-[1600px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2">
          <Link to="/customers" className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-800">+ New Customer</Link>
          <button type="button" onClick={startInvoice} disabled={!selectedCustomer} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50">New Transaction</button>
          <button type="button" onClick={() => window.print()} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">Print</button>
          <button type="button" onClick={exportCustomers} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">Export CSV</button>
        </header>
        {error && <p className="m-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}

        <div className="grid min-h-[calc(100vh-170px)] lg:grid-cols-[330px_minmax(0,1fr)]">
          <aside className="border-b border-slate-300 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="flex border-b border-slate-300">
              {workspaceTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setWorkspaceTab(tab)}
                  className={`border-r border-slate-300 px-3 py-2 text-sm font-semibold ${workspaceTab === tab ? "bg-white text-slate-900" : "bg-slate-200 text-slate-600"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="space-y-2 border-b border-slate-300 p-3">
              {workspaceTab === "Customers & Jobs" ? (
                <>
                  <select aria-label="Customer status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm">
                    <option value="active">Active Customers</option>
                    <option value="inactive">Inactive Customers</option>
                    <option value="all">All Customers</option>
                  </select>
                  <input type="search" aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm" />
                </>
              ) : (
                <p className="text-sm text-slate-600">Invoices recorded for all customers.</p>
              )}
            </div>
            {workspaceTab === "Customers & Jobs" ? (
              <div className="max-h-[70vh] overflow-auto">
                <table className="w-full min-w-[440px] text-left text-xs">
                  <thead className="sticky top-0 bg-slate-100 uppercase tracking-wide text-slate-500">
                    <tr><th className="w-[55%] px-3 py-2">Name</th><th className="px-2 py-2">Currency</th><th className="px-2 py-2 text-right">Balance total</th></tr>
                  </thead>
                  <tbody>
                    {loading ? <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-500">Loading customers…</td></tr>
                      : visibleCustomers.length ? visibleCustomers.map((customer) => {
                        const customerBalance = invoices
                          .filter((invoice) => String(invoice.customer_id) === String(customer.id))
                          .reduce((sum, invoice) => sum + Number(invoice.open_balance || 0), 0);
                        return (
                          <tr key={customer.id} onClick={() => setSelectedCustomerId(String(customer.id))} onDoubleClick={() => navigate("/customers", { state: { customer } })} className={`cursor-pointer border-t border-slate-200 ${String(customer.id) === String(selectedCustomer?.id) ? "bg-emerald-100" : "hover:bg-slate-100"}`}>
                            <td className="truncate px-3 py-2 font-medium" title={customer.name}>{customer.name}</td>
                            <td className="px-2 py-2">{customer.currency || "GHS"}</td>
                            <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">{formatMoney(customerBalance, customer.currency || "GHS")}</td>
                          </tr>
                        );
                      }) : <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-500">No customers found.</td></tr>}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-auto">
                {invoices.length ? invoices.map((invoice) => (
                  <button key={invoice.id} type="button" onClick={() => { setSelectedCustomerId(String(invoice.customer_id)); setStatusFilter("all"); setWorkspaceTab("Customers & Jobs"); }} className="block w-full border-b border-slate-200 px-3 py-2 text-left text-xs hover:bg-slate-100">
                    <span className="block truncate font-semibold">{invoice.customer?.name || "Customer"} · Invoice {invoice.invoice_number}</span>
                    <span className="text-slate-500">{invoice.invoice_date} · {formatMoney(invoice.total_amount, invoice.currency)}</span>
                  </button>
                )) : <p className="p-4 text-sm text-slate-500">No customer transactions recorded.</p>}
              </div>
            )}
          </aside>

          <section className="min-w-0 bg-white">
            {selectedCustomer ? (
              <>
                <div className="relative border-b border-slate-300 px-5 py-5 sm:px-7">
                  <div className="flex items-start justify-between gap-4 xl:pr-56">
                    <div className="min-w-0">
                      <h1 className="truncate border-b-2 border-slate-200 pb-2 text-3xl font-light text-slate-700 sm:text-4xl">Customer Information</h1>
                      <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-[130px_minmax(0,1fr)]">
                        <dt className="text-right text-slate-500">Company Name</dt><dd className="font-medium">{selectedCustomer.company_name || selectedCustomer.name}</dd>
                        <dt className="text-right text-slate-500">Full Name</dt><dd>{fullName || "—"}</dd>
                        <dt className="text-right text-slate-500">Bill To</dt><dd className="whitespace-pre-line">{selectedCustomer.invoice_address || selectedCustomer.address || selectedCustomer.name}</dd>
                      </dl>
                    </div>
                    <button type="button" onClick={editCustomer} aria-label="Edit customer" title="Edit customer" className="shrink-0 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-lg hover:bg-slate-100">✎</button>
                  </div>
                  <div className="absolute right-8 top-6 hidden min-w-48 xl:block">
                    <p className="border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reports for this customer</p>
                    <button type="button" onClick={() => { setDetailTab("Transactions"); setTransactionFilter("all"); }} className="mt-2 block text-sm text-blue-700 hover:underline">QuickReport</button>
                    <button type="button" onClick={() => { setDetailTab("Transactions"); setTransactionFilter("open"); }} className="mt-1 block text-sm text-blue-700 hover:underline">Open Balance · {formatMoney(balance, selectedCustomer.currency || "GHS")}</button>
                    <button type="button" onClick={() => { setDetailTab("Transactions"); setTransactionFilter("draft"); }} className="mt-1 block text-sm text-blue-700 hover:underline">Show Estimates</button>
                  </div>
                </div>

                <div className="p-3 sm:p-5">
                  <div className="flex flex-wrap border-b border-slate-300">
                    {detailTabs.map((tab) => (
                      <button key={tab} type="button" onClick={() => setDetailTab(tab)} className={`border border-b-0 border-slate-300 px-4 py-2 text-sm ${detailTab === tab ? "rounded-t-md bg-white font-semibold text-slate-800" : "bg-slate-100 text-slate-600 hover:bg-slate-50"}`}>{tab}</button>
                    ))}
                  </div>
                  {detailTab === "Transactions" ? (
                    <>
                      <div className="flex flex-wrap items-center gap-3 border-x border-slate-200 bg-slate-50 p-2 text-xs">
                        <span>Show: All Permitted Transactions</span>
                        <label>Filter by <select value={transactionFilter} onChange={(event) => setTransactionFilter(event.target.value)} className="ml-1 rounded border border-slate-300 bg-white px-2 py-1"><option value="all">All</option><option value="open">Open balance</option><option value="paid">Paid</option><option value="draft">Estimates</option><option value="void">Void</option></select></label>
                        <label>Date <select value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="ml-1 rounded border border-slate-300 bg-white px-2 py-1"><option value="all">All</option><option value="this-year">This year</option><option value="last-year">Last year</option></select></label>
                      </div>
                      <div className="overflow-x-auto rounded-b-md border border-slate-200">
                        <table className="w-full min-w-[780px] text-left text-sm">
                          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Num</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Account</th><th className="px-3 py-2 text-right">Amount ({selectedCustomer.currency || "GHS"})</th><th className="px-3 py-2 text-right">Open balance</th></tr></thead>
                          <tbody>
                            {selectedInvoices.length ? selectedInvoices.map((invoice, index) => (
                              <tr key={invoice.id} className={`border-t border-slate-100 ${index % 2 ? "bg-blue-50" : ""}`}>
                                <td className="px-3 py-2">Invoice</td>
                                <td className="px-3 py-2">{invoice.invoice_number}</td>
                                <td className="whitespace-nowrap px-3 py-2">{invoice.invoice_date}</td>
                                <td className="px-3 py-2">{invoice.receivable_account ? `${invoice.receivable_account.code} - ${invoice.receivable_account.name}` : "Accounts Receivable"}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(invoice.total_amount, invoice.currency || selectedCustomer.currency || "GHS")}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(invoice.open_balance, invoice.currency || selectedCustomer.currency || "GHS")}</td>
                              </tr>
                            )) : <tr><td colSpan="6" className="px-4 py-12 text-center text-slate-500">No transactions match this customer and filter.</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : detailTab === "Contacts" ? (
                    <div className="overflow-x-auto rounded-b-md border border-t-0 border-slate-300">
                      <table className="w-full min-w-[560px] text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Job title</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th></tr></thead>
                        <tbody><tr className="border-t border-slate-200"><td className="px-4 py-3">{fullName || "Primary contact"}</td><td className="px-4 py-3">{selectedCustomer.job_title || "—"}</td><td className="px-4 py-3">{selectedCustomer.main_email || selectedCustomer.email || "—"}</td><td className="px-4 py-3">{selectedCustomer.main_phone || selectedCustomer.phone || "—"}</td></tr></tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="flex min-h-64 items-center justify-center rounded-b-md border border-t-0 border-slate-300 px-4 text-center text-sm text-slate-500">
                      {detailTab === "Notes" ? "No notes have been added for this customer." : "No to-do items have been added for this customer."}
                    </div>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <button type="button" onClick={startInvoice} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Manage Transactions</button>
                    <button type="button" onClick={() => { setDetailTab("Transactions"); setTransactionFilter("all"); }} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Run Reports</button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex min-h-96 flex-col items-center justify-center px-6 text-center">
                <h1 className="text-2xl font-semibold text-slate-800">{loading ? "Loading customer center…" : "No customer selected"}</h1>
                {!loading && <p className="mt-2 text-sm text-slate-500">Create a customer or adjust the status and search filters.</p>}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
};

export default CustomersCenter;
