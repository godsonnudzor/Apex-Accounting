import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import { getApiUrl, readApiResponse } from "../context/auth";

const today = new Date().toISOString().slice(0, 10);
const firstOfMonth = `${today.slice(0, 7)}-01`;

const apiResult = async (response, fallback) => {
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.message || fallback);
  return result;
};

const formatMoney = (value, currency) => {
  const amount = Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency === "GHS" ? "GHC" : currency} ${amount}`;
};

function BankReconciliation() {
  const [accounts, setAccounts] = useState([]);
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [accountId, setAccountId] = useState("");
  const [newAccount, setNewAccount] = useState({
    ledgerAccountId: "",
    accountName: "",
    bankName: "",
    accountNumber: "",
    currency: "GHS",
  });
  const [startDate, setStartDate] = useState(firstOfMonth);
  const [endDate, setEndDate] = useState(today);
  const [openingBalance, setOpeningBalance] = useState("");
  const [endingBalance, setEndingBalance] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [reconciliations, setReconciliations] = useState([]);
  const [clearedIds, setClearedIds] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAccount, setSavingAccount] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const selectedAccount = accounts.find(
    (account) => String(account.id) === accountId,
  );
  const currency = selectedAccount?.currency || "GHS";
  const clearedAmount = useMemo(
    () =>
      transactions
        .filter((transaction) => clearedIds.includes(Number(transaction.id)))
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0),
    [transactions, clearedIds],
  );
  const difference =
    Math.round(
      ((Number(openingBalance) || 0) +
        clearedAmount -
        (Number(endingBalance) || 0)) *
        100,
    ) / 100;
  const canComplete =
    Boolean(accountId) &&
    startDate <= endDate &&
    openingBalance !== "" &&
    endingBalance !== "" &&
    Number.isFinite(Number(openingBalance)) &&
    Number.isFinite(Number(endingBalance)) &&
    Math.abs(difference) < 0.005 &&
    !loading &&
    !saving;

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(getApiUrl("/api/cash-bank-accounts"), { credentials: "include" }).then(
        (response) =>
          apiResult(response, "Unable to load cash and bank accounts"),
      ),
      fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load ledger accounts"),
      ),
    ])
      .then(([accountResult, ledgerResult]) => {
        if (!active) return;
        const allAccounts = accountResult.accounts || [];
        const bankAccounts = allAccounts.filter(
          (account) => account.account_type === "bank",
        );
        setAccounts(bankAccounts);
        const linkedLedgerAccountIds = new Set(
          allAccounts.map((account) => Number(account.ledger_account_id)),
        );
        setLedgerAccounts(
          (ledgerResult.accounts || []).filter(
            (account) =>
              account.account_type === "asset" &&
              !linkedLedgerAccountIds.has(Number(account.id)),
          ),
        );
        setAccountId((current) =>
          bankAccounts.some((account) => String(account.id) === current)
            ? current
            : String(bankAccounts[0]?.id || ""),
        );
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoadingAccounts(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const createBankAccount = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingAccount(true);
    try {
    const response = await fetch(getApiUrl("/api/cash-bank-accounts"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newAccount),
    });
    const result = await apiResult(response, "Unable to register bank account");
    setAccounts((current) =>
      [...current, result.account].sort((left, right) =>
        left.account_name.localeCompare(right.account_name),
      ),
    );
    setAccountId(String(result.account.id));
    setLedgerAccounts((current) =>
      current.filter(
        (account) =>
          Number(account.id) !== Number(result.account.ledger_account_id),
      ),
    );
    setNewAccount({
      ledgerAccountId: "",
      accountName: "",
      bankName: "",
      accountNumber: "",
      currency: "GHS",
    });
    setNotice("Bank account registered and ready to reconcile.");
    } catch (saveError) {
    setError(saveError.message);
    } finally {
    setSavingAccount(false);
    }
  };

  useEffect(() => {
    if (!accountId || !startDate || !endDate || startDate > endDate) {
      setTransactions([]);
      setReconciliations([]);
      setClearedIds([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    const query = new URLSearchParams({ accountId, startDate, endDate });
    setLoading(true);
    setError("");
    setClearedIds([]);
    fetch(`${getApiUrl("/api/bank-reconciliations")}?${query}`, {
      credentials: "include",
    })
      .then((response) =>
        apiResult(response, "Unable to load reconciliation transactions"),
      )
      .then((result) => {
        if (!active) return;
        setTransactions(result.transactions || []);
        setReconciliations(result.reconciliations || []);
      })
      .catch((loadError) => {
        if (active) setError(loadError.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accountId, startDate, endDate, refreshKey]);

  const toggleCleared = (lineId) => {
    setClearedIds((current) =>
      current.includes(lineId)
        ? current.filter((id) => id !== lineId)
        : [...current, lineId],
    );
    setError("");
  };

  const completeReconciliation = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!canComplete) {
      setError("Select cleared transactions until the difference is zero.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(getApiUrl("/api/bank-reconciliations"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: Number(accountId),
          startDate,
          endDate,
          openingBalance: Number(openingBalance),
          endingBalance: Number(endingBalance),
          clearedLineIds: clearedIds,
        }),
      });
      const result = await apiResult(response, "Unable to complete reconciliation");
      setNotice(`Reconciliation #${result.reconciliationId} completed.`);
      setOpeningBalance(endingBalance);
      setEndingBalance("");
      setClearedIds([]);
      setRefreshKey((current) => current + 1);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="deposit-app">
      <header className="deposit-header">
        <div>
          <p className="deposit-eyebrow">Banking · Accounting</p>
          <h1>Bank reconciliation</h1>
          <p>Match posted transactions to your bank statement and confirm the balance.</p>
        </div>
        <Link className="deposit-primary-link" to="/deposits">
          Make a deposit
        </Link>
      </header>

      {error && <p className="deposit-alert error" role="alert">{error}</p>}
      {notice && <p className="deposit-alert success" role="status">{notice}</p>}

      {(!loadingAccounts && !accounts.length) && (
        <p className="deposit-alert bank-account-empty" role="status">
          No bank accounts are registered yet. Add one below, linked to an
          active asset ledger account.
        </p>
      )}

      <details className="bank-account-setup" open={!accounts.length}>
        <summary>{accounts.length ? "Add a bank account" : "Register a bank account"}</summary>
        <form onSubmit={createBankAccount}>
          <label>
            Asset ledger account
            <select
              value={newAccount.ledgerAccountId}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  ledgerAccountId: event.target.value,
                }))
              }
              required
              disabled={!ledgerAccounts.length || savingAccount}
            >
              <option value="">
                {ledgerAccounts.length
                  ? "Select an unlinked asset account"
                  : "No unlinked asset accounts available"}
              </option>
              {ledgerAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </label>
          {!ledgerAccounts.length && (
            <p className="bank-account-ledger-hint">
              No unlinked asset accounts are available.{" "}
              <Link to="/ledger-accounts/new">Create an asset ledger account</Link>.
            </p>
          )}
          <label>
            Bank account name
            <input
              value={newAccount.accountName}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  accountName: event.target.value,
                }))
              }
              maxLength={150}
              required
            />
          </label>
          <label>
            Bank name
            <input
              value={newAccount.bankName}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  bankName: event.target.value,
                }))
              }
              maxLength={150}
            />
          </label>
          <label>
            Account number
            <input
              value={newAccount.accountNumber}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  accountNumber: event.target.value,
                }))
              }
              maxLength={100}
            />
          </label>
          <label>
            Currency
            <input
              value={newAccount.currency}
              onChange={(event) =>
                setNewAccount((current) => ({
                  ...current,
                  currency: event.target.value.toUpperCase(),
                }))
              }
              maxLength={3}
              pattern="[A-Za-z]{3}"
              required
            />
          </label>
          <button
            type="submit"
            className="deposit-save primary"
            disabled={!ledgerAccounts.length || savingAccount}
          >
            {savingAccount ? "Registering..." : "Register bank account"}
          </button>
        </form>
      </details>

      <form className="deposit-form" onSubmit={completeReconciliation}>
        <section
          className="deposit-details bank-reconciliation-details"
          aria-label="Statement details"
        >
          <label>
            Bank account
            <select
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              disabled={loadingAccounts || !accounts.length}
              required
            >
              <option value="">
                {loadingAccounts ? "Loading accounts..." : "Select bank account"}
              </option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.account_name}
                  {account.bank_name ? ` · ${account.bank_name}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            Statement starts
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => setStartDate(event.target.value)}
              required
            />
          </label>
          <label>
            Statement ends
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(event) => setEndDate(event.target.value)}
              required
            />
          </label>
          <label>
            Opening balance ({currency})
            <input
              type="number"
              step="0.01"
              value={openingBalance}
              onChange={(event) => setOpeningBalance(event.target.value)}
              placeholder="0.00"
              required
            />
          </label>
          <label>
            Statement ending balance ({currency})
            <input
              type="number"
              step="0.01"
              value={endingBalance}
              onChange={(event) => setEndingBalance(event.target.value)}
              placeholder="0.00"
              required
            />
          </label>
        </section>

        <p className="deposit-instruction">
          Check off each posted bank transaction that appears on this statement.
          Deposits increase the balance; payments reduce it.
        </p>

        <section className="deposit-lines-section">
          <div className="deposit-lines-heading">
            <div>
              <h2>Unreconciled transactions</h2>
              <p>{startDate} to {endDate}</p>
            </div>
            <span>{clearedIds.length} selected</span>
          </div>
          <div className="deposit-history-scroll">
            <table className="deposit-history-table">
              <thead>
                <tr>
                  <th scope="col">Cleared</th>
                  <th scope="col">Date</th>
                  <th scope="col">Reference</th>
                  <th scope="col">Description</th>
                  <th scope="col" className="number-cell">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={clearedIds.includes(Number(transaction.id))}
                        onChange={() => toggleCleared(Number(transaction.id))}
                        aria-label={`Mark ${transaction.description || transaction.reference || "transaction"} as cleared`}
                      />
                    </td>
                    <td>{transaction.date}</td>
                    <td>{transaction.reference || "—"}</td>
                    <td>{transaction.description || "Journal entry"}</td>
                    <td className="number-cell">
                      {formatMoney(transaction.amount, currency)}
                    </td>
                  </tr>
                ))}
                {!loading && transactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="deposit-empty">
                      No unreconciled posted transactions for this statement period.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td colSpan="5" className="deposit-empty">Loading transactions...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="deposit-summary">
          <div className="deposit-cashback">
            <p>
              The difference must be zero before a reconciliation can be
              completed. Completed transactions are locked against future
              reconciliation.
            </p>
          </div>
          <div className="deposit-totals" aria-live="polite">
            <div><span>Opening balance</span><strong>{formatMoney(openingBalance, currency)}</strong></div>
            <div><span>Cleared transactions</span><strong>{formatMoney(clearedAmount, currency)}</strong></div>
            <div><span>Calculated balance</span><strong>{formatMoney((Number(openingBalance) || 0) + clearedAmount, currency)}</strong></div>
            <div><span>Statement ending balance</span><strong>{formatMoney(endingBalance, currency)}</strong></div>
            <div className="deposit-grand-total">
              <span>Difference</span>
              <strong>{formatMoney(difference, currency)}</strong>
            </div>
          </div>
        </section>

        <footer className="deposit-footer">
          <p>Reconciliation history is stored with the selected bank account.</p>
          <div>
            <button type="submit" className="deposit-save primary" disabled={!canComplete}>
              {saving ? "Completing..." : "Complete reconciliation"}
            </button>
          </div>
        </footer>
      </form>

      <section className="deposit-history-card bank-reconciliation-history">
        <div className="deposit-lines-heading">
          <div>
            <h2>Completed reconciliations</h2>
            <p>{selectedAccount?.account_name || "Select a bank account"} history</p>
          </div>
        </div>
        {reconciliations.length ? (
          <div className="deposit-history-scroll">
            <table className="deposit-history-table">
              <thead>
                <tr>
                  <th scope="col">Statement period</th>
                  <th scope="col">Transactions</th>
                  <th scope="col" className="number-cell">Opening balance</th>
                  <th scope="col" className="number-cell">Ending balance</th>
                  <th scope="col" className="number-cell">Cleared amount</th>
                  <th scope="col">Completed</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.map((reconciliation) => (
                  <tr key={reconciliation.id}>
                    <td>{reconciliation.statement_start_date} – {reconciliation.statement_end_date}</td>
                    <td>{reconciliation.bank_reconciliation_lines?.length || 0}</td>
                    <td className="number-cell">{formatMoney(reconciliation.opening_balance, currency)}</td>
                    <td className="number-cell">{formatMoney(reconciliation.statement_ending_balance, currency)}</td>
                    <td className="number-cell">{formatMoney(reconciliation.cleared_amount, currency)}</td>
                    <td>{new Date(reconciliation.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="deposit-empty">No completed reconciliations for this account yet.</p>
        )}
      </section>
    </main>
  );
}

export default BankReconciliation;
