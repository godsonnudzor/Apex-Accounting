import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const initialForm = { code: "", name: "" };

const IncomeAccount = () => {
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const loadIncomeAccounts = async () => {
      const response = await fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || "Unable to load income accounts");
      setAccounts((result.accounts || []).filter((account) => account.account_type === "income"));
    };

    loadIncomeAccounts()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const updateForm = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const createIncomeAccount = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(getApiUrl("/api/ledger/accounts"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, accountType: "income" }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || "Unable to create income account");

      setAccounts((current) => [...current, result.account].sort((left, right) => left.code.localeCompare(right.code)));
      setForm(initialForm);
      setMessage("Income account created. It is now available on invoice lines.");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Create income account</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Add a revenue account for invoice lines. Invoices posted to these accounts appear in Profit &amp; Loss.
          </p>
        </header>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {message && <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700" role="status">{message}</p>}

        <form onSubmit={createIncomeAccount} className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-900">New revenue account</h2>
          <div className="grid gap-4 md:grid-cols-[180px_1fr_auto] md:items-end">
            <label className="text-sm font-medium text-slate-700">
              Account code
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                name="code"
                value={form.code}
                onChange={updateForm}
                placeholder="4000"
                maxLength={30}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Account name
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                name="name"
                value={form.name}
                onChange={updateForm}
                placeholder="Sales revenue"
                maxLength={150}
                required
              />
            </label>
            <button
              className="rounded bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Creating..." : "Create income account"}
            </button>
          </div>
          <p className="mt-3 text-xs text-slate-500">Account type is set to Income and cannot be changed on this form.</p>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold text-slate-900">Income accounts</h2>
              <p className="mt-1 text-sm text-slate-500">Accounts available for invoice line posting.</p>
            </div>
            <Link className="text-sm font-medium text-teal-700 hover:text-teal-900" to="/chart-of-accounts">
              Open chart of accounts
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Code</th>
                  <th className="px-5 py-3">Account name</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">Loading income accounts...</td></tr>
                ) : accounts.length ? accounts.map((account) => (
                  <tr key={account.id} className="border-t border-slate-100">
                    <td className="px-5 py-3 font-semibold text-slate-900">{account.code}</td>
                    <td className="px-5 py-3">{account.name}</td>
                    <td className="px-5 py-3 capitalize text-slate-600">{account.account_type}</td>
                    <td className="px-5 py-3 text-right tabular-nums">GHC {Number(account.balance || 0).toFixed(2)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="px-5 py-8 text-center text-slate-500">No income accounts yet. Create one above before saving an invoice.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default IncomeAccount;