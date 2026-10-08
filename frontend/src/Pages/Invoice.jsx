import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { getApiUrl, readApiResponse } from "../context/auth";

const emptyLine = () => ({ quantity: 1, item: "", description: "", rate: 0, incomeAccountId: "" });
const today = () => new Date().toISOString().slice(0, 10);
const nextInvoiceNumber = () => `INV-${Date.now()}`;

function Invoice() {
  const location = useLocation();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState({
    customerId: String(location.state?.customerId || ""),
    taxDate: today(),
    invoiceNumber: nextInvoiceNumber(),
    account: "",
    template: "HJ Green Ent. Service...",
    exchangeRate: 1,
    message: "",
    memo: "",
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [customers, setCustomers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [lookupLoading, setLookupLoading] = useState(true);
  const [lookupError, setLookupError] = useState("");
  const [activePanel, setActivePanel] = useState("Name");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedInvoiceId, setSavedInvoiceId] = useState(null);

  useEffect(() => {
    const loadInvoiceLookups = async () => {
      const [customerResponse, accountResponse] = await Promise.all([
        fetch(getApiUrl("/api/customers"), { credentials: "include" }),
        fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }),
      ]);
      const [customerResult, accountResult] = await Promise.all([
        readApiResponse(customerResponse),
        readApiResponse(accountResponse),
      ]);

      if (!customerResponse.ok) {
        throw new Error(customerResult.message || "Unable to load customers");
      }
      if (!accountResponse.ok) {
        throw new Error(accountResult.message || "Unable to load ledger accounts");
      }

      setCustomers(customerResult.customers || []);
      setAccounts(accountResult.accounts || []);
      setInvoice((current) => ({
        ...current,
        account:
          current.account && (accountResult.accounts || []).some(
            (account) => String(account.id) === String(current.account),
          )
            ? current.account
            : String((accountResult.accounts || []).find((account) => account.account_type === "asset")?.id || ""),
      }));
    };

    loadInvoiceLookups()
      .catch((loadError) => setLookupError(loadError.message))
      .finally(() => setLookupLoading(false));
  }, []);

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.quantity || 0) * Number(line.rate || 0),
        0,
      ),
    [lines],
  );
  const selectedCustomer = customers.find((customer) => String(customer.id) === String(invoice.customerId));

  const updateInvoice = (event) => {
    const { name, value } = event.target;
    setInvoice((current) => ({ ...current, [name]: value }));
  };

  const updateLine = (index, event) => {
    const { name, value } = event.target;
    setLines((current) =>
      current.map((line, lineIndex) =>
        lineIndex === index ? { ...line, [name]: value } : line,
      ),
    );
  };

  const addLine = () => setLines((current) => [...current, emptyLine()]);
  const clearInvoice = () => {
    setInvoice((current) => ({
      ...current,
      customerId: "",
      invoiceNumber: nextInvoiceNumber(),
      taxDate: today(),
      message: "",
      memo: "",
    }));
    setLines([emptyLine()]);
    setSavedInvoiceId(null);
    setStatus("Invoice cleared");
  };
  const notify = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2400);
  };
  const saveInvoice = async (afterSave = "stay") => {
    if (savedInvoiceId) {
      if (afterSave === "close") {
        navigate("/customersCenter");
        return;
      }
      if (afterSave === "new") {
        setInvoice((current) => ({
          ...current,
          invoiceNumber: nextInvoiceNumber(),
          taxDate: today(),
          message: "",
          memo: "",
        }));
        setLines([emptyLine()]);
        setSavedInvoiceId(null);
        notify("New invoice started.");
        return;
      }
      notify("This invoice has already been saved. Start a new invoice to record another transaction.");
      return;
    }
    const enteredLines = lines.filter((line) => line.item || line.description || Number(line.rate) > 0 || line.incomeAccountId);
    if (!invoice.customerId) {
      setLookupError("Select a customer before saving this invoice.");
      return;
    }
    if (!invoice.account) {
      setLookupError("Select a receivable account before saving this invoice.");
      return;
    }
    if (!enteredLines.length || enteredLines.some((line) => (
      Number(line.quantity) <= 0
      || Number(line.rate) <= 0
      || !accounts.some((account) => String(account.id) === String(line.incomeAccountId)
        && account.account_type === "income")
    ))) {
      setLookupError("Each invoice line needs a quantity, rate, and income account.");
      return;
    }
    setSaving(true);
    setLookupError("");
    try {
      const response = await fetch(getApiUrl("/api/customer-invoices"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: invoice.customerId,
          invoiceNumber: invoice.invoiceNumber,
          invoiceDate: invoice.taxDate,
          receivableAccountId: invoice.account,
          currency: selectedCustomer?.currency || "GHS",
          exchangeRate: invoice.exchangeRate,
          customerMessage: invoice.message,
          memo: invoice.memo,
          lines: enteredLines.map((line) => ({
            quantity: Number(line.quantity),
            item: line.item,
            description: line.description,
            rate: Number(line.rate),
            incomeAccountId: line.incomeAccountId,
          })),
        }),
      });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || "Unable to save invoice");
      setSavedInvoiceId(result.invoice.id);
      notify(`Invoice ${result.invoice.invoice_number} saved`);
      if (afterSave === "new") {
        setInvoice((current) => ({
          ...current,
          invoiceNumber: nextInvoiceNumber(),
          taxDate: today(),
          message: "",
          memo: "",
        }));
        setLines([emptyLine()]);
        setSavedInvoiceId(null);
        notify("Invoice saved. New invoice started.");
      } else if (afterSave === "close") {
        navigate("/customersCenter");
      }
    } catch (saveError) {
      setLookupError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="invoice-app">
      <header className="invoice-toolbar">
        <div className="toolbar-tabs">
          <button className="toolbar-tab active">Main</button>
          <button className="toolbar-tab">Formatting</button>
          <button className="toolbar-tab">Send</button>
          <button className="toolbar-tab">Reports</button>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => notify("Find is ready")}>
            ↔ <span>Find</span>
          </button>
          <button onClick={() => notify("New invoice started")}>
            ▣ <span>New</span>
          </button>
          <button onClick={() => saveInvoice()} disabled={saving || Boolean(savedInvoiceId)}>
            ▤ <span>{saving ? "Saving..." : savedInvoiceId ? "Saved" : "Save"}</span>
          </button>
          <button onClick={clearInvoice}>
            × <span>Delete</span>
          </button>
          <button onClick={() => notify("Invoice memorized")}>
            ✦ <span>Memorise</span>
          </button>
          <button onClick={() => notify("Marked as pending")}>
            ◇{" "}
            <span>
              Mark As
              <br />
              Pending
            </span>
          </button>
          <button onClick={() => window.print()}>
            ▤ <span>Print</span>
          </button>
          <button onClick={() => notify("Email is ready")}>
            ✉ <span>Email</span>
          </button>
          <label className="toolbar-check">
            <input type="checkbox" /> Print Later
          </label>
          <label className="toolbar-check">
            <input type="checkbox" /> Email Later
          </label>
          <button onClick={addLine}>
            ＋ <span>Add Time/Costs</span>
          </button>
          <button className="disabled-command">
            ♧ <span>Apply Credits</span>
          </button>
          <button onClick={() => notify("Receive payment is ready")}>
            ▣{" "}
            <span>
              Receive
              <br />
              Payments
            </span>
          </button>
        </div>
      </header>

      <div className="invoice-lookup">
        <label>CUSTOMER:</label>
        <select
          name="customerId"
          value={invoice.customerId}
          onChange={updateInvoice}
          aria-label="Customer"
        >
          <option value="">{lookupLoading ? "Loading customers..." : "Select customer"}</option>
          {customers.map((customer) => (
            <option key={customer.id} value={customer.id}>
              {customer.name}
            </option>
          ))}
        </select>
        <label>RECEIVABLE ACCOUNT</label>
        <select
          name="account"
          value={invoice.account}
          onChange={updateInvoice}
          aria-label="Receivable account"
        >
          <option value="">{lookupLoading ? "Loading ledger accounts..." : "Select ledger account"}</option>
          {accounts.filter((account) => account.account_type === "asset").map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} - {account.name}
            </option>
          ))}
        </select>
        <label>TEMPLATE</label>
        <select
          name="template"
          value={invoice.template}
          onChange={updateInvoice}
          aria-label="Template"
        >
          <option>HJ Green Ent. Service...</option>
          <option>Standard Invoice</option>
          <option>Professional Services</option>
        </select>
      </div>

      {lookupError ? <div className="invoice-error" role="alert">{lookupError}</div> : null}

      <div className="invoice-body">
        <section className="invoice-sheet">
          <div className="invoice-heading">
            <Link className="back-link" to="/dashboard">
              ← Dashboard
            </Link>
            <h1>Invoice</h1>
            <div className="invoice-meta">
              <label>
                TAX DATE
                <input
                  type="date"
                  name="taxDate"
                  value={invoice.taxDate}
                  onChange={updateInvoice}
                />
              </label>
              <label>
                INVOICE NO.
                <input
                  name="invoiceNumber"
                  value={invoice.invoiceNumber}
                  onChange={updateInvoice}
                />
              </label>
              <label className="invoice-to">
                INVOICE TO
                <textarea
                  name="customer"
                  value={selectedCustomer ? `${selectedCustomer.name}\n${selectedCustomer.invoice_address || selectedCustomer.address || "Customer account on file"}` : ""}
                  readOnly
                />
              </label>
            </div>
          </div>

          <div
            className="line-items"
            role="table"
            aria-label="Invoice line items"
          >
            <p className="side-empty">Choose an income account for each line; saved invoice revenue is posted to Profit &amp; Loss.</p>
            <div className="line-header" role="row">
              <span>INCOME ACCOUNT</span>
              <span>QTY</span>
              <span>ITEM</span>
              <span>DESCRIPTION</span>
              <span>RATE</span>
              <span>AMOUNT</span>
            </div>
            {lines.map((line, index) => (
              <div className="line-row" role="row" key={index}>
                <select
                  aria-label={`Income account ${index + 1}`}
                  name="incomeAccountId"
                  value={line.incomeAccountId}
                  onChange={(event) => updateLine(index, event)}
                >
                  <option value="">{lookupLoading ? "Loading income accounts..." : "Select income account"}</option>
                  {accounts.filter((account) => account.account_type === "income").map((account) => (
                    <option key={account.id} value={account.id}>{account.code} - {account.name}</option>
                  ))}
                </select>
                <input
                  aria-label={`Quantity ${index + 1}`}
                  name="quantity"
                  type="number"
                  min="0"
                  value={line.quantity}
                  onChange={(event) => updateLine(index, event)}
                />
                <input
                  aria-label={`Item ${index + 1}`}
                  name="item"
                  value={line.item}
                  onChange={(event) => updateLine(index, event)}
                />
                <input
                  aria-label={`Description ${index + 1}`}
                  name="description"
                  value={line.description}
                  onChange={(event) => updateLine(index, event)}
                />
                <input
                  aria-label={`Rate ${index + 1}`}
                  name="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.rate}
                  onChange={(event) => updateLine(index, event)}
                />
                <output>
                  {(
                    Number(line.quantity || 0) * Number(line.rate || 0)
                  ).toFixed(2)}
                </output>
              </div>
            ))}
          </div>
          <button className="add-line" onClick={addLine}>
            ＋ Add line
          </button>

          <div className="exchange-row">
            <label>EXCHANGE RATE 1 GHC =</label>
            <input
              name="exchangeRate"
              type="number"
              min="0"
              step="0.01"
              value={invoice.exchangeRate}
              onChange={updateInvoice}
            />
            <span>GHC</span>
          </div>
          <div className="invoice-footer-fields">
            <label>
              CUSTOMER MESSAGE
              <select
                name="message"
                value={invoice.message}
                onChange={updateInvoice}
              >
                <option value="">Select message</option>
                <option>Thank you for your business.</option>
                <option>Payment is due within 30 days.</option>
              </select>
            </label>
            <label>
              MEMO
              <input
                name="memo"
                value={invoice.memo}
                onChange={updateInvoice}
              />
            </label>
          </div>
          <div className="invoice-actions">
            <button
              className="save-close"
              onClick={() => saveInvoice("close")}
              disabled={saving}
            >
              Save &amp; Close
            </button>
            <button
              className="save-new"
              onClick={() => saveInvoice("new")}
              disabled={saving}
            >
              Save &amp; New
            </button>
            <button onClick={clearInvoice}>Clear</button>
          </div>
        </section>

        <aside className="invoice-sidebar">
          <div className="side-tabs">
            <button
              className={activePanel === "Name" ? "selected" : ""}
              onClick={() => setActivePanel("Name")}
            >
              Name
            </button>
            <button
              className={activePanel === "Transaction" ? "selected" : ""}
              onClick={() => setActivePanel("Transaction")}
            >
              Transaction
            </button>
          </div>
          {activePanel === "Name" ? (
            <>
              <h2>SUMMARY</h2>
              <h2>RECENT TRANSACTIONS</h2>
              <h2>NOTES</h2>
            </>
          ) : (
            <>
              <h2>TRANSACTION DETAILS</h2>
              <p className="side-empty">No transaction details yet.</p>
            </>
          )}
        </aside>
      </div>
      <div className="invoice-totals">
        <span>
          TOTAL
          <br />
          <b>PAYMENTS APPLIED</b>
          <br />
          <strong>BALANCE DUE</strong>
        </span>
        <span>
          GHC
          <br />
          GHC
          <br />
          <strong>GHC</strong>
        </span>
        <strong>
          {total.toFixed(2)}
          <br />
          0.00
        </strong>
      </div>
      {status ? <div className="invoice-toast">{status}</div> : null}
    </main>
  );
}

export default Invoice;
