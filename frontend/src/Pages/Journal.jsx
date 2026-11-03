import { useEffect, useState } from "react";
import { getApiUrl } from "../context/auth";

const blankLine = () => ({
  account: "",
  partySelection: "",
  debit: "",
  credit: "",
  memo: "",
});

const getLinePartyName = (line) =>
  line.supplier?.name ||
  line.customer?.name ||
  line.employee?.users?.name ||
  [line.employee?.first_name, line.employee?.last_name].filter(Boolean).join(" ");

const accountTypeLabels = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

const Journal = () => {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [parties, setParties] = useState({
    suppliers: [],
    employees: [],
    customers: [],
  });
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().slice(0, 10),
    reference: "",
    description: "",
  });
  const [lines, setLines] = useState([blankLine(), blankLine()]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadEntries = async () => {
    const response = await fetch(getApiUrl("/api/journal"), {
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Unable to load journal entries");
    }
    setEntries(result.entries || []);
  };

  const loadParties = async () => {
    const response = await fetch(getApiUrl("/api/journal/lookups"), {
      credentials: "include",
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.message || "Unable to load suppliers, employees, and customers");
    }
    setParties({
      suppliers: result.suppliers || [],
      employees: result.employees || [],
      customers: result.customers || [],
    });
  };

  useEffect(() => {
    Promise.all([
      loadEntries(),
      loadParties(),
      fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }).then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load ledger accounts");
        setAccounts(result.accounts || []);
      }),
    ]).catch((loadError) => setError(loadError.message));
  }, []);

  const updateForm = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const updateLine = (index, event) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index
          ? { ...line, [event.target.name]: event.target.value }
          : line,
      ),
    );
  };

  const totals = lines.reduce(
    (summary, line) => ({
      debit: summary.debit + Number(line.debit || 0),
      credit: summary.credit + Number(line.credit || 0),
    }),
    { debit: 0, credit: 0 },
  );

  const saveEntry = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const response = await fetch(getApiUrl("/api/journal"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lines: lines.map(({ partySelection, ...line }) => {
            const [partyType = "", partyId = ""] = partySelection.split(":");
            return { ...line, partyType, partyId: partyId || null };
          }),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Unable to save journal entry");
      }

      setMessage(`Journal entry ${result.entryId} posted.`);
      setLines([blankLine(), blankLine()]);
      setForm((current) => ({ ...current, reference: "", description: "" }));
      await loadEntries();
    } catch (saveError) {
      setError(saveError.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
            Accounting
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Journal</h1>
          <p className="mt-2 text-sm text-slate-500">
            Enter balanced accounting records and review posted transactions.
          </p>
        </div>
        {error && (
          <p
            className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700"
            role="alert"
          >
            {error}
          </p>
        )}
        {message && (
          <p
            className="mb-4 rounded bg-emerald-50 px-4 py-3 text-emerald-700"
            role="status"
          >
            {message}
          </p>
        )}
        <form
          onSubmit={saveEntry}
          className="mb-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-4 md:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Date
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                name="entryDate"
                value={form.entryDate}
                onChange={updateForm}
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Reference
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                name="reference"
                value={form.reference}
                onChange={updateForm}
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Description
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                name="description"
                value={form.description}
                onChange={updateForm}
                required
              />
            </label>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Account and party</th>
                  <th className="px-3 py-2">Debit</th>
                  <th className="px-3 py-2">Credit</th>
                  <th className="px-3 py-2">Memo</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={index}>
                    <td className="px-2 py-2">
                      <div className="space-y-2">
                        <select
                          className="w-full rounded border border-slate-300 px-3 py-2"
                          name="account"
                          value={line.account}
                          onChange={(event) => updateLine(index, event)}
                          required
                        >
                          <option value="">Select ledger account</option>
                          {Object.entries(accountTypeLabels).map(([type, label]) => {
                            const typeAccounts = accounts.filter(
                              (account) => account.account_type === type,
                            );
                            if (!typeAccounts.length) return null;
                            return (
                              <optgroup key={type} label={label}>
                                {typeAccounts.map((account) => (
                                  <option
                                    key={account.id}
                                    value={`${account.code} - ${account.name}`}
                                  >
                                    {account.code} - {account.name}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                        <select
                          className="w-full rounded border border-slate-300 px-3 py-2 text-slate-600"
                          name="partySelection"
                          value={line.partySelection}
                          onChange={(event) => updateLine(index, event)}
                          aria-label="Optional supplier, employee, or customer"
                        >
                          <option value="">No supplier, employee, or customer</option>
                          <optgroup label="Suppliers">
                            {parties.suppliers.map((supplier) => (
                              <option key={supplier.id} value={`supplier:${supplier.id}`}>
                                {supplier.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Employees">
                            {parties.employees.map((employee) => (
                              <option key={employee.id} value={`employee:${employee.id}`}>
                                {employee.name}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Customers">
                            {parties.customers.map((customer) => (
                              <option key={customer.id} value={`customer:${customer.id}`}>
                                {customer.name}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        name="debit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.debit}
                        onChange={(event) => updateLine(index, event)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        name="credit"
                        type="number"
                        min="0"
                        step="0.01"
                        value={line.credit}
                        onChange={(event) => updateLine(index, event)}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className="w-full rounded border border-slate-300 px-3 py-2"
                        name="memo"
                        value={line.memo}
                        onChange={(event) => updateLine(index, event)}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="text-red-600"
                        onClick={() =>
                          setLines((current) =>
                            current.filter(
                              (_, lineIndex) => lineIndex !== index,
                            ),
                          )
                        }
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              className="rounded border border-slate-300 px-3 py-2 text-sm"
              onClick={() => setLines((current) => [...current, blankLine()])}
            >
              Add line
            </button>
            <span
              className={
                Math.abs(totals.debit - totals.credit) < 0.005
                  ? "font-semibold text-emerald-700"
                  : "font-semibold text-red-600"
              }
            >
              Debit {totals.debit.toFixed(2)} | Credit{" "}
              {totals.credit.toFixed(2)}
            </span>
            <button
              className="rounded bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
              disabled={Math.abs(totals.debit - totals.credit) >= 0.005}
            >
              Post entry
            </button>
          </div>
        </form>
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Reference</th>
                <th className="px-4 py-3">Suppliers / Employees / Customers</th>
                <th className="px-4 py-3">Lines</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">{entry.entry_date}</td>
                  <td className="px-4 py-3 font-medium">{entry.description}</td>
                  <td className="px-4 py-3 capitalize">{entry.source}</td>
                  <td className="px-4 py-3">{entry.reference || "-"}</td>
                  <td className="px-4 py-3">
                    {[...new Set((entry.journal_lines || []).map(getLinePartyName).filter(Boolean))].join(", ") || "-"}
                  </td>
                  <td className="px-4 py-3">
                    {entry.journal_lines?.length || 0}
                  </td>
                </tr>
              ))}
              {!entries.length && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No journal entries found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
};

export default Journal;
