import { useState, useRef, useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/auth";
import "../../App.css";

const MENU = [
  { label: "Dashboard", href: "/EmployeeDashboard", permissions: ["dashboard"] },
  {
    label: "File",
    items: [
      { label: "Chart of Account", href: "/chart-of-accounts", permissions: ["writeCheque"] },
      { label: "Journal Entries", href: "/journal", permissions: ["writeCheque"] },
      { label: "Group Accounts", href: "/GroupAccount", permissions: ["groupAccount"] },
    ],
  },
  {
    label: "Suppliers",
    items: [
      { label: "Center", href: "/suppliersCenter", permissions: ["writeCheque", "bills", "invoice"] },
      { label: "Creation", href: "/suppliers", permissions: ["writeCheque", "bills", "invoice"] },
      { label: "Bills", href: "/bill", permissions: ["bills"] },
      { label: "Supplier Aging", href: "/suppliers/aging", permissions: ["bills", "writeCheque"] },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Center", href: "/customersCenter", permissions: ["invoice", "bills"] },
      { label: "Customer Creation", href: "/customers", permissions: ["invoice", "bills"] },
      { label: "Invoices", href: "/invoices", permissions: ["invoice", "bills"] },
      { label: "Customer Aging", href: "/customers/aging", permissions: ["invoice", "bills"] },
    ],
  },
  {
    label: "Banking",
    items: [
      { label: "Write Cheque", href: "/write-cheque", permissions: ["writeCheque"] },
    ],
  },
  {
    label: "Employees",
    items: [
      { label: "Employees Center", href: "/EmployeeDashboard", permissions: ["dashboard"] },
      { label: "Departments", href: "/department", permissions: ["departments"] },
      { label: "Employee records", href: "/employees", permissions: ["employeeManagement"] },
      { label: "Payroll", href: "/PayrollDashboard", permissions: ["payroll"] },
      { label: "Salaries", href: "/salary", permissions: ["salaries"] },
      { label: "Leave", href: "/leaveManagement", permissions: ["leaveManagement"] },
      { label: "Tax analyzer", href: "/tax-analyzer", permissions: ["taxJurisdictions", "userScenarios"] },
      { label: "Tax brackets", href: "/tax-analyzer/brackets", permissions: ["taxBrackets"] },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Profit & Loss", href: "/financial-reports/profit-loss", permissions: ["reports", "writeCheque"] },
      { label: "Balance Sheet", href: "/financial-reports/balance-sheet", permissions: ["reports", "writeCheque"] },
    ],
  },
  { label: "Settings", href: "/settings", adminOnly: true },
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

  const focusItem = (index) => {
    const links = [...(listRef.current?.querySelectorAll("a") || [])];
    if (!links.length) return;
    links[(index + links.length) % links.length].focus();
  };

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
              <Link to={it.href} onClick={onClose}>
                {it.label}
              </Link>
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
  const { user, hasPermission } = useAuth();
  const isAdmin = String(user?.role).toLowerCase() === "admin";
  const visibleMenu = menu.flatMap((entry) => {
    if (entry.adminOnly && !isAdmin) return [];
    if (entry.permissions && !entry.permissions.some(hasPermission)) return [];
    if (!entry.items) return [entry];
    const items = entry.items.filter(({ permissions }) =>
      permissions.some(hasPermission),
    );
    return items.length ? [{ ...entry, items }] : [];
  });

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
        {visibleMenu.map((m, i) =>
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
              <Link className="dd-trigger" to={m.href}>
                {m.label}
              </Link>
            </li>
          )
        )}
      </ul>
    </nav>
  );
}
