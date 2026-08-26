import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const today = "2026-08-26";
const currency = "GHC";

const newLine = () => ({ account: "", amount: "", memo: "" });

const money = (value) => `${currency} ${Number(value || 0).toFixed(2)}`;

function Bill() {
	const [bill, setBill] = useState({
		supplier: "",
		date: today,
		reference: "",
		dueDate: "2026-10-10",
		terms: "Net 45",
		taxRate: "0",
		discount: "0",
		memo: "",
		billReceived: true,
	});
	const [lines, setLines] = useState([newLine(), newLine(), newLine()]);
	const [activePanel, setActivePanel] = useState("Name");
	const [status, setStatus] = useState("");

	const subtotal = useMemo(
		() => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
		[lines],
	);
	const discount = Math.min(subtotal, Number(bill.discount || 0));
	const taxable = subtotal - discount;
	const tax = taxable * (Number(bill.taxRate || 0) / 100);
	const total = taxable + tax;

	const updateBill = (event) => {
		const { name, value, type, checked } = event.target;
		setBill((current) => ({
			...current,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const updateLine = (index, event) => {
		const { name, value } = event.target;
		setLines((current) =>
			current.map((line, lineIndex) =>
				lineIndex === index ? { ...line, [name]: value } : line,
			),
		);
	};

	const notify = (message) => {
		setStatus(message);
		window.setTimeout(() => setStatus(""), 2400);
	};

	const clearBill = () => {
		setBill((current) => ({ ...current, supplier: "", reference: "", memo: "" }));
		setLines([newLine(), newLine(), newLine()]);
		notify("Bill cleared");
	};

	return (
		<main className="bill-app">
			<header className="bill-toolbar">
				<div className="bill-tabs">
					<button className="bill-tab active">Main</button>
					<button className="bill-tab">Reports</button>
				</div>
				<div className="bill-tools">
					<button onClick={() => notify("Ready to find a bill")}>Find</button>
					<button onClick={clearBill}>New</button>
					<button onClick={() => notify("Bill saved")}>Save</button>
					<button onClick={clearBill}>Delete</button>
					<button onClick={() => notify("Bill memorized")}>Memorise</button>
					<button onClick={() => window.print()}>Print</button>
					<button onClick={() => notify("Splits recalculated")}>Recalculate</button>
					<button onClick={() => notify("Payment workflow opened")}>Pay Bill</button>
				</div>
			</header>

			<div className="bill-switcher">
				<label><input type="radio" name="billType" defaultChecked /> Bill</label>
				<label><input type="radio" name="billType" /> Credit</label>
				<label className="received-check">
					<input name="billReceived" type="checkbox" checked={bill.billReceived} onChange={updateBill} /> Bill Received
				</label>
			</div>

			<div className="bill-layout">
				<section className="bill-sheet">
					<div className="bill-heading">
						<div>
							<Link className="bill-back" to="/dashboard">Back to dashboard</Link>
							<h1>Bill</h1>
							<p>Record what your business owes and keep every split accounted for.</p>
						</div>
						<div className="bill-header-grid">
							<label>SUPPLIER
								<select name="supplier" value={bill.supplier} onChange={updateBill}>
									<option value="">Select supplier</option>
									<option>Northstar Studio</option>
									<option>Apex Office Supply</option>
									<option>Figma Professional</option>
								</select>
							</label>
							<label>DATE<input name="date" type="date" value={bill.date} onChange={updateBill} /></label>
							<label>REF. NO.<input name="reference" value={bill.reference} onChange={updateBill} placeholder="Optional" /></label>
							<label>BILL DUE<input name="dueDate" type="date" value={bill.dueDate} onChange={updateBill} /></label>
							<label className="bill-address">ADDRESS<textarea value={bill.supplier ? `${bill.supplier}\nSupplier account on file` : ""} readOnly placeholder="Supplier address" /></label>
							<label>TERMS<select name="terms" value={bill.terms} onChange={updateBill}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
						</div>
					</div>

					<div className="bill-section-bar"><strong>Expenses</strong><span>{money(subtotal)}</span><strong>Items</strong><span>{money(total)}</span></div>
					<div className="bill-table" role="table" aria-label="Bill expense lines">
						<div className="bill-table-head" role="row"><span>ACCOUNT</span><span>AMOUNT ({currency})</span><span>MEMO</span><span aria-label="remove column" /></div>
						{lines.map((line, index) => (
							<div className="bill-table-row" role="row" key={index}>
								<select name="account" value={line.account} onChange={(event) => updateLine(index, event)} aria-label={`Account ${index + 1}`}>
									<option value="">Choose account</option><option>Office supplies</option><option>Software subscriptions</option><option>Professional fees</option><option>Utilities</option><option>Travel and meals</option>
								</select>
								<input name="amount" type="number" min="0" step="0.01" value={line.amount} onChange={(event) => updateLine(index, event)} aria-label={`Amount ${index + 1}`} placeholder="0.00" />
								<input name="memo" value={line.memo} onChange={(event) => updateLine(index, event)} aria-label={`Memo ${index + 1}`} />
								<button aria-label={`Remove line ${index + 1}`} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>x</button>
							</div>
						))}
					</div>
					<button className="bill-add-line" onClick={() => setLines((current) => [...current, newLine()])}>+ Add expense line</button>

					<div className="bill-bottom-grid">
						<label>MEMO<input name="memo" value={bill.memo} onChange={updateBill} placeholder="Internal note" /></label>
						<div className="bill-summary">
							<div><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
							<div><span>Discount</span><label><input name="discount" type="number" min="0" step="0.01" value={bill.discount} onChange={updateBill} /> {currency}</label></div>
							<div><span>Tax</span><label><input name="taxRate" type="number" min="0" step="0.1" value={bill.taxRate} onChange={updateBill} /> % <strong>{money(tax)}</strong></label></div>
							<div className="bill-total"><span>Total bill</span><strong>{money(total)}</strong></div>
						</div>
					</div>

					<div className="bill-footer-actions"><span>Exchange rate 1 GHC = <input defaultValue="1" aria-label="Exchange rate" /> GHC</span><div><button onClick={() => notify("Bill saved and closed")}>Save &amp; Close</button><button className="bill-primary" onClick={() => notify("Bill saved. New bill started")}>Save &amp; New</button><button onClick={clearBill}>Clear</button></div></div>
				</section>

				<aside className="bill-sidebar">
					<div className="bill-side-tabs"><button className={activePanel === "Name" ? "selected" : ""} onClick={() => setActivePanel("Name")}>Name</button><button className={activePanel === "Transaction" ? "selected" : ""} onClick={() => setActivePanel("Transaction")}>Transaction</button></div>
					{activePanel === "Name" ? <><div className="bill-side-block"><h2>SUMMARY</h2><p>{bill.supplier || "No supplier selected"}</p><strong>{money(total)}</strong><small>Due {bill.dueDate || "not set"}</small></div><div className="bill-side-block"><h2>RECENT TRANSACTIONS</h2><p>Office supplies <span>{money(1280)}</span></p><p>Software subscription <span>{money(240)}</span></p></div><div className="bill-side-block"><h2>NOTES</h2><p className="side-muted">Notes about this bill will appear here.</p></div></> : <div className="bill-side-block"><h2>TRANSACTION DETAILS</h2><p className="side-muted">Save the bill to create transaction details.</p></div>}
				</aside>
			</div>
			{status ? <div className="bill-toast">{status}</div> : null}
		</main>
	);
}

export default Bill;
