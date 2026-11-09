import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const today = () => new Date().toISOString().slice(0, 10);

const formatMoney = (amount, currency = "GHS") =>
  `${currency} ${Number(amount || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function Settlement({ settlementType }) {
  const isReceipt = settlementType === "receipt";
  const partyLabel = isReceipt ? "Customer" : "Supplier";
  const partyKey = isReceipt ? "customerId" : "supplierId";
  const partyEndpoint = isReceipt ? "/api/customers" : "/api/suppliers";
  const title = isReceipt ? "Receive customer payment" : "Pay supplier";
  const navigate = useNavigate();
  const location = useLocation();
  const [parties, setParties] = useState([]);
  const [cashAccounts, setCashAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [partyId, setPartyId] = useState(
    String(location.state?.[partyKey] || ""),
  );
  const [cashBankAccountId, setCashBankAccountId] = useState("");
  const [settlementDate, setSettlementDate] = useState(today);
  const [paymentType, setPaymentType] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [allocations, setAllocations] = useState({});
  const [lookupLoading, setLookupLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    const loadLookups = async () => {
      const [partyResponse, accountResponse] = await Promise.all([
        fetch(getApiUrl(`${partyEndpoint}?includeInactive=true`), {
          credentials: "include",
        }),
        fetch(getApiUrl("/api/cash-bank-accounts"), {
          credentials: "include",
        }),
      ]);
      const [partyResult, accountResult] = await Promise.all([
        readApiResponse(partyResponse),
        readApiResponse(accountResponse),
      ]);
      if (!partyResponse.ok) {
        throw new Error(partyResult.message || `Unable to load ${partyLabel.toLowerCase()}s`);
      }
      if (!accountResponse.ok) {
        throw new Error(accountResult.message || "Unable to load cash and bank accounts");
      }
      if (!active) return;
      setParties(partyResult[isReceipt ? "customers" : "suppliers"] || []);
      const activeAccounts = accountResult.accounts || [];
      setCashAccounts(activeAccounts);
      setCashBankAccountId((current) =>
        current && activeAccounts.some((account) => String(account.id) === current)
          ? current
          : String(activeAccounts[0]?.id || ""),
      );
    };

    loadLookups()
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLookupLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isReceipt, partyEndpoint, partyLabel]);

  const cashAccount = cashAccounts.find(
    (account) => String(account.id) === String(cashBankAccountId),
  );
  const currency = String(cashAccount?.currency || "GHS").toUpperCase();

  useEffect(() => {
    let active = true;
    if (!partyId || !cashBankAccountId) {
      setTransactions([]);
      setAllocations({});
      return () => {
        active = false;
      };
    }

    const loadPendingTransactions = async () => {
      setPendingLoading(true);
      setError("");
      setAllocations({});
      const query = new URLSearchParams({
        type: settlementType,
        partyId,
        currency,
      });
      const response = await fetch(
        getApiUrl(`/api/settlements-pending?${query.toString()}`),
        { credentials: "include" },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to load outstanding transactions");
      }
      if (active) setTransactions(result.transactions || []);
    };

    loadPendingTransactions()
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setPendingLoading(false);
      });
    return () => {
      active = false;
    };
  }, [cashBankAccountId, currency, partyId, settlementType]);

  const total = useMemo(
    () =>
      Object.values(allocations).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0,
      ),
    [allocations],
  );

  const setParty = (value) => {
    setPartyId(value);
    setNotice("");
  };

  const toggleTransaction = (transaction) => {
    const id = String(transaction.id);
    setAllocations((current) => {
      if (Object.hasOwn(current, id)) {
        const next = { ...current };
        delete next[id];
        return next;
      }
      return { ...current, [id]: String(transaction.open_balance) };
    });
  };

  const updateAllocation = (id, value) => {
    setAllocations((current) => ({ ...current, [String(id)]: value }));
  };

  const saveSettlement = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const selectedAllocations = Object.entries(allocations)
      .map(([documentId, amount]) => ({
        documentId: Number(documentId),
        amount: Number(amount),
      }))
      .filter((allocation) => allocation.amount > 0);
    const transactionById = new Map(
      transactions.map((transaction) => [String(transaction.id), transaction]),
    );
    if (!partyId) {
      setError(`Select a ${partyLabel.toLowerCase()}.`);
      return;
    }
    if (!cashBankAccountId) {
      setError("Select an active cash or bank account.");
      return;
    }
    if (!selectedAllocations.length) {
      setError("Select at least one outstanding transaction and enter an amount.");
      return;
    }
    if (
      selectedAllocations.some((allocation) => {
        const openBalance = Number(
          transactionById.get(String(allocation.documentId))?.open_balance,
        );
        return (
          !Number.isFinite(allocation.amount) ||
          allocation.amount <= 0 ||
          Math.round(allocation.amount * 100) !== allocation.amount * 100 ||
          allocation.amount > openBalance
        );
      })
    ) {
      setError("Each amount must be positive, use two decimal places, and not exceed its open balance.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        getApiUrl(
          isReceipt
            ? "/api/settlements-receipts"
            : "/api/settlements-supplier-payments",
        ),
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            partyId: Number(partyId),
            cashBankAccountId: Number(cashBankAccountId),
            settlementDate,
            paymentType,
            reference,
            memo,
            allocations: selectedAllocations,
          }),
        },
      );
      const result = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(result.message || "Unable to save settlement");
      }
      setNotice(
        `${isReceipt ? "Receipt" : "Payment"} recorded: ${formatMoney(
          result.settlement?.amount,
          result.settlement?.currency || currency,
        )}.`,
      );
      setAllocations({});
      setReference("");
      setMemo("");
      const query = new URLSearchParams({
        type: settlementType,
        partyId,
        currency,
      });
      const pendingResponse = await fetch(
        getApiUrl(`/api/settlements-pending?${query.toString()}`),
        { credentials: "include" },
      );
      const pendingResult = await readApiResponse(pendingResponse);
      if (!pendingResponse.ok) {
        throw new Error(pendingResult.message || "Settlement saved, but balances could not be refreshed.");
      }
      setTransactions(pendingResult.transactions || []);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-800 sm:p-8">
      <div className="mx-auto max-w-6xl rounded-xl border border-slate-200 bg-white shadow-sm">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-teal-700">
              {isReceipt ? "Customers" : "Suppliers"}
            </p>
            <h1 className="mt-1 text-2xl font-bold">{title}</h1>
          </div>
          <Link
            to={isReceipt ? "/customersCenter" : "/suppliersCenter"}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 no-underline hover:bg-slate-50"
          >
            Back to {isReceipt ? "customers" : "suppliers"}
          </Link>
        </header>

        <form onSubmit={saveSettlement} className="space-y-6 p-5">
          {error ? (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              {notice}
            </p>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">
              {partyLabel}
              <select
                required
                value={partyId}
                onChange={(event) => setParty(event.target.value)}
                disabled={lookupLoading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">
                  {lookupLoading ? `Loading ${partyLabel.toLowerCase()}s...` : `Select ${partyLabel.toLowerCase()}`}
                </option>
                {parties.map((party) => (
                  <option key={party.id} value={party.id}>
                    {party.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Deposit to / Pay from
              <select
                required
                value={cashBankAccountId}
                onChange={(event) => setCashBankAccountId(event.target.value)}
                disabled={lookupLoading}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Select cash or bank account</option>
                {cashAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.account_name} · {account.currency || "GHS"}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Date
              <input
                required
                type="date"
                value={settlementDate}
                onChange={(event) => setSettlementDate(event.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Method
              <select
                value={paymentType}
                onChange={(event) => setPaymentType(event.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2"
              >
                <option value="bank_transfer">Bank transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Reference
              <input
                maxLength={100}
                value={reference}
                onChange={(event) => setReference(event.target.value)}
                placeholder="Optional"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Memo
              <input
                maxLength={5000}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
                placeholder="Optional note"
                className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              />
            </label>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Outstanding transactions</h2>
                <p className="text-sm text-slate-500">
                  Select one or more {isReceipt ? "invoices" : "bills"} and edit the amount to allocate partially.
                </p>
              </div>
              <strong className="text-sm">
                Selected total: {formatMoney(total, currency)}
              </strong>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="w-12 px-3 py-3">Select</th>
                    <th className="px-3 py-3">Transaction</th>
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Due</th>
                    <th className="px-3 py-3 text-right">Open balance</th>
                    <th className="px-3 py-3 text-right">Allocate</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingLoading ? (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                        Loading outstanding transactions...
                      </td>
                    </tr>
                  ) : transactions.length ? (
                    transactions.map((transaction) => {
                      const id = String(transaction.id);
                      const selected = Object.hasOwn(allocations, id);
                      const documentNumber = isReceipt
                        ? transaction.invoice_number
                        : transaction.reference;
                      return (
                        <tr key={id} className="border-t border-slate-100">
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              aria-label={`Select ${documentNumber || "transaction"}`}
                              checked={selected}
                              onChange={() => toggleTransaction(transaction)}
                            />
                          </td>
                          <td className="px-3 py-3 font-medium">
                            {documentNumber || `${isReceipt ? "Invoice" : "Bill"} #${id}`}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {isReceipt ? transaction.invoice_date : transaction.bill_date}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3">
                            {isReceipt ? "—" : transaction.due_date || "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                            {formatMoney(transaction.open_balance, currency)}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <input
                              type="number"
                              min="0.01"
                              max={transaction.open_balance}
                              step="0.01"
                              value={selected ? allocations[id] : ""}
                              disabled={!selected}
                              onChange={(event) => updateAllocation(id, event.target.value)}
                              aria-label={`Amount to allocate for ${documentNumber || "transaction"}`}
                              className="w-36 rounded-md border border-slate-300 px-2 py-1.5 text-right tabular-nums disabled:bg-slate-100"
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="px-3 py-8 text-center text-slate-500">
                        {partyId && cashBankAccountId
                          ? `No outstanding ${isReceipt ? "invoices" : "bills"} in ${currency}.`
                          : `Choose a ${partyLabel.toLowerCase()} and cash or bank account to load pending transactions.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => navigate(isReceipt ? "/customersCenter" : "/suppliersCenter")}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || lookupLoading || pendingLoading || total <= 0}
              className="rounded-md bg-teal-700 px-5 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : isReceipt ? "Record receipt" : "Record payment"}
            </button>
          </footer>
        </form>
      </div>
    </main>
  );
}

export default Settlement;
