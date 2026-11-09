import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const accountTypes = ["asset", "liability", "equity", "income", "expense"];
const initialForm = { code: "", name: "", accountType: "asset", groupLedger: "" };

function LedgerAccountCreate() {
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadGroups = async () => {
      const response = await fetch(getApiUrl("/api/ledger/groups"), {
        credentials: "include",
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to load group ledgers");
      }
      if (active) setGroups(result.groups || []);
    };

    loadGroups()
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "groupLedger" && value
        ? {
            accountType:
              groups.find((group) => group.name === value)?.account_type ||
              current.accountType,
          }
        : {}),
    }));
    setError("");
    setMessage("");
  };

  const saveAccount = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(getApiUrl("/api/ledger/accounts"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to create ledger account");
      }
      setForm(initialForm);
      setMessage(`Created ${result.account.code} — ${result.account.name}.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedGroup = groups.find((group) => group.name === form.groupLedger);

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="border-b border-slate-200 px-5 py-4">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            File · Chart of Accounts
          </p>
          <h1 className="mt-1 text-2xl font-bold">Create ledger account</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create an individual account and optionally assign it to a group ledger.
          </p>
        </header>
        <form onSubmit={saveAccount} className="space-y-5 p-5">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {message ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {message}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Account code
              <input
                name="code"
                required
                maxLength={30}
                value={form.code}
                onChange={updateForm}
                placeholder="5700"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Account name
              <input
                name="name"
                required
                maxLength={150}
                value={form.name}
                onChange={updateForm}
                placeholder="Bank charges"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Account type
              <select
                name="accountType"
                value={form.accountType}
                onChange={updateForm}
                disabled={Boolean(selectedGroup)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-100"
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Group ledger
              <select
                name="groupLedger"
                value={form.groupLedger}
                onChange={updateForm}
                disabled={loading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">No group ledger</option>
                {groups.map((group) => (
                  <option key={group.name} value={group.name}>
                    {group.name} · {group.account_type}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {loading ? (
            <p className="text-sm text-slate-500">Loading group ledgers…</p>
          ) : null}
          <footer className="flex flex-wrap justify-between gap-3 border-t border-slate-200 pt-4">
            <Link
              to="/chart-of-accounts"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50"
            >
              View chart of accounts
            </Link>
            <button
              type="submit"
              disabled={saving || loading}
              className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create account"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default LedgerAccountCreate;
