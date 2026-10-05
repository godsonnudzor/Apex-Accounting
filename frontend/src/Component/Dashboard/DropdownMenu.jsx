import { useState, useRef, useEffect, useId } from "react";
import "../../App.css";

const MENU = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "File",
    items: [
      { label: "Chart of Account", href: "/chart-of-accounts" },
      { label: "Journal Entries", href: "/journal-entries" },
      { label: "Account Creation", href: "/account-creation" },
    ],
  },
  {
    label: "Suppliers",
    items: [
      { label: "Center", href: "/suppliersCenter" },
      { label: "Creation", href: "/suppliers" },
      { label: "Bills", href: "/bills" },
      { label: "Aging", href: "/suppliersAging" },
    ],
  },
   {
    label: "Customers",
    items: [
      { label: "Center", href: "/customersCenter" },
      { label: "Customer Creation", href: "/customers" },
      { label: "Invoices", href: "/invoices" },
      { label: "Aging List", href: "/customerAging" },
    ],
  },
   {
    label: "Banking",
    items: [
      { label: "Write Cheque", href: "/write-cheque" },
      { label: "Contra Entries", href: "/contra-entries" },
      { label: "Reconcile", href: "/reconcile" },
    ],
  },
  {
    label: "Employees",
    items: [
      { label: "Employees Center", href: "/EmployeeDashboard" },
      { label: "Payroll", href: "/PayrollDashboard" },
      { label: "Tax Table Info", href: "/tax-analyzer" },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Profit & loss", href: "/financial-reports" },
      { label: "Balance sheet", href: "/reports/bs" },
      { label: "Cash flow", href: "/reports/cf" },
      { label: "Budget Analysis", href: "/reports/budget" },
      { label: "Asset Register", href: "/reports/asset-register" },
      { label: "Audit Trail", href: "/reports/audit-trail" },
      { label: "Account List", href: "/reports/account-list" },
     
    ],
  },
  { label: "Settings", href: "/settings" },
];

function Arrow({ open }) {
  return (
    <svg
      className={`dd-arrow${open ? " is-open" : ""}`}
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
    >
      <path
        d="M2 4.5 6 8.5 10 4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Dropdown({ label, items, open, onToggle, onClose }) {
  const id = useId();
  const btnRef = useRef(null);
  const listRef = useRef(null);



  const onButtonKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) onToggle();
      setTimeout(() => focusItem(0), 0);
    }
  };

  const onListKey = (e) => {
    const links = [...listRef.current.querySelectorAll("a")];
    const i = links.indexOf(document.activeElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      focusItem(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusItem(i - 1);
    } else if (e.key === "Escape") {
      onClose();
      btnRef.current?.focus();
    } else if (e.key === "Tab") {
      onClose();
    }
  };

  return (
    <li className="dd-item">
      <button
        ref={btnRef}
        type="button"
        className="dd-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        onKeyDown={onButtonKey}
      >
        {label}
        <Arrow open={open} />
      </button>
      {open && (
        <ul id={id} ref={listRef} className="dd-panel" onKeyDown={onListKey}>
          {items.map((it) => (
            <li key={it.href}>
              {it.href === "/customers" ? (
                <Link to={it.href} onClick={onClose}>
                  {it.label}
                </Link>
              ) : (
                <a href={it.href} onClick={onClose}>
                  {it.label}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default function DropdownMenu({ menu = MENU }) {
  const [openIndex, setOpenIndex] = useState(null);
  const navRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) {
        setOpenIndex(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <nav ref={navRef} className="dd-nav" aria-label="Main">
      <ul className="dd-list">
        {menu.map((m, i) =>
          m.items ? (
            <Dropdown
              key={m.label}
              label={m.label}
              items={m.items}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? null : i)}
              onClose={() => setOpenIndex(null)}
            />
          ) : (
            <li key={m.label} className="dd-item">
              <a className="dd-trigger" href={m.href}>
                {m.label}
              </a>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}
