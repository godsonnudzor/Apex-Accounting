import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const accountTypes = ["asset", "liability", "equity", "income", "expense"];

function GroupAccount() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [accountType, setAccountType] = useState("asset");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadGroups = async () => {
    const response = await fetch(getApiUrl("/api/ledger/groups"), {
      credentials: "include",
    });
    const result = await readApiResponse(response);
    if (!response.ok) {
      throw new Error(result.message || "Unable to load group ledgers");
    }
    setGroups(result.groups || []);
  };

  useEffect(() => {
    loadGroups()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const createGroup = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch(getApiUrl("/api/ledger/groups"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, accountType }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to create group ledger");
      }
      setGroups((current) =>
        [...current, result.group].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setName("");
      setMessage(`Group ledger "${result.group.name}" created.`);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
            File · Chart of Accounts
          </p>
          <h1 className="mt-1 text-2xl font-bold">Group ledgers</h1>
          <p className="mt-1 text-sm text-slate-500">
            Create reporting groups separately, then assign accounts to them during account creation.
          </p>
        </header>

        <form
          onSubmit={createGroup}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <h2 className="text-lg font-semibold">Create group ledger</h2>
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
          <div className="grid gap-4 sm:grid-cols-[1fr_220px_auto] sm:items-end">
            <label className="text-sm font-medium">
              Group name
              <input
                required
                maxLength={100}
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Current Assets"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Account type
              <select
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                {accountTypes.map((type) => (
                  <option key={type} value={type}>
                    {type[0].toUpperCase() + type.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? "Creating…" : "Create group"}
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-lg font-semibold">Existing group ledgers</h2>
              <p className="text-sm text-slate-500">
                Group names and their account types.
              </p>
            </div>
            <Link
              to="/ledger-accounts/new"
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50"
            >
              Create ledger account
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Group ledger</th>
                  <th className="px-5 py-3">Account type</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="2" className="px-5 py-8 text-center text-slate-500">
                      Loading group ledgers…
                    </td>
                  </tr>
                ) : groups.length ? (
                  groups.map((group) => (
                    <tr key={group.name} className="border-t border-slate-100">
                      <td className="px-5 py-3 font-medium">{group.name}</td>
                      <td className="px-5 py-3 capitalize">{group.account_type}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="px-5 py-8 text-center text-slate-500">
                      No group ledgers have been created.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

export default GroupAccount;
