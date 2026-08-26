import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const today = "2026-08-26";
const formatMoney = (value) => `GHC ${Number(value || 0).toFixed(2)}`;
const emptySplit = () => ({ account: "", amount: "", memo: "" });

const numberWords = (amount) => {
	const units = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
	const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
	const underThousand = (value) => {
		if (value < 20) return units[value];
		if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? `-${units[value % 10]}` : ""}`;
		return `${units[Math.floor(value / 100)]} hundred${value % 100 ? ` and ${underThousand(value % 100)}` : ""}`;
	};
	const whole = Math.floor(Number(amount) || 0);
	const cents = Math.round(((Number(amount) || 0) - whole) * 100);
	if (whole === 0 && cents === 0) return "Zero Ghana cedis";
	const words = whole >= 1000 ? `${underThousand(Math.floor(whole / 1000))} thousand${whole % 1000 ? ` ${underThousand(whole % 1000)}` : ""}` : underThousand(whole);
	return `${words} Ghana cedis${cents ? ` and ${underThousand(cents)} pesewas` : ""}`;
};

function WriteCheque() {
	const [transaction, setTransaction] = useState({
		type: "cheque",
		bank: "JV CshBks:Cash:PC - Godson",
		currency: "GHC",
		number: "",
		date: today,
		payee: "",
		address: "",
		memo: "",
		printLater: false,
	});
	const [splits, setSplits] = useState([emptySplit(), emptySplit(), emptySplit()]);
	const [status, setStatus] = useState("");
	const amount = useMemo(() => splits.reduce((sum, split) => sum + Number(split.amount || 0), 0), [splits]);

	const updateTransaction = (event) => {
		const { name, value, type, checked } = event.target;
		setTransaction((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
	};
	const updateSplit = (index, event) => {
		const { name, value } = event.target;
		setSplits((current) => current.map((split, splitIndex) => splitIndex === index ? { ...split, [name]: value } : split));
	};
	const notify = (message) => {
		setStatus(message);
		window.setTimeout(() => setStatus(""), 2400);
	};
	const clearTransaction = () => {
		setTransaction((current) => ({ ...current, number: "", payee: "", address: "", memo: "" }));
		setSplits([emptySplit(), emptySplit(), emptySplit()]);
		notify("Transaction cleared");
	};
	const save = (next = false) => {
		if (!transaction.payee || amount <= 0 || splits.some((split) => split.amount && !split.account)) {
			notify("Add a payee, account splits, and an amount first");
			return;
		}
		notify(next ? "Transaction saved. New cheque started" : "Transaction saved");
	};

	return (
		<main className="cheque-app">
			<header className="cheque-toolbar">
				<div className="cheque-tabs"><button className="cheque-tab active">Main</button><button className="cheque-tab">Reports</button></div>
				<div className="cheque-tools">
					<button onClick={() => notify("Ready to find a transaction")}>Find</button><button onClick={clearTransaction}>New</button><button onClick={() => save()}>Save</button><button onClick={clearTransaction}>Delete</button><button onClick={() => notify("Transaction memorized")}>Memorise</button><button onClick={() => window.print()}>Print</button><button onClick={() => notify("Splits recalculated")}>Recalculate</button><button onClick={() => notify("Cheque ordering opened")}>Order Cheques</button>
				</div>
			</header>
			<div className="cheque-switcher">
				<label><input type="radio" name="transactionType" value="cheque" checked={transaction.type === "cheque"} onChange={updateTransaction} /> Cheque</label>
				<label><input type="radio" name="transactionType" value="cash" checked={transaction.type === "cash"} onChange={updateTransaction} /> Cash</label>
				<label className="cheque-later"><input name="printLater" type="checkbox" checked={transaction.printLater} onChange={updateTransaction} /> Print Later</label>
			</div>
			<div className="cheque-account-bar"><label>BANK ACCOUNT<select name="bank" value={transaction.bank} onChange={updateTransaction}><option>JV CshBks:Cash:PC - Godson</option><option>Ecobank Current Account</option><option>Petty Cash</option></select></label><span>ENDING BALANCE <strong>{formatMoney(474 - amount)}</strong></span></div>

			<div className="cheque-layout">
				<section className="cheque-sheet">
					<div className="cheque-paper">
						<div className="cheque-paper-title"><Link to="/dashboard">Back to dashboard</Link><h1>{transaction.type === "cheque" ? "Write Cheque" : "Cash Payment"}</h1></div>
						<div className="cheque-meta"><label>NO. <input name="number" value={transaction.number} onChange={updateTransaction} placeholder="To print" /></label><label>DATE <input name="date" type="date" value={transaction.date} onChange={updateTransaction} /></label><label>AMOUNT <output>{formatMoney(amount)}</output></label></div>
						<label className="payee-field">PAY TO THE ORDER OF<select name="payee" value={transaction.payee} onChange={updateTransaction}><option value="">Select payee</option><option>Northstar Studio</option><option>Apex Office Supply</option><option>Figma Professional</option><option>Marlow &amp; Co.</option></select></label>
						<label className="address-field">ADDRESS<textarea name="address" value={transaction.address} onChange={updateTransaction} placeholder="Payee address" /></label>
						<label className="cheque-memo">MEMO<input name="memo" value={transaction.memo} onChange={updateTransaction} placeholder="Purpose of payment" /></label>
						<div className="amount-words"><span>AMOUNT IN WORDS</span><strong>{numberWords(amount)}</strong></div>
					</div>

					<div className="cheque-section-bar"><strong>Expenses</strong><span>{formatMoney(amount)}</span><strong>Items</strong><span>{formatMoney(amount)}</span></div>
					<div className="cheque-table" role="table" aria-label="Cheque expense splits"><div className="cheque-table-head"><span>ACCOUNT</span><span>AMOUNT (GHC)</span><span>MEMO</span><span /></div>
						{splits.map((split, index) => <div className="cheque-table-row" key={index}><select name="account" value={split.account} onChange={(event) => updateSplit(index, event)} aria-label={`Account ${index + 1}`}><option value="">Choose account</option><option>Office supplies</option><option>Software subscriptions</option><option>Professional fees</option><option>Utilities</option><option>Travel and meals</option></select><input name="amount" type="number" min="0" step="0.01" value={split.amount} onChange={(event) => updateSplit(index, event)} aria-label={`Amount ${index + 1}`} placeholder="0.00" /><input name="memo" value={split.memo} onChange={(event) => updateSplit(index, event)} aria-label={`Memo ${index + 1}`} /><button aria-label={`Remove split ${index + 1}`} onClick={() => setSplits((current) => current.filter((_, splitIndex) => splitIndex !== index))}>x</button></div>)}
					</div>
					<button className="cheque-add-line" onClick={() => setSplits((current) => [...current, emptySplit()])}>+ Add split</button>
					<div className="journal-check"><span>Journal status</span><strong className={amount > 0 && !splits.some((split) => split.amount && !split.account) ? "balanced" : "pending"}>{amount > 0 && !splits.some((split) => split.amount && !split.account) ? "Ready to post" : "Needs account and amount"}</strong><span>Credit bank {formatMoney(amount)} | Debit expenses {formatMoney(amount)}</span></div>
					<div className="cheque-footer"><span>Exchange rate 1 GHC = <input defaultValue="1" aria-label="Exchange rate" /> GHC</span><div><button onClick={() => save()}>Save &amp; Close</button><button className="cheque-primary" onClick={() => save(true)}>Save &amp; New</button><button onClick={clearTransaction}>Clear</button></div></div>
				</section>
				<aside className="cheque-sidebar"><h2>TRANSACTION SUMMARY</h2><div className="cheque-side-total">{formatMoney(amount)}</div><p>{transaction.payee || "No payee selected"}</p><p>{transaction.type === "cheque" ? "Cheque payment" : "Cash payment"}</p><hr /><h2>ACCOUNTING EFFECT</h2><div className="effect-row"><span>Bank / cash</span><strong>-{formatMoney(amount)}</strong></div><div className="effect-row"><span>Expense splits</span><strong>+{formatMoney(amount)}</strong></div><hr /><h2>NOTES</h2><p className="side-muted">Saved transaction notes will appear here.</p></aside>
			</div>
			{status ? <div className="cheque-toast">{status}</div> : null}
		</main>
	);
}

export default WriteCheque;
