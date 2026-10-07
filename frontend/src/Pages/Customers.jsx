import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const tabs = [
  { id: "address", label: "Address Info" },
  { id: "payment", label: "Payment Settings" },
  { id: "vat", label: "VAT Settings" },
  { id: "additional", label: "Additional Info" },
  { id: "job", label: "Job Info" },
];

const blankForm = {
  name: "",
  companyName: "",
  salutation: "",
  firstName: "",
  middleName: "",
  lastName: "",
  jobTitle: "",
  mainPhone: "",
  workPhone: "",
  mobilePhone: "",
  fax: "",
  mainEmail: "",
  ccEmail: "",
  website: "",
  otherEmail: "",
  invoiceAddress: "",
  shippingAddress: "",
  currency: "GHS",
  accountNumber: "",
  creditLimit: "",
  paymentTerms: "",
  priceLevel: "",
  preferredDeliveryMethod: "",
  preferredPaymentMethod: "",
  vatCode: "",
  vatRegistrationNumber: "",
  customerType: "",
  salesRep: "",
  customFields: {},
  jobDescription: "",
  jobType: "",
  jobStatus: "None",
  jobStartDate: "",
  projectedEndDate: "",
  jobEndDate: "",
  isActive: true,
};

const inputClassName = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const fields = {
  address: [
    ["name", "Customer name"], ["companyName", "Company name"], ["salutation", "Salutation"],
    ["firstName", "First name"], ["middleName", "M.I."], ["lastName", "Last name"],
    ["jobTitle", "Job title"], ["mainPhone", "Main phone"], ["workPhone", "Work phone"],
    ["mobilePhone", "Mobile"], ["fax", "Fax"], ["mainEmail", "Main email"],
    ["ccEmail", "CC email"], ["website", "Website"], ["otherEmail", "Other email"],
  ],
};

const textValue = (value) => value == null ? "" : String(value);

const fromCustomer = (customer) => ({
  ...blankForm,
  ...Object.fromEntries(Object.keys(blankForm).map((key) => [key, textValue(customer[key]) ])),
  name: customer.name || "",
  companyName: customer.company_name || "",
  salutation: customer.salutation || "",
  firstName: customer.first_name || "",
  middleName: customer.middle_name || "",
  lastName: customer.last_name || "",
  jobTitle: customer.job_title || "",
  mainPhone: customer.main_phone || customer.phone || "",
  workPhone: customer.work_phone || "",
  mobilePhone: customer.mobile_phone || "",
  fax: customer.fax || "",
  mainEmail: customer.main_email || customer.email || "",
  ccEmail: customer.cc_email || "",
  website: customer.website || "",
  otherEmail: customer.other_email || "",
  invoiceAddress: customer.invoice_address || customer.address || "",
  shippingAddress: customer.shipping_address || "",
  currency: customer.currency || "GHS",
  creditLimit: customer.credit_limit == null ? "" : String(customer.credit_limit),
  paymentTerms: customer.payment_terms || "",
  priceLevel: customer.price_level || "",
  preferredDeliveryMethod: customer.preferred_delivery_method || "",
  preferredPaymentMethod: customer.preferred_payment_method || "",
  vatCode: customer.vat_code || "",
  vatRegistrationNumber: customer.vat_registration_number || "",
  customerType: customer.customer_type || "",
  salesRep: customer.sales_rep || "",
  customFields: customer.custom_fields && typeof customer.custom_fields === "object" && !Array.isArray(customer.custom_fields)
    ? customer.custom_fields
    : {},
  jobDescription: customer.job_description || "",
  jobType: customer.job_type || "",
  jobStatus: customer.job_status || "None",
  jobStartDate: customer.job_start_date || "",
  projectedEndDate: customer.projected_end_date || "",
  jobEndDate: customer.job_end_date || "",
  isActive: customer.is_active !== false,
});

