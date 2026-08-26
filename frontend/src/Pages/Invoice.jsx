import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const emptyLine = () => ({ quantity: 1, item: "", description: "", rate: 0 });

function Invoice() {
  const [invoice, setInvoice] = useState({
    customer: "",
    taxDate: "2026-08-25",
    invoiceNumber: "24-063004",
    account: "Account Receivable:Trade",
    template: "HJ Green Ent. Service...",
    exchangeRate: 1,
    message: "",
    memo: "",
  });
  const [lines, setLines] = useState([emptyLine()]);
  const [activePanel, setActivePanel] = useState("Name");
  const [status, setStatus] = useState("");

  const total = useMemo(
    () =>
      lines.reduce(
        (sum, line) =>
          sum + Number(line.quantity || 0) * Number(line.rate || 0),
        0,
      ),
    [lines],
  );

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
      customer: "",
      message: "",
      memo: "",
    }));
    setLines([emptyLine()]);
    setStatus("Invoice cleared");
  };
  const notify = (message) => {
    setStatus(message);
    window.setTimeout(() => setStatus(""), 2400);
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
          <button onClick={() => notify("Invoice saved")}>
            ▤ <span>Save</span>
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
          name="customer"
          value={invoice.customer}
          onChange={updateInvoice}
          aria-label="Customer"
        >
          <option value="">Select customer</option>
          <option>Northstar Studio</option>
          <option>Marlow &amp; Co.</option>
          <option>Apex Office Supply</option>
        </select>
        <label>ACCOUN...</label>
        <select
          name="account"
          value={invoice.account}
          onChange={updateInvoice}
          aria-label="Account"
        >
          <option>Account Receivable:Trade</option>
          <option>Sales Income</option>
          <option>Services Income</option>
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
                  value={invoice.customer}
                  onChange={updateInvoice}
                />
              </label>
            </div>
          </div>

          <div
            className="line-items"
            role="table"
            aria-label="Invoice line items"
          >
            <div className="line-header" role="row">
              <span>QTY</span>
              <span>ITEM</span>
              <span>DESCRIPTION</span>
              <span>RATE</span>
              <span>AMOUNT</span>
            </div>
            {lines.map((line, index) => (
              <div className="line-row" role="row" key={index}>
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
              onClick={() => notify("Invoice saved")}
            >
              Save &amp; Close
            </button>
            <button
              className="save-new"
              onClick={() => notify("Invoice saved. New invoice started")}
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
