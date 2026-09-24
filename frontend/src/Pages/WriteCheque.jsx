import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";
import { getApiUrl } from "../context/auth";

const today = new Date().toISOString().slice(0, 10);
const formatMoney = (value) => `GHC ${Number(value || 0).toFixed(2)}`;
const emptySplit = () => ({ account: "", amount: "", memo: "" });

const numberWords = (amount) => {
  const units = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen",
  ];
  const tens = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];
  const underThousand = (value) => {
    if (value < 20) return units[value];
    if (value < 100)
      return `${tens[Math.floor(value / 10)]}${value % 10 ? `-${units[value % 10]}` : ""}`;
    return `${units[Math.floor(value / 100)]} hundred${value % 100 ? ` and ${underThousand(value % 100)}` : ""}`;
  };
  const whole = Math.floor(Number(amount) || 0);
  const cents = Math.round(((Number(amount) || 0) - whole) * 100);
  if (whole === 0 && cents === 0) return "Zero Ghana cedis";
  const words =
    whole >= 1000
      ? `${underThousand(Math.floor(whole / 1000))} thousand${whole % 1000 ? ` ${underThousand(whole % 1000)}` : ""}`
      : underThousand(whole);
  return `${words} Ghana cedis${cents ? ` and ${underThousand(cents)} pesewas` : ""}`;
};