const Customers = () => {
  const location = useLocation();
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(blankForm);
  const [activeTab, setActiveTab] = useState("address");
  const [editingId, setEditingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadCustomers = async () => {
    const response = await fetch(getApiUrl("/api/customers?includeInactive=true"), { credentials: "include" });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || "Unable to load customers");
    setCustomers(result.customers || []);
  };

  useEffect(() => {
    loadCustomers().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
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

  const selectedCustomer = visibleCustomers.find((customer) => String(customer.id) === String(selectedId))
    || visibleCustomers[0]
    || null;

  useEffect(() => {
    const customer = location.state?.customer;
    if (!customer) return;
    setForm(fromCustomer(customer));
    setEditingId(customer.id);
    setSelectedId(customer.id);
    setMessage("");
  }, [location.state]);

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const startNewCustomer = () => {
    setForm(blankForm);
    setEditingId(null);
    setSelectedId(null);
    setActiveTab("address");
    setError("");
    setMessage("");
  };

  const selectCustomer = (customer) => {
    setForm(fromCustomer(customer));
    setEditingId(customer.id);
    setSelectedId(customer.id);
    setActiveTab("address");
    setError("");
    setMessage("");
  };

  const saveCustomer = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(getApiUrl(editingId ? `/api/customers/${editingId}` : "/api/customers"), {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || "Unable to save customer");
      const savedCustomer = result.customer;
      setCustomers((current) => editingId
        ? current.map((customer) => String(customer.id) === String(savedCustomer.id) ? savedCustomer : customer)
        : [savedCustomer, ...current]);
      setForm(fromCustomer(savedCustomer));
      setEditingId(savedCustomer.id);
      setSelectedId(savedCustomer.id);
      setMessage(editingId ? "Customer updated successfully." : "Customer created successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const addCustomField = () => {
    let name = "New field";
    let suffix = 2;
    while (Object.prototype.hasOwnProperty.call(form.customFields, name)) {
      name = `New field ${suffix}`;
      suffix += 1;
    }
    setForm((current) => ({ ...current, customFields: { ...current.customFields, [name]: "" } }));
  };

  const updateCustomField = (oldName, newName, value) => {
    const safeName = newName.trim();
    if (safeName !== oldName && safeName && Object.hasOwn(form.customFields, safeName)) {
      setError("Custom field names must be unique.");
      return;
    }
    setForm((current) => {
      const next = { ...current.customFields };
      delete next[oldName];
      next[safeName || oldName] = value;
      return { ...current, customFields: next };
    });
  };

  const renderInput = (name, label, type = (
    ["mainEmail", "ccEmail", "otherEmail"].includes(name) ? "email"
      : name === "website" ? "url"
        : name === "creditLimit" ? "number"
          : "text"
  )) => (
    <label key={name} className="block text-sm font-medium text-slate-700">
      {label}
      <input className={inputClassName} name={name} type={type} value={form[name]} onChange={updateField} required={name === "name"} min={name === "creditLimit" ? "0" : undefined} step={name === "creditLimit" ? "0.01" : undefined} />
    </label>
  );

  const renderSelect = (name, label, options) => (
    <label key={name} className="block text-sm font-medium text-slate-700">
      {label}
      <select className={inputClassName} name={name} value={form[name]} onChange={updateField}>
        <option value="">Select {label.toLowerCase()}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
  );

  const renderTab = () => {
    if (activeTab === "payment") {
      return (
        <section className="grid gap-6 border border-slate-200 p-5 md:grid-cols-2">
          {renderInput("accountNumber", "Account no.")}
          {renderInput("creditLimit", "Credit limit", "number")}
          {renderSelect("paymentTerms", "Payment terms", ["Due on receipt", "Net 15", "Net 30", "Net 45", "Net 60"])}
          {renderInput("priceLevel", "Price level")}
          {renderSelect("preferredDeliveryMethod", "Preferred delivery method", ["None", "Email", "Print", "Courier", "Pickup"])}
          {renderSelect("preferredPaymentMethod", "Preferred payment method", ["None", "Cash", "Bank transfer", "Cheque", "Card via secure provider"])}
          <p className="text-sm text-slate-500 md:col-span-2">
            For card payments, store only a provider token in a PCI-compliant payment service. Do not enter card numbers or security codes here.
          </p>
        </section>
      );
    }
    if (activeTab === "vat") {
      return (
        <section className="grid max-w-2xl gap-6 border border-slate-200 p-5">
          {renderInput("vatCode", "VAT code")}
          {renderInput("vatRegistrationNumber", "VAT registration number")}
        </section>
      );
    }
    if (activeTab === "additional") {
      return (
        <section className="grid gap-6 border border-slate-200 p-5 md:grid-cols-2">
          {renderInput("customerType", "Customer type")}
          {renderInput("salesRep", "Rep")}
          <div className="border border-slate-200 p-4 md:row-span-3">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Custom fields</h2>
              <button type="button" onClick={addCustomField} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">Add field</button>
            </div>
            {Object.entries(form.customFields).map(([name, value]) => (
              <div key={name} className="mb-2 grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-2">
                <input className={inputClassName} aria-label="Custom field name" value={name} onChange={(event) => updateCustomField(name, event.target.value, String(value ?? ""))} />
                <input className={inputClassName} aria-label={`Value for ${name}`} value={String(value ?? "")} onChange={(event) => updateCustomField(name, name, event.target.value)} />
                <button type="button" aria-label={`Remove ${name}`} onClick={() => setForm((current) => {
                  const customFields = { ...current.customFields };
                  delete customFields[name];
                  return { ...current, customFields };
                })} className="rounded border border-slate-300 px-2 hover:bg-slate-50">×</button>
              </div>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" name="isActive" checked={form.isActive} onChange={updateField} />
            Customer is active
          </label>
        </section>
      );
    }
    if (activeTab === "job") {
      return (
        <section className="grid max-w-3xl gap-5 border border-slate-200 p-5 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700 md:col-span-2">
            Job description
            <input className={inputClassName} name="jobDescription" value={form.jobDescription} onChange={updateField} />
          </label>
          {renderInput("jobType", "Job type")}
          {renderSelect("jobStatus", "Job status", ["None", "Pending", "In progress", "Completed", "On hold"])}
          {renderInput("jobStartDate", "Start date", "date")}
          {renderInput("projectedEndDate", "Projected end date", "date")}
          {renderInput("jobEndDate", "End date", "date")}
        </section>
      );
    }

    return (
      <section className="border border-slate-200 p-5">
        <div className="grid gap-4 md:grid-cols-3">
          {fields.address.map(([name, label]) => renderInput(name, label))}
        </div>
        <div className="mt-6 grid gap-5 border border-slate-200 p-4 md:grid-cols-2">
          <label className="block text-sm font-medium text-slate-700">
            Invoice/bill to
            <textarea className={`${inputClassName} min-h-28`} name="invoiceAddress" value={form.invoiceAddress} onChange={updateField} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Ship to
            <textarea className={`${inputClassName} min-h-28`} name="shippingAddress" value={form.shippingAddress} onChange={updateField} />
          </label>
          <button type="button" onClick={() => setForm((current) => ({ ...current, shippingAddress: current.invoiceAddress }))} className="w-fit rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
            Copy invoice address to shipping
          </button>
          {renderSelect("currency", "Currency", ["GHS", "USD", "EUR", "GBP"])}
        </div>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 p-3 text-slate-800 sm:p-5">
      <div className="mx-auto max-w-[1500px] overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
        <header className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2">
          <button type="button" onClick={startNewCustomer} className="rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white hover:bg-teal-800">+ New Customer</button>
          <button type="submit" form="customer-profile-form" disabled={saving} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-100 disabled:opacity-50">{saving ? "Saving…" : editingId ? "Save Changes" : "Save Customer"}</button>
          <Link to="/invoices" className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium no-underline hover:bg-slate-100">Invoices</Link>
        </header>

        {error && <p className="m-4 rounded bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="m-4 rounded bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}

        <div className="grid min-h-[calc(100vh-150px)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="border-b border-slate-300 bg-slate-50 lg:border-b-0 lg:border-r">
            <div className="space-y-2 border-b border-slate-300 p-3">
              <select aria-label="Customer status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClassName}>
                <option value="active">Active customers</option>
                <option value="inactive">Inactive customers</option>
                <option value="all">All customers</option>
              </select>
              <input type="search" aria-label="Search customers" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers" className={inputClassName} />
            </div>
            <div className="max-h-[70vh] overflow-auto">
              {loading ? <p className="p-5 text-sm text-slate-500">Loading customers…</p> : visibleCustomers.length ? visibleCustomers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => selectCustomer(customer)}
                  className={`block w-full border-b border-slate-200 px-4 py-3 text-left hover:bg-slate-100 ${String(customer.id) === String(selectedCustomer?.id) ? "bg-emerald-100" : ""}`}
                >
                  <span className="block truncate text-sm font-semibold">{customer.name}</span>
                  <span className="block truncate text-xs text-slate-500">{customer.main_email || customer.email || "No email"}</span>
                </button>
              )) : <p className="p-5 text-sm text-slate-500">No customers found.</p>}
            </div>
          </aside>

          <section className="min-w-0 p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer name</p>
                <h1 className="text-2xl font-semibold text-slate-800">{editingId ? form.name : "New customer"}</h1>
                {editingId && <p className="mt-1 text-sm text-slate-500">Current balance is calculated from posted customer transactions.</p>}
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">Currency
                <span className="font-semibold">{form.currency || "GHS"}</span>
              </label>
            </div>

            <form id="customer-profile-form" onSubmit={saveCustomer}>
              <div className="grid gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                <nav aria-label="Customer profile sections" className="flex gap-1 overflow-x-auto sm:flex-col">
                  {tabs.map((tab) => (
                    <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`shrink-0 rounded px-3 py-2 text-left text-sm font-medium sm:rounded-r-none ${activeTab === tab.id ? "bg-white text-teal-800 ring-1 ring-slate-200 sm:border-l-4 sm:border-teal-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>
                      {tab.label}
                    </button>
                  ))}
                </nav>
                <div className="min-w-0">
                  <div className="mb-3 flex items-center justify-between border-b border-slate-200 pb-2">
                    <h2 className="font-semibold text-slate-800">{tabs.find((tab) => tab.id === activeTab)?.label}</h2>
                    <button type="submit" disabled={saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Saving…" : "OK"}</button>
                  </div>
                  {renderTab()}
                </div>
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" onClick={startNewCustomer} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Cancel</button>
                <button type="submit" disabled={saving} className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50">{saving ? "Saving…" : "Save"}</button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
};

export default Customers;
