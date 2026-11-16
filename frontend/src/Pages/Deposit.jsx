import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { getApiUrl, readApiResponse } from "../context/auth";

const today = new Date().toISOString().slice(0, 10);
const emptyLine = () => ({
  receivedFrom: "",
  partyType: "",
  partyId: "",
  fromAccount: "",
  memo: "",
  chequeNumber: "",
  paymentMethod: "cash",
  amount: "",
});
const hasAtMostTwoDecimals = (amount) =>
  Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-7;
const money = (amount, currency) =>
  `${currency === "GHS" ? "GHC" : currency} ${Number(amount || 0).toLocaleString(
    undefined,
    { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  )}`;
const apiResult = async (response, fallback) => {
  const result = await readApiResponse(response);
  if (!response.ok) throw new Error(result.message || fallback);
  return result;
};

function Deposit() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const showingHistory = searchParams.get("view") === "history";
  const [parties, setParties] = useState({
    suppliers: [],
    customers: [],
    employees: [],
  });
  const [ledgerAccounts, setLedgerAccounts] = useState([]);
  const [history, setHistory] = useState([]);
  const [lines, setLines] = useState([emptyLine()]);
  const [depositToId, setDepositToId] = useState("");
  const [depositDate, setDepositDate] = useState(today);
  const [reference, setReference] = useState("");
  const [memo, setMemo] = useState("");
  const [cashBackAccount, setCashBackAccount] = useState("");
  const [cashBackMemo, setCashBackMemo] = useState("");
  const [cashBackAmount, setCashBackAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const assetAccounts = ledgerAccounts.filter(
    (account) => account.account_type === "asset",
  );
  const depositTo = assetAccounts.find(
    (account) => String(account.id) === depositToId,
  );
  const currency = "GHS";
  const subtotal = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + Math.round((Number(line.amount) || 0) * 100),
        0,
      ) / 100,
    [lines],
  );
  const cashBack = Number(cashBackAmount) || 0;
  const depositTotal = subtotal - cashBack;
  const cashBackAccounts = assetAccounts.filter(
    (account) =>
      `${account.code} - ${account.name}` !==
      `${depositTo?.code} - ${depositTo?.name}`,
  );

  const loadHistory = async () => {
    const response = await fetch(getApiUrl("/api/deposits"), {
      credentials: "include",
    });
    const result = await apiResult(response, "Unable to load deposit history");
    setHistory(result.deposits || []);
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load ledger accounts"),
      ),
      fetch(getApiUrl("/api/suppliers?includeInactive=true"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load suppliers"),
      ),
      fetch(getApiUrl("/api/customers?includeInactive=true"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load customers"),
      ),
      fetch(getApiUrl("/api/employees"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load employees"),
      ),
      fetch(getApiUrl("/api/deposits"), { credentials: "include" }).then(
        (response) => apiResult(response, "Unable to load deposit history"),
      ),
    ])
      .then(([ledgerResult, supplierResult, customerResult, employeeResult, historyResult]) => {
        if (!active) return;
        const activeAssets = (ledgerResult.accounts || []).filter(
          (account) => account.account_type === "asset",
        );
        setLedgerAccounts(ledgerResult.accounts || []);
        setParties({
          suppliers: supplierResult.suppliers || [],
          customers: customerResult.customers || [],
          employees: employeeResult.employees || [],
        });
        setHistory(historyResult.deposits || []);
        setDepositToId(String(activeAssets[0]?.id || ""));
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
  }, []);

  const updateLine = (index, field, value) => {
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [field]: value } : line,
      ),
    );
    setError("");
  };

  const resetDeposit = () => {
    setLines([emptyLine()]);
    setDepositDate(today);
    setReference("");
    setMemo("");
    setCashBackAccount("");
    setCashBackMemo("");
    setCashBackAmount("");
    setError("");
    setNotice("");
  };

  const saveDeposit = async (event, startAnother = false) => {
    event?.preventDefault();
    setError("");
    setNotice("");
    const depositLines = lines.filter(
      (line) =>
        line.receivedFrom ||
        line.fromAccount ||
        line.memo ||
        line.chequeNumber ||
        line.amount,
    );
    if (!depositToId) {
      setError("Choose an active asset account to deposit into.");
      return;
    }
    if (!depositLines.length) {
      setError("Add at least one payment line to this deposit.");
      return;
    }
    if (
      depositLines.some(
        (line) =>
          !line.receivedFrom.trim() ||
          !line.partyType ||
          !line.partyId ||
          !line.fromAccount.trim() ||
          !Number.isFinite(Number(line.amount)) ||
          Number(line.amount) <= 0 ||
          !hasAtMostTwoDecimals(Number(line.amount)),
      )
    ) {
      setError("Each line needs a received-from party, source account, and positive amount with up to two decimals.");
      return;
    }
    if (
      !Number.isFinite(cashBack) ||
      cashBack < 0 ||
      !hasAtMostTwoDecimals(cashBack) ||
      cashBack >= subtotal
    ) {
      setError("Cash back must be zero or a positive amount less than the deposit subtotal.");
      return;
    }
    if (cashBack > 0 && !cashBackAccount) {
      setError("Choose an asset account for the cash back.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(getApiUrl("/api/deposits"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          depositDate,
          reference,
          memo,
          depositLedgerAccountId: Number(depositToId),
          cashBackAccount,
          cashBackMemo,
          cashBackAmount: cashBack,
          lines: depositLines.map((line) => ({
            ...line,
            amount: Number(line.amount),
          })),
        }),
      });
      const result = await apiResult(response, "Unable to save deposit");
      setNotice(`Deposit ${result.entryId} saved and posted.`);
      if (startAnother) {
        resetDeposit();
        setNotice(`Deposit ${result.entryId} saved. You can start another deposit.`);
      } else {
        navigate("/deposits?view=history", { replace: true });
      }
      try {
        await loadHistory();
      } catch (historyError) {
        setError(
          `Deposit ${result.entryId} was posted, but history could not be refreshed: ${historyError.message}`,
        );
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  if (showingHistory) {
    return (
      <main className="deposit-app">
        <header className="deposit-header">
          <div>
            <p className="deposit-eyebrow">Banking · Accounting</p>
            <h1>Deposit history</h1>
            <p>Review posted deposits and their accounting lines.</p>
          </div>
          <Link className="deposit-primary-link" to="/deposits">
            + Make a deposit
          </Link>
        </header>
        {error ? <p className="deposit-alert error" role="alert">{error}</p> : null}
        {notice ? <p className="deposit-alert success" role="status">{notice}</p> : null}
        <section className="deposit-history-card">
          {loading ? (
            <p className="deposit-empty">Loading deposits…</p>
          ) : history.length ? (
            <div className="deposit-history-scroll">
              <table className="deposit-history-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Deposit to</th>
                    <th>Reference</th>
                    <th>Memo</th>
                    <th>Lines</th>
                    <th className="number-cell">Subtotal</th>
                    <th className="number-cell">Cash back</th>
                    <th className="number-cell">Deposit total</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((deposit) => (
                    <tr key={deposit.id}>
                      <td>{deposit.deposit_date}</td>
                      <td>{deposit.account_name}</td>
                      <td>{deposit.reference || "—"}</td>
                      <td>{deposit.memo || "—"}</td>
                      <td>{deposit.line_count}</td>
                      <td className="number-cell">{money(deposit.subtotal, deposit.currency)}</td>
                      <td className="number-cell">{money(deposit.cash_back_amount, deposit.currency)}</td>
                      <td className="number-cell strong-cell">{money(Number(deposit.subtotal) - Number(deposit.cash_back_amount), deposit.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="deposit-empty">No deposits have been posted yet.</p>
          )}
        </section>
        <nav className="deposit-bottom-links" aria-label="Accounting links">
          <Link to="/journal">Journal</Link>
          <Link to="/deposits">New deposit</Link>
        </nav>
      </main>
    );
  }

  return (
    <main className="deposit-app">
      <header className="deposit-toolbar">
        <div className="deposit-toolbar-title">
          <span className="deposit-mark" aria-hidden="true">↗</span>
          <div>
            <p className="deposit-eyebrow">Banking</p>
            <h1>Make a deposit</h1>
          </div>
        </div>
        <nav className="deposit-toolbar-links" aria-label="Deposit actions">
          <Link to="/deposits?view=history">History</Link>
          <Link to="/journal">Journal</Link>
        </nav>
      </header>

      <form className="deposit-form" onSubmit={(event) => saveDeposit(event)}>
        {error ? <p className="deposit-alert error" role="alert">{error}</p> : null}
        {notice ? <p className="deposit-alert success" role="status">{notice}</p> : null}

        <section className="deposit-details" aria-label="Deposit details">
          <label>
            <span>Deposit to</span>
            <select
              value={depositToId}
              onChange={(event) => {
                const nextAccount = assetAccounts.find(
                  (account) => String(account.id) === event.target.value,
                );
                const nextName = nextAccount
                  ? `${nextAccount.code} - ${nextAccount.name}`
                  : "";
                setDepositToId(event.target.value);
                if (cashBackAccount === nextName) setCashBackAccount("");
              }}
              required
              disabled={loading}
            >
              <option value="">Select an asset account</option>
              {assetAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} - {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Date</span>
            <input
              type="date"
              value={depositDate}
              onChange={(event) => setDepositDate(event.target.value)}
              required
            />
          </label>
          <label className="deposit-memo-field">
            <span>Memo</span>
            <input
              maxLength={5000}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder="Optional deposit note"
            />
          </label>
          <label>
            <span>Reference</span>
            <input
              maxLength={100}
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Optional"
            />
          </label>
        </section>

        <p className="deposit-instruction">
          Add amounts to deposit below, and select who each amount was received from.
        </p>

        <section className="deposit-lines-section">
          <div className="deposit-lines-heading">
            <div>
              <h2>Deposit lines</h2>
              <p>Select the person or company that paid, then choose the source ledger account.</p>
            </div>
          </div>
          <div className="deposit-table-scroll">
            <table className="deposit-lines-table">
              <thead>
                <tr>
                  <th>Received from</th>
                  <th>From account</th>
                  <th>Memo</th>
                  <th>Cheque no.</th>
                  <th>Payment method</th>
                  <th className="number-cell">Amount ({currency === "GHS" ? "GHC" : currency})</th>
                  <th><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, index) => (
                  <tr key={`line-${index}`}>
                    <td>
                      <select
                        aria-label={`Received from, line ${index + 1}`}
                        value={line.partyType && line.partyId ? `${line.partyType}:${line.partyId}` : ""}
                        onChange={(event) => {
                          const [partyType = "", partyId = ""] = event.target.value.split(":");
                          const collection = parties[`${partyType}s`] || [];
                          const party = collection.find((item) => String(item.id) === partyId);
                          const name = party?.name || party?.users?.name ||
                            [party?.first_name, party?.last_name].filter(Boolean).join(" ");
                          setLines((current) => current.map((item, lineIndex) =>
                            lineIndex === index
                              ? { ...item, partyType, partyId, receivedFrom: name }
                              : item,
                          ));
                          setError("");
                        }}
                        required
                      >
                        <option value="">Select employee, supplier, or customer</option>
                        <optgroup label="Customers">
                          {parties.customers.map((party) => (
                            <option key={`customer-${party.id}`} value={`customer:${party.id}`}>{party.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Suppliers">
                          {parties.suppliers.map((party) => (
                            <option key={`supplier-${party.id}`} value={`supplier:${party.id}`}>{party.name}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Employees">
                          {parties.employees.map((party) => (
                            <option key={`employee-${party.id}`} value={`employee:${party.id}`}>
                              {party.name || party.users?.name || `${party.first_name || ""} ${party.last_name || ""}`.trim()}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </td>
                    <td>
                      <select
                        aria-label={`From account, line ${index + 1}`}
                        value={line.fromAccount}
                        onChange={(event) => updateLine(index, "fromAccount", event.target.value)}
                      >
                        <option value="">Select account</option>
                        {ledgerAccounts.map((account) => {
                          const name = `${account.code} - ${account.name}`;
                          return <option key={account.id} value={name}>{name}</option>;
                        })}
                      </select>
                    </td>
                    <td>
                      <input
                        aria-label={`Memo, line ${index + 1}`}
                        value={line.memo}
                        onChange={(event) => updateLine(index, "memo", event.target.value)}
                        maxLength={5000}
                        placeholder="Line memo"
                      />
                    </td>
                    <td>
                      <input
                        aria-label={`Cheque number, line ${index + 1}`}
                        value={line.chequeNumber}
                        onChange={(event) => updateLine(index, "chequeNumber", event.target.value)}
                        maxLength={100}
                        placeholder="—"
                      />
                    </td>
                    <td>
                      <select
                        aria-label={`Payment method, line ${index + 1}`}
                        value={line.paymentMethod}
                        onChange={(event) => updateLine(index, "paymentMethod", event.target.value)}
                      >
                        <option value="cash">Cash</option>
                        <option value="cheque">Cheque</option>
                        <option value="bank_transfer">Bank transfer</option>
                      </select>
                    </td>
                    <td className="number-cell">
                      <input
                        aria-label={`Amount, line ${index + 1}`}
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={line.amount}
                        onChange={(event) => updateLine(index, "amount", event.target.value)}
                        placeholder="0.00"
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className="deposit-remove-line"
                        aria-label={`Remove line ${index + 1}`}
                        onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="deposit-add-line"
            onClick={() => setLines((current) => [...current, emptyLine()])}
          >
            + Add another line
          </button>
        </section>

        <section className="deposit-summary">
          <div className="deposit-cashback">
            <p>
              Cash back reduces the bank deposit and is posted to the selected asset account.
            </p>
            <label>
              <span>Cash back goes to</span>
              <select value={cashBackAccount} onChange={(event) => setCashBackAccount(event.target.value)}>
                <option value="">Select asset account</option>
                {cashBackAccounts.map((account) => {
                  const name = `${account.code} - ${account.name}`;
                  return <option key={account.id} value={name}>{name}</option>;
                })}
              </select>
            </label>
            <label>
              <span>Cash back memo</span>
              <input
                maxLength={5000}
                value={cashBackMemo}
                onChange={(event) => setCashBackMemo(event.target.value)}
                placeholder="Optional"
              />
            </label>
            <label>
              <span>Cash back amount</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cashBackAmount}
                onChange={(event) => setCashBackAmount(event.target.value)}
                placeholder="0.00"
              />
            </label>
          </div>
          <div className="deposit-totals">
            <div><span>Deposit subtotal</span><strong>{money(subtotal, currency)}</strong></div>
            <div><span>Cash back</span><strong>− {money(cashBack, currency)}</strong></div>
            <div className="deposit-grand-total"><span>Deposit total</span><strong>{money(depositTotal, currency)}</strong></div>
          </div>
        </section>

        <footer className="deposit-footer">
          <p>Posting creates a balanced journal entry.</p>
          <div>
            <button type="submit" className="deposit-save" disabled={saving || loading}>
              {saving ? "Saving…" : "Save & Close"}
            </button>
            <button type="button" className="deposit-save primary" onClick={(event) => saveDeposit(event, true)} disabled={saving || loading}>
              Save &amp; New
            </button>
            <button type="button" className="deposit-revert" onClick={resetDeposit} disabled={saving}>
              Revert
            </button>
          </div>
        </footer>
      </form>

    </main>
  );
}

export default Deposit;
