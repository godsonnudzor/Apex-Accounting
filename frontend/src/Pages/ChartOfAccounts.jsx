import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";
import QuickReport from "../components/QuickReport";

const accountTypes = ["asset", "liability", "equity", "income", "expense"];
const formatMoney = (value) => `GHC ${Number(value || 0).toFixed(2)}`;
const initialGroupForm = { name: "", accountType: "asset" };

const ChartOfAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [groupLedgers, setGroupLedgers] = useState([]);
  const [groupForm, setGroupForm] = useState(initialGroupForm);
  const [parties, setParties] = useState({ suppliers: [], customers: [], employees: [] });
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partyError, setPartyError] = useState("");
  const [groupError, setGroupError] = useState("");
  const [groupMessage, setGroupMessage] = useState("");
  const [savingGroup, setSavingGroup] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerYear, setLedgerYear] = useState(String(new Date().getFullYear()));

  const loadAccounts = async () => {
    const response = await fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || "Unable to load chart of accounts");
    setAccounts(result.accounts || []);
    setGroupLedgers(result.groupLedgers || []);
  };

  const loadParties = async () => {
    const response = await fetch(getApiUrl("/api/journal/lookups"), { credentials: "include" });
    if (response.status === 404) {
      const sources = [
        ["suppliers", "/api/suppliers?includeInactive=true"],
        ["customers", "/api/customers?includeInactive=true"],
        ["employees", "/api/employees"],
      ];
      const results = await Promise.all(
        sources.map(async ([key, path]) => {
          const lookupResponse = await fetch(getApiUrl(path), { credentials: "include" });
          const lookupResult = await readApiResponse(lookupResponse);
          if (!lookupResponse.ok) {
            throw new Error(lookupResult.message || `Unable to load ${key}`);
          }
          if (!Array.isArray(lookupResult[key])) {
            throw new Error(`The API response is missing the ${key} list`);
          }
          return lookupResult[key];
        }),
      );
      const agingResponse = await fetch(getApiUrl("/api/reports/aging"), { credentials: "include" });
      const agingResult = await readApiResponse(agingResponse);
      if (!agingResponse.ok) {
        throw new Error(agingResult.message || "Unable to load supplier and customer balances");
      }
      const supplierBalances = new Map(
        (agingResult.suppliers || []).map((supplier) => [
          String(supplier.supplier_id),
          Number(supplier.total || 0),
        ]),
      );
      const customerBalances = new Map(
        (agingResult.customers || []).map((customer) => [
          String(customer.customer_id),
          Number(customer.total || 0),
        ]),
      );
      setParties({
        suppliers: results[0].map((supplier) => ({
          ...supplier,
          balance: supplierBalances.get(String(supplier.id)) || 0,
        })),
        customers: results[1].map((customer) => ({
          ...customer,
          balance: customerBalances.get(String(customer.id)) || 0,
        })),
        employees: results[2].map((employee) => ({
          ...employee,
          balance: null,
        })),
      });
      return;
    }
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || "Unable to load party ledgers");
    for (const key of ["suppliers", "customers", "employees"]) {
      if (!Array.isArray(result[key])) {
        throw new Error(`Party ledger response is missing the ${key} list`);
      }
    }
    setParties({
      suppliers: result.suppliers || [],
      customers: result.customers || [],
      employees: result.employees || [],
    });
  };

  useEffect(() => {
    loadAccounts()
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
    loadParties().catch((loadError) => setPartyError(loadError.message));
  }, []);

  const visibleAccounts = useMemo(
    () => {
      const partyAccounts = [
        ...parties.suppliers.map((party) => ({
          id: `supplier-${party.id}`,
          code: `SUP-${party.id}`,
          name: party.name,
          account_type: "liability",
          group_ledger: "Supplier",
          balance: party.balance,
          partyType: "supplier",
          partyId: party.id,
          is_active: party.is_active,
        })),
        ...parties.customers.map((party) => ({
          id: `customer-${party.id}`,
          code: `CUS-${party.id}`,
          name: party.name,
          account_type: "asset",
          group_ledger: "Customer",
          balance: party.balance,
          partyType: "customer",
          partyId: party.id,
          is_active: party.is_active,
        })),
        ...parties.employees.map((party) => ({
          id: `employee-${party.id}`,
          code: `EMP-${party.id}`,
          name: party.name,
          account_type: "liability",
          group_ledger: "Employee",
          balance: party.balance,
          partyType: "employee",
          partyId: party.id,
          is_active: true,
        })),
      ];
      const allAccounts = [...accounts, ...partyAccounts];
      return filter === "all"
        ? allAccounts
        : allAccounts.filter((account) => account.account_type === filter);
    },
    [accounts, parties, filter],
  );

  const accountGroups = useMemo(() => {
    const groups = new Map();
    for (const group of groupLedgers) {
      if (filter !== "all" && group.account_type !== filter) continue;
      groups.set(group.name, {
        name: group.name,
        accountType: group.account_type,
        accounts: [],
      });
    }

    for (const account of visibleAccounts) {
      const name = account.group_ledger || "Ungrouped";
      if (!groups.has(name)) {
        groups.set(name, {
          name,
          accountType: account.account_type,
          accounts: [],
        });
      }
      groups.get(name).accounts.push(account);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        accounts: group.accounts.sort((left, right) =>
          String(left.code).localeCompare(String(right.code)),
        ),
        balance: group.accounts.reduce(
          (total, account) => total + Number(account.balance || 0),
          0,
        ),
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [filter, groupLedgers, visibleAccounts]);

  const createGroup = async (event) => {
    event.preventDefault();
    setGroupError("");
    setGroupMessage("");
    setSavingGroup(true);
    try {
      const response = await fetch(
        getApiUrl("/api/ledger/accounts?resource=groups"),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(groupForm),
        },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to create group ledger");
      }
      setGroupLedgers((current) =>
        [...current, result.group].sort((left, right) =>
          left.name.localeCompare(right.name),
        ),
      );
      setGroupForm(initialGroupForm);
      setGroupMessage(`Group ledger "${result.group.name}" created.`);
    } catch (saveError) {
      setGroupError(saveError.message);
    } finally {
      setSavingGroup(false);
    }
  };

  const openLedgerReport = async (account) => {
    setSelectedAccount(account);
    setLedgerLoading(true);
    try {
      const params = new URLSearchParams(
        account.partyType
          ? {
              partyType: account.partyType,
              partyId: String(account.partyId),
              year: ledgerYear,
            }
          : { account: `${account.code} - ${account.name}`, year: ledgerYear },
      );
      const response = await fetch(`${getApiUrl("/api/reports/financial/details")}?${params}`, { credentials: "include" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to load ledger report");
      setLedgerEntries(result.entries || []);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">Accounting</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">Chart of accounts</h1>
            <p className="mt-2 text-sm text-slate-500">Manage the accounts used by payroll, payments, and journal entries.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/ledger-accounts/new" className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-800">Create ledger account</Link>
            <a href="#group-ledgers" className="rounded border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50">Group ledgers</a>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="rounded border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="all">All account types</option>
              {accountTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
            </select>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
        {partyError && <p className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800" role="status">Party ledgers could not be loaded: {partyError}</p>}
        <section id="group-ledgers" className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Group ledgers</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create and view groups here. Accounts assigned to each group appear beneath it in the chart.
            </p>
          </div>
          {groupError ? <p className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{groupError}</p> : null}
          {groupMessage ? <p className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">{groupMessage}</p> : null}
          <form onSubmit={createGroup} className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end">
            <label className="text-sm font-medium text-slate-700">
              Group name
              <input
                required
                maxLength={100}
                value={groupForm.name}
                onChange={(event) => {
                  setGroupForm((current) => ({ ...current, name: event.target.value }));
                  setGroupError("");
                  setGroupMessage("");
                }}
                placeholder="Current Assets"
                className="mt-1 block w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Account type
              <select
                value={groupForm.accountType}
                onChange={(event) => setGroupForm((current) => ({ ...current, accountType: event.target.value }))}
                className="mt-1 block w-full rounded border border-slate-300 bg-white px-3 py-2"
              >
                {accountTypes.map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)}</option>)}
              </select>
            </label>
            <button type="submit" disabled={savingGroup} className="rounded bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60">
              {savingGroup ? "Creating…" : "Create group"}
            </button>
          </form>
        </section>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[850px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Code</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Group Ledger</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Report</th></tr></thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    Loading accounts...
                  </td>
                </tr>
              ) : accountGroups.length ? (
                accountGroups.map((group) => (
                  <Fragment key={group.name}>
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan="2" className="px-4 py-3 font-semibold text-slate-900">
                        {group.name}
                      </td>
                      <td className="px-4 py-3 capitalize text-slate-600">
                        {group.accountType}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        Group ledger · {group.accounts.length} account{group.accounts.length === 1 ? "" : "s"}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {group.accountType === "expense" ? "—" : formatMoney(group.balance)}
                      </td>
                      <td colSpan="2" />
                    </tr>
                    {group.accounts.map((account) => (
                      <tr key={account.id} className="border-t border-slate-100">
                        <td className="px-4 py-3 pl-8 font-semibold text-slate-900">{account.code}</td>
                        <td className="px-4 py-3">{account.name}</td>
                        <td className="px-4 py-3 capitalize text-slate-600">
                          {account.partyType ? `${account.partyType} (${account.account_type})` : account.account_type}
                        </td>
                        <td className="px-4 py-3">{account.group_ledger || "-"}</td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {account.account_type === "expense" || account.balance == null
                            ? "—"
                            : formatMoney(account.balance)}
                        </td>
                        <td className={`px-4 py-3 ${account.is_active === false ? "text-slate-500" : "text-emerald-700"}`}>
                          {account.is_active === false ? "Inactive" : "Active"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            className="rounded bg-teal-600 px-3 py-1 text-xs font-semibold text-white"
                            onClick={() => openLedgerReport(account)}
                          >
                            Open report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </Fragment>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                    No accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {selectedAccount ? (
          <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
                  Individual ledger report
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedAccount.partyType
                    ? `${selectedAccount.partyType[0].toUpperCase()}${selectedAccount.partyType.slice(1)}: ${selectedAccount.name}`
                    : `${selectedAccount.code} - ${selectedAccount.name}`}
                </h2>
              </div>
              <label className="text-xs font-semibold text-slate-500">
                Year
                <input
                  className="mt-1 block w-28 rounded border border-slate-300 px-2 py-2 text-sm"
                  type="number"
                  min="2000"
                  max="2100"
                  value={ledgerYear}
                  onChange={(event) => setLedgerYear(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") openLedgerReport(selectedAccount);
                  }}
                />
              </label>
            </div>
            <QuickReport
              account={selectedAccount}
              entries={ledgerEntries}
              loading={ledgerLoading}
              onRefresh={() => openLedgerReport(selectedAccount)}
              onClose={() => setSelectedAccount(null)}
            />
          </section>
        ) : null}
      </div>
    </main>
  );
};

export default ChartOfAccounts;
