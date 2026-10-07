import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getApiUrl } from "../context/auth";

const tabs = [
  { id: "address", label: "Address Info" },
  { id: "payment", label: "Payment Settings" },
  { id: "vat", label: "VAT Settings" },
  { id: "accounts", label: "Account Settings" },
  { id: "additional", label: "Additional Info" },
];

const initialForm = {
  supplierName: "",
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
  billedFrom: "",
  shippedFrom: "",
  currency: "GHS",
  accountNumber: "",
  creditLimit: "",
  paymentTerms: "",
  printNameOnCheque: "",
  billingRateLevel: "",
  bankAccountName: "",
  bankSortCode: "",
  bankAccountNumber: "",
  vatRegistrationNumber: "",
  expenseAccount1Id: "",
  expenseAccount2Id: "",
  expenseAccount3Id: "",
  supplierType: "",
  customFields: {},
  isActive: true,
};

const inputClassName = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100";
const sectionClassName = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6";

const Field = ({ label, children, className = "" }) => (
  <label className={`block text-sm font-medium text-slate-700 ${className}`}>
    {label}
    {children}
  </label>
);

const TextInput = ({ className = "", ...props }) => (
  <input className={`${inputClassName} ${className}`} {...props} />
);

const SelectInput = ({ children, className = "", ...props }) => (
  <select className={`${inputClassName} ${className}`} {...props}>
    {children}
  </select>
);

const toForm = (supplier) => ({
  ...initialForm,
  supplierName: supplier.name || "",
  companyName: supplier.company_name || "",
  salutation: supplier.salutation || "",
  firstName: supplier.first_name || "",
  middleName: supplier.middle_name || "",
  lastName: supplier.last_name || "",
  jobTitle: supplier.job_title || "",
  mainPhone: supplier.main_phone || supplier.phone || "",
  workPhone: supplier.work_phone || "",
  mobilePhone: supplier.mobile_phone || "",
  fax: supplier.fax || "",
  mainEmail: supplier.main_email || supplier.email || "",
  ccEmail: supplier.cc_email || "",
  website: supplier.website || "",
  otherEmail: supplier.other_email || "",
  billedFrom: supplier.billed_from || supplier.address || "",
  shippedFrom: supplier.shipped_from || "",
  currency: supplier.currency || "GHS",
  accountNumber: supplier.account_number || "",
  creditLimit: supplier.credit_limit == null ? "" : String(supplier.credit_limit),
  paymentTerms: supplier.payment_terms || "",
  printNameOnCheque: supplier.print_name_on_cheque || "",
  billingRateLevel: supplier.billing_rate_level || "",
  bankAccountName: supplier.bank_account_name || "",
  bankSortCode: supplier.bank_sort_code || "",
  bankAccountNumber: supplier.bank_account_number || "",
  vatRegistrationNumber: supplier.vat_registration_number || "",
  expenseAccount1Id: supplier.expense_account_1_id == null ? "" : String(supplier.expense_account_1_id),
  expenseAccount2Id: supplier.expense_account_2_id == null ? "" : String(supplier.expense_account_2_id),
  expenseAccount3Id: supplier.expense_account_3_id == null ? "" : String(supplier.expense_account_3_id),
  supplierType: supplier.supplier_type || "",
  customFields: supplier.custom_fields && typeof supplier.custom_fields === "object" ? supplier.custom_fields : {},
  isActive: supplier.is_active !== false,
});

