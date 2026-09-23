import { useEffect, useState } from "react";
import { getApiUrl } from "../context/auth";

const initialForm = { name: "", email: "", phone: "", address: "" };

const Suppliers = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadSuppliers = async () => {
    const response = await fetch(getApiUrl("/api/suppliers"), { credentials: "include" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Unable to load suppliers");
    setSuppliers(result.suppliers || []);
  };

  useEffect(() => {
    loadSuppliers().catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, []);

  const updateField = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const saveSupplier = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(getApiUrl("/api/suppliers"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to create supplier");
      setSuppliers((current) => [result.supplier, ...current]);
      setForm(initialForm);
      setMessage("Supplier created successfully.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Suppliers</h1>
          <p className="mt-2 text-sm text-slate-500">Create and manage suppliers available for payment records.</p>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}

        <form onSubmit={saveSupplier} className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">Add supplier</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">Supplier name<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="name" value={form.name} onChange={updateField} required /></label>
            <label className="text-sm font-medium text-slate-700">Email<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="email" name="email" value={form.email} onChange={updateField} /></label>
            <label className="text-sm font-medium text-slate-700">Phone<input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="phone" value={form.phone} onChange={updateField} /></label>
            <label className="text-sm font-medium text-slate-700">Address<textarea className="mt-1 w-full rounded border border-slate-300 px-3 py-2" name="address" value={form.address} onChange={updateField} rows="2" /></label>
          </div>
          <button className="mt-5 rounded bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50" disabled={saving}>{saving ? "Saving..." : "Create supplier"}</button>
        </form>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Phone</th><th className="px-4 py-3">Address</th></tr></thead>
            <tbody>{loading ? <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">Loading suppliers...</td></tr> : suppliers.length ? suppliers.map((supplier) => <tr key={supplier.id} className="border-t border-slate-100"><td className="px-4 py-3 font-semibold text-slate-900">{supplier.name}</td><td className="px-4 py-3">{supplier.email || "-"}</td><td className="px-4 py-3">{supplier.phone || "-"}</td><td className="px-4 py-3">{supplier.address || "-"}</td></tr>) : <tr><td colSpan="4" className="px-4 py-8 text-center text-slate-500">No suppliers found.</td></tr>}</tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Suppliers;