function WriteCheque() {
  const [transaction, setTransaction] = useState({
    type: "cheque",
    bank: "",
    currency: "GHC",
    number: "",
    date: today,
    payee: "",
    address: "",
    memo: "",
    printLater: false,
  });
  const [splits, setSplits] = useState([
    emptySplit(),
    emptySplit(),
    emptySplit(),
  ]);
  const [accounts, setAccounts] = useState([]);
  const [cashBankAccounts, setCashBankAccounts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [status, setStatus] = useState("");
  const amount = useMemo(
    () => splits.reduce((sum, split) => sum + Number(split.amount || 0), 0),
    [splits],
  );
  const selectedBankAccount = cashBankAccounts.find(
    (account) => String(account.id) === transaction.bank,
  );
  const linkedLedgerAccount = selectedBankAccount?.ledger_accounts;
  const endingBalance = Number(selectedBankAccount?.balance || 0) - amount;

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }).then(
        (response) => response.json(),
      ),
      fetch(getApiUrl("/api/cash-bank-accounts"), {
        credentials: "include",
      }).then((response) => response.json()),
      fetch(getApiUrl("/api/suppliers"), { credentials: "include" }).then(
        (response) => response.json(),
      ),
      fetch(getApiUrl("/api/employees"), { credentials: "include" }).then(
        (response) => response.json(),
      ),
    ])
      .then(
        ([accountResult, cashBankResult, supplierResult, employeeResult]) => {
          if (accountResult.accounts) {
            setAccounts(accountResult.accounts);
          }
          if (cashBankResult.accounts) {
            setCashBankAccounts(cashBankResult.accounts);
            if (cashBankResult.accounts[0])
              setTransaction((current) => ({
                ...current,
                bank: String(cashBankResult.accounts[0].id),
              }));
          }
          if (supplierResult.suppliers) setSuppliers(supplierResult.suppliers);
          if (employeeResult.employees) setEmployees(employeeResult.employees);
        },
      )
      .catch((loadError) =>
        notify(loadError.message || "Unable to load accounting lists"),
      );
  }, []);

  useEffect(() => {
    if (!transaction.payee) {
      setPaymentHistory([]);
      return undefined;
    }
    let cancelled = false;
    setHistoryLoading(true);
    fetch(
      `${getApiUrl("/api/payments/history")}?payee=${encodeURIComponent(transaction.payee)}`,
      { credentials: "include" },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok)
          throw new Error(result.message || "Unable to load payment history");
        if (!cancelled) setPaymentHistory(result.payments || []);
      })
      .catch((loadError) => {
        if (!cancelled) notify(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [transaction.payee]);

  const updateTransaction = (event) => {
    const { name, value, type, checked } = event.target;
    setTransaction((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  const updateSplit = (index, event) => {
    const { name, value } = event.target;
    setSplits((current) =>
      current.map((split, splitIndex) =>
        splitIndex === index ? { ...split, [name]: value } : split,
      ),
    );
  };
  const notify = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2400);
  };
  const clearTransaction = () => {
    setTransaction((current) => ({
      ...current,
      number: "",
      payee: "",
      address: "",
      memo: "",
    }));
    setSplits([emptySplit(), emptySplit(), emptySplit()]);
    notify("Transaction cleared");
  };
  const save = async (next = false) => {
    if (
      !transaction.payee ||
      amount <= 0 ||
      splits.some((split) => split.amount && !split.account)
    ) {
      notify("Add a payee, account splits, and an amount first");
      return;
    }
    try {
      const response = await fetch(getApiUrl("/api/payments"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentType: transaction.type,
          paymentNumber: transaction.number,
          paymentDate: transaction.date,
          payee: transaction.payee,
          cashBankAccountId: Number(transaction.bank),
          bankAccount: linkedLedgerAccount
            ? `${linkedLedgerAccount.code} - ${linkedLedgerAccount.name}`
            : "",
          amount,
          memo: transaction.memo,
          lines: splits
            .filter((split) => split.amount)
            .map((split) => ({
              account: split.account,
              amount: split.amount,
              memo: split.memo,
            })),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Unable to save payment");
      const accountResponse = await fetch(getApiUrl("/api/ledger/accounts"), {
        credentials: "include",
      });
      const accountResult = await accountResponse.json();
      if (accountResponse.ok && accountResult.accounts)
        setAccounts(accountResult.accounts);
      const cashBankResponse = await fetch(
        getApiUrl("/api/cash-bank-accounts"),
        { credentials: "include" },
      );
      const cashBankResult = await cashBankResponse.json();
      if (cashBankResponse.ok && cashBankResult.accounts)
        setCashBankAccounts(cashBankResult.accounts);
      notify(
        next
          ? "Payment saved. New transaction started"
          : `Payment ${result.paymentId} saved`,
      );
      if (next) clearTransaction();
    } catch (saveError) {
      notify(saveError.message);
    }
  };

  return (
    <main className="cheque-app">
      <header className="cheque-toolbar">
        <div className="cheque-tabs">
          <button className="cheque-tab active">Main</button>
          <button className="cheque-tab">Reports</button>
        </div>
        <div className="cheque-tools">
          <button onClick={() => notify("Ready to find a transaction")}>
            Find
          </button>
          <button onClick={clearTransaction}>New</button>
          <button onClick={() => save()}>Save</button>
          <button onClick={clearTransaction}>Delete</button>
          <button onClick={() => notify("Transaction memorized")}>
            Memorise
          </button>
          <button onClick={() => window.print()}>Print</button>
          <button onClick={() => notify("Splits recalculated")}>
            Recalculate
          </button>
          <button onClick={() => notify("Cheque ordering opened")}>
            Order Cheques
          </button>
        </div>
      </header>
      <div className="cheque-switcher">
        <label>
          <input
            type="radio"
            name="transactionType"
            value="cheque"
            checked={transaction.type === "cheque"}
            onChange={updateTransaction}
          />{" "}
          Cheque
        </label>
        <label>
          <input
            type="radio"
            name="transactionType"
            value="cash"
            checked={transaction.type === "cash"}
            onChange={updateTransaction}
          />{" "}
          Cash
        </label>
        <label className="cheque-later">
          <input
            name="printLater"
            type="checkbox"
            checked={transaction.printLater}
            onChange={updateTransaction}
          />{" "}
          Print Later
        </label>
      </div>
      <div className="cheque-account-bar">
        <label>
          BANK ACCOUNT
          <select
            name="bank"
            value={transaction.bank}
            onChange={updateTransaction}
            required
          >
            <option value="">Select cash or bank account</option>
            {cashBankAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.account_name} ({account.account_type})
              </option>
            ))}
          </select>
        </label>
        <span>
          ENDING BALANCE <strong>{formatMoney(endingBalance)}</strong>
        </span>
      </div>

      <div className="cheque-layout">
        <section className="cheque-sheet">
          <div className="cheque-paper">
            <div className="cheque-paper-title">
              <Link to="/dashboard">Back to dashboard</Link>
              <h1>
                {transaction.type === "cheque"
                  ? "Write Cheque"
                  : "Cash Payment"}
              </h1>
            </div>
            <div className="cheque-meta">
              <label>
                NO.{" "}
                <input
                  name="number"
                  value={transaction.number}
                  onChange={updateTransaction}
                  placeholder="To print"
                />
              </label>
              <label>
                DATE{" "}
                <input
                  name="date"
                  type="date"
                  value={transaction.date}
                  onChange={updateTransaction}
                />
              </label>
              <label>
                AMOUNT <output>{formatMoney(amount)}</output>
              </label>
            </div>
            <label className="payee-field">
              PAY TO THE ORDER OF
              <select
                name="payee"
                value={transaction.payee}
                onChange={updateTransaction}
              >
                <option value="">Select supplier or employee</option>
                <optgroup label="Suppliers">
                  {suppliers.map((supplier) => (
                    <option
                      key={`supplier-${supplier.id}`}
                      value={supplier.name}
                    >
                      {supplier.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Employees">
                  {employees.map((employee) => (
                    <option
                      key={`employee-${employee.id}`}
                      value={employee.name}
                    >
                      {employee.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            <label className="address-field">
              ADDRESS
              <textarea
                name="address"
                value={transaction.address}
                onChange={updateTransaction}
                placeholder="Payee address"
              />
            </label>
            <label className="cheque-memo">
              MEMO
              <input
                name="memo"
                value={transaction.memo}
                onChange={updateTransaction}
                placeholder="Purpose of payment"
              />
            </label>
            <div className="amount-words">
              <span>AMOUNT IN WORDS</span>
              <strong>{numberWords(amount)}</strong>
            </div>
          </div>

          <div className="cheque-section-bar">
            <strong>Expenses</strong>
            <span>{formatMoney(amount)}</span>
            <strong>Items</strong>
            <span>{formatMoney(amount)}</span>
          </div>
          <div
            className="cheque-table"
            role="table"
            aria-label="Cheque expense splits"
          >
            <div className="cheque-table-head">
              <span>ACCOUNT</span>
              <span>AMOUNT (GHC)</span>
              <span>MEMO</span>
              <span />
            </div>
            {splits.map((split, index) => (
              <div className="cheque-table-row" key={index}>
                <select
                  name="account"
                  value={split.account}
                  onChange={(event) => updateSplit(index, event)}
                  aria-label={`Account ${index + 1}`}
                >
                  <option value="">Choose ledger account</option>
                  {accounts.map((account) => (
                    <option
                      key={account.id}
                      value={`${account.code} - ${account.name}`}
                    >
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={split.amount}
                  onChange={(event) => updateSplit(index, event)}
                  aria-label={`Amount ${index + 1}`}
                  placeholder="0.00"
                />
                <input
                  name="memo"
                  value={split.memo}
                  onChange={(event) => updateSplit(index, event)}
                  aria-label={`Memo ${index + 1}`}
                />
                <button
                  aria-label={`Remove split ${index + 1}`}
                  onClick={() =>
                    setSplits((current) =>
                      current.filter((_, splitIndex) => splitIndex !== index),
                    )
                  }
                >
                  x
                </button>
              </div>
            ))}
          </div>
          <button
            className="cheque-add-line"
            onClick={() => setSplits((current) => [...current, emptySplit()])}
          >
            + Add split
          </button>
          <div className="journal-check">
            <span>Journal status</span>
            <strong
              className={
                amount > 0 &&
                !splits.some((split) => split.amount && !split.account)
                  ? "balanced"
                  : "pending"
              }
            >
              {amount > 0 &&
              !splits.some((split) => split.amount && !split.account)
                ? "Ready to post"
                : "Needs account and amount"}
            </strong>
            <span>
              Credit bank {formatMoney(amount)} | Debit expenses{" "}
              {formatMoney(amount)}
            </span>
          </div>
          <div className="cheque-footer">
            <span>
              Exchange rate 1 GHC ={" "}
              <input defaultValue="1" aria-label="Exchange rate" /> GHC
            </span>
            <div>
              <button onClick={() => save()}>Save &amp; Close</button>
              <button className="cheque-primary" onClick={() => save(true)}>
                Save &amp; New
              </button>
              <button onClick={clearTransaction}>Clear</button>
            </div>
          </div>
        </section>
        <aside className="cheque-sidebar">
          <h2>TRANSACTION SUMMARY</h2>
          <div className="cheque-side-total">{formatMoney(amount)}</div>
          <p>{transaction.payee || "No payee selected"}</p>
          <p>
            {transaction.type === "cheque" ? "Cheque payment" : "Cash payment"}
          </p>
          {transaction.payee ? (
            <>
              <hr />
              <h2>PAYEE DETAILS</h2>
              {(() => {
                const supplier = suppliers.find(
                  (item) => item.name === transaction.payee,
                );
                const employee = employees.find(
                  (item) => item.name === transaction.payee,
                );
                const details = supplier || employee;
                return details ? (
                  <>
                    <p>{supplier ? "Supplier" : "Employee"}</p>
                    <p>
                      {details.email ||
                        details.phone ||
                        details.position ||
                        "No contact details"}
                    </p>
                    <p>{details.address || details.bank_name || ""}</p>
                  </>
                ) : (
                  <p className="side-muted">Payee details unavailable.</p>
                );
              })()}
            </>
          ) : null}
          <hr />
          <h2>PAYMENT HISTORY</h2>
          {historyLoading ? (
            <p className="side-muted">Loading history...</p>
          ) : paymentHistory.length ? (
            paymentHistory.slice(0, 5).map((payment) => (
              <div className="effect-row" key={payment.id}>
                <span>
                  {payment.payment_date}
                  <br />
                  {payment.payment_type}
                </span>
                <strong>{formatMoney(payment.amount)}</strong>
              </div>
            ))
          ) : (
            <p className="side-muted">No previous payments.</p>
          )}
          <hr />
          <h2>ACCOUNTING EFFECT</h2>
          <div className="effect-row">
            <span>Bank / cash</span>
            <strong>-{formatMoney(amount)}</strong>
          </div>
          <div className="effect-row">
            <span>Expense splits</span>
            <strong>+{formatMoney(amount)}</strong>
          </div>
          <hr />
          <h2>NOTES</h2>
          <p className="side-muted">
            Saved transaction notes will appear here.
          </p>
        </aside>
      </div>
      {status ? <div className="cheque-toast">{status}</div> : null}
    </main>
  );
}

export default WriteCheque;