const Suppliers = () => {
  const location = useLocation();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [activeTab, setActiveTab] = useState("address");
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const accountResponse = await fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" });
      const accountResult = await accountResponse.json();
      if (!accountResponse.ok) throw new Error(accountResult.message || "Unable to load ledger accounts");
      setAccounts(accountResult.accounts || []);
    };

    loadData()
      .catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!location.state?.supplier) return;
    const supplier = location.state.supplier;
    setForm(toForm(supplier));
    setEditingId(supplier.id);
    setError("");
    setMessage("");
  }, [location.state]);

  const expenseAccounts = useMemo(
    () => accounts.filter((account) => account.account_type === "expense"),
    [accounts],
  );

  const updateField = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
  };

  const updateCustomField = (oldName, property, value) => {
    const nextName = value.trim();
    if (property === "name" && nextName && nextName !== oldName && Object.prototype.hasOwnProperty.call(form.customFields, nextName)) {
      setError("Custom field names must be unique.");
      return;
    }
    setForm((current) => {
      const entries = Object.entries(current.customFields);
      const updated = entries.map(([name, fieldValue]) => (
        name === oldName ? [property === "name" ? nextName : name, property === "value" ? value : fieldValue] : [name, fieldValue]
      ));
      return { ...current, customFields: Object.fromEntries(updated) };
    });
  };

  const addCustomField = () => {
    const customFields = { ...form.customFields };
    let name = "New field";
    let suffix = 2;
    while (Object.prototype.hasOwnProperty.call(customFields, name)) {
      name = `New field ${suffix}`;
      suffix += 1;
    }
    setForm((current) => ({ ...current, customFields: { ...current.customFields, [name]: "" } }));
  };

  const removeCustomField = (name) => {
    setForm((current) => {
      const customFields = { ...current.customFields };
      delete customFields[name];
      return { ...current, customFields };
    });
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setActiveTab("address");
  };

  const saveSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const displayName = form.supplierName.trim()
      || form.companyName.trim()
      || [form.firstName, form.middleName, form.lastName].filter(Boolean).join(" ");

    try {
      const response = await fetch(getApiUrl(editingId ? `/api/suppliers/${editingId}` : "/api/suppliers"), {
        method: editingId ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, supplierName: displayName }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to save supplier");

      resetForm();
      setMessage(editingId ? "Supplier updated successfully." : "Supplier created successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const copyBilledAddress = () => {
    setForm((current) => ({ ...current, shippedFrom: current.billedFrom }));
  };

  const clearPrefilledAccounts = () => {
    setForm((current) => ({
      ...current,
      expenseAccount1Id: "",
      expenseAccount2Id: "",
      expenseAccount3Id: "",
    }));
  };

  const renderTab = () => {
    if (activeTab === "payment") {
      return (
        <section className={sectionClassName} aria-labelledby="payment-settings-heading">
          <h2 id="payment-settings-heading" className="mb-5 text-lg font-semibold text-slate-900">Payment settings</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Account no."><TextInput name="accountNumber" value={form.accountNumber} onChange={updateField} /></Field>
            <Field label="Credit limit"><TextInput name="creditLimit" type="number" min="0" step="0.01" value={form.creditLimit} onChange={updateField} placeholder="0.00" /></Field>
            <Field label="Payment terms">
              <SelectInput name="paymentTerms" value={form.paymentTerms} onChange={updateField}>
                <option value="">Select payment terms</option>
                {["Due on receipt", "Net 15", "Net 30", "Net 45"].map((term) => <option key={term}>{term}</option>)}
              </SelectInput>
            </Field>
            <Field label="Billing rate level"><TextInput name="billingRateLevel" value={form.billingRateLevel} onChange={updateField} placeholder="Optional rate level" /></Field>
            <Field label="Print name on cheque as"><TextInput name="printNameOnCheque" value={form.printNameOnCheque} onChange={updateField} /></Field>
          </div>

          <fieldset className="mt-7 rounded-lg border border-slate-200 p-4">
            <legend className="px-2 text-sm font-semibold text-slate-800">Bank details / BACS info</legend>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Account name"><TextInput name="bankAccountName" value={form.bankAccountName} onChange={updateField} /></Field>
              <Field label="Sort code"><TextInput name="bankSortCode" value={form.bankSortCode} onChange={updateField} /></Field>
              <Field label="Account number"><TextInput name="bankAccountNumber" value={form.bankAccountNumber} onChange={updateField} /></Field>
            </div>
          </fieldset>
        </section>
      );
    }

    if (activeTab === "vat") {
      return (
        <section className={sectionClassName} aria-labelledby="vat-settings-heading">
          <h2 id="vat-settings-heading" className="border-b border-slate-200 pb-3 text-base font-semibold uppercase tracking-wide text-slate-900">VAT information</h2>
          <div className="mt-6 max-w-lg">
            <Field label="VAT registration number"><TextInput name="vatRegistrationNumber" value={form.vatRegistrationNumber} onChange={updateField} /></Field>
          </div>
        </section>
      );
    }

    if (activeTab === "accounts") {
      return (
        <section className={sectionClassName} aria-labelledby="account-settings-heading">
          <h2 id="account-settings-heading" className="text-base font-semibold text-slate-900">Bill account prefills</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">Choose up to three expense accounts to prefill when you enter bills for this supplier.</p>
          <p className="mt-1 text-sm text-slate-500">Selecting an account here saves time later—for example, phone bills can default to Telephone utilities.</p>
          <div className="mt-5 grid max-w-xl gap-3">
            {[1, 2, 3].map((number) => {
              const fieldName = `expenseAccount${number}Id`;
              return (
                <Field key={fieldName} label={`Expense account ${number}`}>
                  <SelectInput name={fieldName} value={form[fieldName]} onChange={updateField}>
                    <option value="">No account selected</option>
                    {expenseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
                    ))}
                  </SelectInput>
                </Field>
              );
            })}
          </div>
          <button type="button" onClick={clearPrefilledAccounts} className="mt-4 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Clear all
          </button>
        </section>
      );
    }

    if (activeTab === "additional") {
      return (
        <section className={sectionClassName} aria-labelledby="additional-info-heading">
          <div className="grid gap-6 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <h2 id="additional-info-heading" className="sr-only">Additional information</h2>
              <Field label="Supplier type">
                <TextInput name="supplierType" value={form.supplierType} onChange={updateField} placeholder="e.g. Services, Goods" />
              </Field>
            </div>
            <fieldset className="min-h-64 rounded-lg border border-slate-200 p-4">
              <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-900">Custom fields</legend>
              <div className="space-y-3">
                {Object.entries(form.customFields).map(([name, value], index) => (
                  <div key={`${name}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(120px,1fr)_minmax(120px,1fr)_auto]">
                    <TextInput aria-label={`Custom field ${index + 1} name`} value={name} onChange={(event) => updateCustomField(name, "name", event.target.value)} placeholder="Field name" />
                    <TextInput aria-label={`Custom field ${index + 1} value`} value={value} onChange={(event) => updateCustomField(name, "value", event.target.value)} placeholder="Value" />
                    <button type="button" onClick={() => removeCustomField(name)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" aria-label={`Remove ${name || "custom field"}`}>
                      Remove
                    </button>
                  </div>
                ))}
                {!Object.keys(form.customFields).length && <p className="text-sm text-slate-500">No custom fields have been added.</p>}
              </div>
              <button type="button" onClick={addCustomField} className="mt-5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                Add custom field
              </button>
            </fieldset>
          </div>
        </section>
      );
    }

    return (
      <section className={sectionClassName} aria-labelledby="address-info-heading">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <Field label="Supplier name">
            <TextInput autoFocus name="supplierName" value={form.supplierName} onChange={updateField} required placeholder="Company or supplier name" />
          </Field>
          <Field label="Currency">
            <SelectInput name="currency" value={form.currency} onChange={updateField}>
              <option value="GHS">Ghanaian Cedi (GHS)</option>
              <option value="USD">US Dollar (USD)</option>
              <option value="EUR">Euro (EUR)</option>
              <option value="GBP">Pound Sterling (GBP)</option>
            </SelectInput>
          </Field>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Company name"><TextInput name="companyName" value={form.companyName} onChange={updateField} /></Field>
          <Field label="Job title"><TextInput name="jobTitle" value={form.jobTitle} onChange={updateField} /></Field>
          <div className="grid grid-cols-[110px_1fr] gap-2 md:col-span-2 lg:grid-cols-[110px_1fr_90px_1fr]">
            <Field label="Title">
              <SelectInput name="salutation" value={form.salutation} onChange={updateField}>
                <option value="">Title</option>
                {["Mr.", "Ms.", "Mrs.", "Dr.", "Prof."].map((title) => <option key={title}>{title}</option>)}
              </SelectInput>
            </Field>
            <Field label="First name"><TextInput name="firstName" value={form.firstName} onChange={updateField} /></Field>
            <Field label="Middle name"><TextInput name="middleName" value={form.middleName} onChange={updateField} /></Field>
            <Field label="Last name"><TextInput name="lastName" value={form.lastName} onChange={updateField} /></Field>
          </div>
        </div>

        <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 md:grid-cols-2">
          <div className="space-y-4">
            <Field label="Main phone"><TextInput name="mainPhone" value={form.mainPhone} onChange={updateField} /></Field>
            <Field label="Work phone"><TextInput name="workPhone" value={form.workPhone} onChange={updateField} /></Field>
            <Field label="Mobile"><TextInput name="mobilePhone" value={form.mobilePhone} onChange={updateField} /></Field>
            <Field label="Fax"><TextInput name="fax" value={form.fax} onChange={updateField} /></Field>
          </div>
          <div className="space-y-4">
            <Field label="Main email"><TextInput name="mainEmail" type="email" value={form.mainEmail} onChange={updateField} /></Field>
            <Field label="CC email"><TextInput name="ccEmail" type="email" value={form.ccEmail} onChange={updateField} /></Field>
            <Field label="Website"><TextInput name="website" type="url" value={form.website} onChange={updateField} placeholder="https://" /></Field>
            <Field label="Other email"><TextInput name="otherEmail" type="email" value={form.otherEmail} onChange={updateField} /></Field>
          </div>
        </div>

        <fieldset className="mt-7 rounded-lg border border-slate-200 p-4">
          <legend className="px-2 text-sm font-semibold uppercase tracking-wide text-slate-800">Address details</legend>
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
            <Field label="Billed from">
              <textarea className={`${inputClassName} min-h-28 resize-y`} name="billedFrom" value={form.billedFrom} onChange={updateField} />
            </Field>
            <button type="button" onClick={copyBilledAddress} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Copy to shipping
            </button>
            <Field label="Shipped from">
              <textarea className={`${inputClassName} min-h-28 resize-y`} name="shippedFrom" value={form.shippedFrom} onChange={updateField} />
            </Field>
          </div>
        </fieldset>

        <label className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input type="checkbox" name="isActive" checked={form.isActive} onChange={updateField} className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
          Supplier is active
        </label>
        <h2 id="address-info-heading" className="sr-only">Address information</h2>
      </section>
    );
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Suppliers</h1>
            <p className="mt-2 text-sm text-slate-500">Manage supplier contact, payment, tax, and bill account details.</p>
            <Link to="/suppliersCenter" className="mt-2 inline-block text-sm font-semibold text-teal-700 hover:underline">Back to supplier center</Link>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current balance</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">Not calculated</p>
            <p className="text-xs text-slate-500">Not yet linked to posted bills.</p>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}

        <form onSubmit={saveSupplier} className="mb-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-slate-900">{editingId ? "Edit supplier" : "Add supplier"}</h2>
            <p className="mt-1 text-sm text-slate-500">Complete the supplier profile using the sections below.</p>
          </div>

          <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
            <div role="tablist" aria-label="Supplier details" className="flex gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 p-2 md:flex-col md:border-b-0 md:border-r md:p-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  id={`supplier-tab-${tab.id}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`supplier-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                    activeTab === tab.id
                      ? "bg-teal-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div id={`supplier-panel-${activeTab}`} role="tabpanel" aria-labelledby={`supplier-tab-${activeTab}`} className="min-w-0 p-4 sm:p-6">
              {renderTab()}
            </div>
          </div>

          <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:px-6">
            {editingId && <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">Cancel edit</button>}
            <button type="submit" disabled={saving} className="rounded-lg bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save changes" : "Create supplier"}
            </button>
          </div>
        </form>

      </div>
    </main>
  );
};

export default Suppliers;
