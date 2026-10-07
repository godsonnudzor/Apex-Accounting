import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../App.css";
import { getApiUrl, readApiResponse } from "../context/auth";

const today = new Date().toISOString().slice(0, 10);
const currency = "GHC";
const dateAfterDays = (date, days) => {
	const nextDate = new Date(`${date}T00:00:00Z`);
	nextDate.setUTCDate(nextDate.getUTCDate() + days);
	return nextDate.toISOString().slice(0, 10);
};
const initialBill = () => ({
	supplierId: "",
	date: today,
	reference: "",
	dueDate: dateAfterDays(today, 45),
	terms: "Net 45",
	taxRate: "0",
	discount: "0",
	memo: "",
	billReceived: true,
});

const newLine = () => ({ account: "", amount: "", memo: "" });

const money = (value) => `${currency} ${Number(value || 0).toFixed(2)}`;

function Bill() {
	const location = useLocation();
	const navigate = useNavigate();
	const [bill, setBill] = useState(() => ({
		...initialBill(),
		supplierId: String(location.state?.supplierId || ""),
	}));
	const [documentType, setDocumentType] = useState("bill");
	const [savedBillId, setSavedBillId] = useState(null);
	const [saving, setSaving] = useState(false);
	const [lines, setLines] = useState([newLine(), newLine(), newLine()]);
	const [suppliers, setSuppliers] = useState([]);
	const [accounts, setAccounts] = useState([]);
	const [lookupLoading, setLookupLoading] = useState(true);
	const [lookupError, setLookupError] = useState("");
	const [activePanel, setActivePanel] = useState("Name");
	const [status, setStatus] = useState("");

	useEffect(() => {
		const loadBillLookups = async () => {
			const [supplierResponse, accountResponse] = await Promise.all([
				fetch(getApiUrl("/api/suppliers"), { credentials: "include" }),
				fetch(getApiUrl("/api/ledger/accounts"), { credentials: "include" }),
			]);
			const [supplierResult, accountResult] = await Promise.all([
				readApiResponse(supplierResponse),
				readApiResponse(accountResponse),
			]);
			if (!supplierResponse.ok) throw new Error(supplierResult.message || "Unable to load suppliers");
			if (!accountResponse.ok) throw new Error(accountResult.message || "Unable to load ledger accounts");
			setSuppliers(supplierResult.suppliers || []);
			setAccounts(accountResult.accounts || []);
		};

		loadBillLookups()
			.catch((loadError) => setLookupError(loadError.message))
			.finally(() => setLookupLoading(false));
	}, []);

	const subtotal = useMemo(
		() => lines.reduce((sum, line) => sum + Number(line.amount || 0), 0),
		[lines],
	);
	const discount = Math.min(subtotal, Number(bill.discount || 0));
	const taxable = subtotal - discount;
	const tax = taxable * (Number(bill.taxRate || 0) / 100);
	const total = taxable + tax;
	const selectedSupplier = suppliers.find((supplier) => String(supplier.id) === String(bill.supplierId));

	const updateBill = (event) => {
		const { name, value, type, checked } = event.target;
		setBill((current) => ({
			...current,
			[name]: type === "checkbox" ? checked : value,
		}));
	};

	const selectSupplier = (event) => {
		const supplierId = event.target.value;
		const supplier = suppliers.find((item) => String(item.id) === String(supplierId));
		const previousSupplier = suppliers.find((item) => String(item.id) === String(bill.supplierId));
		setBill((current) => ({
			...current,
			supplierId,
			terms: supplier?.payment_terms || current.terms,
		}));

		const prefilledAccountIds = [
			supplier?.expense_account_1_id,
			supplier?.expense_account_2_id,
			supplier?.expense_account_3_id,
		];
		setLines((current) => {
			const next = [...current];
			const requiredLines = prefilledAccountIds.reduce((count, accountId, index) => (
				accountId == null ? count : index + 1
			), 0);
			while (next.length < requiredLines) next.push(newLine());
			const previousPrefilledIds = [
				previousSupplier?.expense_account_1_id,
				previousSupplier?.expense_account_2_id,
				previousSupplier?.expense_account_3_id,
			];
			previousPrefilledIds.forEach((accountId, index) => {
				const account = accounts.find((item) => String(item.id) === String(accountId));
				if (account && next[index]?.account === String(account.id)) {
					next[index] = { ...next[index], account: "" };
				}
			});
			prefilledAccountIds.forEach((accountId, index) => {
				if (accountId == null) return;
				const account = accounts.find((item) => String(item.id) === String(accountId));
				if (account && !next[index].account) {
					next[index] = { ...next[index], account: String(account.id) };
				}
			});
			return next;
		});
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
		setBill(initialBill());
		setDocumentType("bill");
		setSavedBillId(null);
		setLookupError("");
		setLines([newLine(), newLine(), newLine()]);
		notify("Bill cleared");
	};

	const saveBill = async (afterSave = "stay") => {
		if (savedBillId) {
			notify("This bill is already saved. Start a new bill to record another transaction.");
			return;
		}
		setSaving(true);
		setLookupError("");
		const enteredLines = lines.filter((line) => line.account || line.amount || line.memo);
		if (!bill.supplierId) {
			setLookupError("Select a supplier before saving this transaction.");
			setSaving(false);
			return;
		}
		if (!enteredLines.length || enteredLines.some((line) => !line.account || Number(line.amount) <= 0)) {
			setLookupError("Each bill line needs an expense account and an amount greater than zero.");
			setSaving(false);
			return;
		}

		try {
			const response = await fetch(getApiUrl("/api/supplier-bills"), {
				method: "POST",
				credentials: "include",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					supplierId: bill.supplierId,
					documentType,
					reference: bill.reference,
					billDate: bill.date,
					dueDate: bill.dueDate,
					paymentTerms: bill.terms,
					currency: selectedSupplier?.currency || "GHS",
					discountAmount: discount,
					taxAmount: tax,
					billReceived: bill.billReceived,
					memo: bill.memo,
					lines: enteredLines.map((line) => ({
						ledgerAccountId: line.account,
						amount: Number(line.amount),
						memo: line.memo,
					})),
				}),
			});
			const result = await readApiResponse(response);
			if (!response.ok) throw new Error(result.message || "Unable to save supplier transaction");
			setSavedBillId(result.bill.id);
			notify(`${documentType === "credit" ? "Credit" : "Bill"} saved to supplier transactions`);
			if (afterSave === "new") {
				const currentSupplierId = bill.supplierId;
				clearBill();
				setBill((current) => ({ ...current, supplierId: currentSupplierId }));
				notify("Transaction saved; ready for a new bill");
			}
			if (afterSave === "close") navigate("/suppliersCenter");
		} catch (saveError) {
			setLookupError(saveError.message);
		} finally {
			setSaving(false);
		}
	};

	return (
		<main className="bill-app">
			<header className="bill-toolbar">
				<div className="bill-tabs">
					<button className="bill-tab active">Main</button>
					<button className="bill-tab">Reports</button>
				</div>
				<div className="bill-tools">
					<button onClick={() => notify("Saved transactions are listed in Supplier Center")}>Find</button>
					<button onClick={clearBill}>New</button>
					<button onClick={() => saveBill()} disabled={saving || Boolean(savedBillId)}>{saving ? "Saving..." : savedBillId ? "Saved" : "Save"}</button>
					<button onClick={clearBill}>Delete</button>
					<button onClick={() => notify("Bill memorized")}>Memorise</button>
					<button onClick={() => window.print()}>Print</button>
					<button onClick={() => notify("Splits recalculated")}>Recalculate</button>
					<button onClick={() => notify("Payment workflow opened")}>Pay Bill</button>
				</div>
			</header>

			<div className="bill-switcher">
				<label><input type="radio" name="billType" checked={documentType === "bill"} onChange={() => setDocumentType("bill")} /> Bill</label>
				<label><input type="radio" name="billType" checked={documentType === "credit"} onChange={() => setDocumentType("credit")} /> Credit</label>
				<label className="received-check">
					<input name="billReceived" type="checkbox" checked={bill.billReceived} onChange={updateBill} /> Bill Received
				</label>
			</div>

			<div className="bill-layout">
				<section className="bill-sheet">
					<div className="bill-heading">
						<div>
							<Link className="bill-back" to="/suppliersCenter">Back to suppliers</Link>
							<h1>{documentType === "credit" ? "Supplier Credit" : "Bill"}</h1>
							<p>Record what your business owes and keep every split accounted for.</p>
						</div>
						<div className="bill-header-grid">
							<label>SUPPLIER
								<select name="supplierId" value={bill.supplierId} onChange={selectSupplier}>
									<option value="">{lookupLoading ? "Loading suppliers..." : "Select supplier"}</option>
									{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
								</select>
							</label>
							<label>DATE<input name="date" type="date" value={bill.date} onChange={updateBill} /></label>
							<label>REF. NO.<input name="reference" value={bill.reference} onChange={updateBill} placeholder="Optional" /></label>
							<label>BILL DUE<input name="dueDate" type="date" value={bill.dueDate} onChange={updateBill} /></label>
							<label className="bill-address">ADDRESS<textarea value={selectedSupplier ? `${selectedSupplier.name}\n${selectedSupplier.billed_from || selectedSupplier.address || "Supplier account on file"}` : ""} readOnly placeholder="Supplier address" /></label>
							<label>TERMS<select name="terms" value={bill.terms} onChange={updateBill}><option>Due on receipt</option><option>Net 15</option><option>Net 30</option><option>Net 45</option></select></label>
						</div>
					</div>

					<div className="bill-section-bar"><strong>Expenses</strong><span>{money(subtotal)}</span><strong>Items</strong><span>{money(total)}</span></div>
					<div className="bill-table" role="table" aria-label="Bill expense lines">
						<div className="bill-table-head" role="row"><span>ACCOUNT</span><span>AMOUNT ({currency})</span><span>MEMO</span><span aria-label="remove column" /></div>
						{lines.map((line, index) => (
							<div className="bill-table-row" role="row" key={index}>
								<select name="account" value={line.account} onChange={(event) => updateLine(index, event)} aria-label={`Account ${index + 1}`}>
									<option value="">{lookupLoading ? "Loading ledger accounts..." : "Choose account"}</option>{accounts.filter((account) => account.account_type === "expense").map((account) => <option key={account.id} value={account.id}>{account.code} - {account.name}</option>)}
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

					<div className="bill-footer-actions"><span>Exchange rate 1 GHC = <input defaultValue="1" aria-label="Exchange rate" /> GHC</span><div><button onClick={() => saveBill("close")} disabled={saving || Boolean(savedBillId)}>Save &amp; Close</button><button className="bill-primary" onClick={() => saveBill("new")} disabled={saving}>Save &amp; New</button><button onClick={clearBill}>Clear</button></div></div>
				</section>

				<aside className="bill-sidebar">
					<div className="bill-side-tabs"><button className={activePanel === "Name" ? "selected" : ""} onClick={() => setActivePanel("Name")}>Name</button><button className={activePanel === "Transaction" ? "selected" : ""} onClick={() => setActivePanel("Transaction")}>Transaction</button></div>
					{activePanel === "Name" ? <><div className="bill-side-block"><h2>SUMMARY</h2><p>{selectedSupplier?.name || "No supplier selected"}</p><strong>{money(total)}</strong><small>Due {bill.dueDate || "not set"}</small></div><div className="bill-side-block"><h2>TRANSACTION</h2><p>{savedBillId ? `Saved transaction #${savedBillId}` : "Not saved"}</p></div><div className="bill-side-block"><h2>NOTES</h2><p className="side-muted">{bill.memo || "No notes entered."}</p></div></> : <div className="bill-side-block"><h2>TRANSACTION DETAILS</h2><p className="side-muted">{savedBillId ? `Transaction #${savedBillId}` : "Save the bill to create transaction details."}</p></div>}
				</aside>
			</div>
			{lookupError ? <div className="bill-error" role="alert">{lookupError}</div> : null}
			{status ? <div className="bill-toast">{status}</div> : null}
		</main>
	);
}

export default Bill;
