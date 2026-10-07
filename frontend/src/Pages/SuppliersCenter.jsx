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
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [workspaceTab, setWorkspaceTab] = useState("Suppliers");
  const [detailTab, setDetailTab] = useState("Transactions");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadSuppliers = async () => {
      const response = await fetch(getApiUrl("/api/suppliers?includeInactive=true"), {
        credentials: "include",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load suppliers");
      setSuppliers(result.suppliers || []);
    };

    loadSuppliers()
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

  const editSelectedSupplier = () => {
    if (!selectedSupplier) return;
    navigate("/suppliers", { state: { supplier: selectedSupplier } });
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
          <button type="button" onClick={() => setWorkspaceTab("Transactions")} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-100">
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
                        <td title="Balance is unavailable until bills and payments are persisted" className="px-2 py-2 text-right tabular-nums">{formatMoney(null, supplier.currency || "GHS")}</td>
                      </tr>
                    );
                  }) : (
                    <tr><td colSpan="3" className="px-3 py-6 text-center text-slate-500">No suppliers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            </> : (
              <div className="p-5 text-sm text-slate-500">
                Supplier transactions are not available here until bills and payments are persisted.
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
                      <div className="grid min-w-[700px] grid-cols-[repeat(7,minmax(100px,1fr))] bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                        {["Type", "Num", "Date", "Due date", "Ageing", `Amount (${selectedSupplier.currency || "GHS"})`, "Open balance"].map((label) => (
                          <span key={label} className="border-r border-slate-200 px-3 py-2">{label}</span>
                        ))}
                      </div>
                      <div className="flex min-h-64 items-center justify-center bg-white px-4 text-center text-sm text-slate-500">
                        Supplier transaction history will appear here when bills and payments are persisted.
                      </div>
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
