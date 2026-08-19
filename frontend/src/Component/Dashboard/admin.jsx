import { useState } from "react";
import "../../App.css";

const metrics = [
  {
    label: "Cash flow",
    value: "$84,260",
    change: "+12.8%",
    note: "vs. last month",
    icon: "↗",
    tone: "green",
  },
  {
    label: "Net profit margin",
    value: "24.6%",
    change: "+3.2%",
    note: "vs. last month",
    icon: "◒",
    tone: "blue",
  },
  {
    label: "Accounts receivable",
    value: "$126,480",
    change: "+8.4%",
    note: "outstanding",
    icon: "◎",
    tone: "amber",
  },
  {
    label: "Accounts payable",
    value: "$48,920",
    change: "-4.1%",
    note: "due this month",
    icon: "▣",
    tone: "red",
  },
];

const transactions = [
  {
    name: "Northstar Studio",
    detail: "Invoice #1048",
    amount: "+$8,420",
    date: "Today, 10:42 AM",
    type: "income",
    mark: "NS",
  },
  {
    name: "Figma Professional",
    detail: "Software subscription",
    amount: "-$240",
    date: "Today, 9:18 AM",
    type: "expense",
    mark: "F",
  },
  {
    name: "Apex Office Supply",
    detail: "Office equipment",
    amount: "-$1,280",
    date: "Yesterday, 4:36 PM",
    type: "expense",
    mark: "AO",
  },
  {
    name: "Marlow & Co.",
    detail: "Invoice #1047",
    amount: "+$4,860",
    date: "Yesterday, 1:12 PM",
    type: "income",
    mark: "MC",
  },
];

const alerts = [
  {
    title: "Invoice #1042 is overdue",
    detail: "Marlow & Co. · 15 days overdue",
    tone: "coral",
    time: "2h ago",
  },
  {
    title: "Bank reconciliation ready",
    detail: "24 transactions need review",
    tone: "amber",
    time: "5h ago",
  },
  {
    title: "Payroll scheduled",
    detail: "Due on 30 August · $18,420",
    tone: "blue",
    time: "1d ago",
  },
];

function CashFlowChart({ range }) {
  const points =
    range === "90 days"
      ? {
          income:
            "26,58 74,50 122,61 170,35 218,42 266,24 314,37 362,18 410,30 458,10",
          expense:
            "26,72 74,66 122,74 170,55 218,64 266,48 314,55 362,40 410,50 458,35",
        }
      : {
          income:
            "26,62 74,44 122,56 170,31 218,39 266,20 314,34 362,15 410,28 458,8",
          expense:
            "26,72 74,70 122,61 170,58 218,63 266,49 314,57 362,39 410,52 458,31",
        };

  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 484 100"
        role="img"
        aria-label={`Cash flow forecast for ${range}`}
      >
        <defs>
          <linearGradient id="incomeFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#227d66" stopOpacity=".18" />
            <stop offset="1" stopColor="#227d66" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[20, 45, 70, 95].map((y) => (
          <line key={y} x1="26" x2="458" y1={y} y2={y} className="grid-line" />
        ))}
        <path
          className="chart-fill"
          d={`M 26,100 L ${points.income} L 458,100 Z`}
        />
        <polyline points={points.income} className="line-income" />
        <polyline points={points.expense} className="line-expense" />
        {points.income.split(" ").map((point) => {
          const [cx, cy] = point.split(",");
          return (
            <circle
              key={point}
              cx={cx}
              cy={cy}
              r="3"
              className="point-income"
            />
          );
        })}
      </svg>
      <div className="chart-labels">
        <span>Aug 01</span>
        <span>Aug 15</span>
        <span>Aug 30</span>
        <span>Sep 15</span>
        <span>Sep 30</span>
      </div>
    </div>
  );
}

function Admin() {
  const [range, setRange] = useState("30 days");
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const runAction = (action) => {
    setMessage(`${action} is ready to start`);
    window.setTimeout(() => setMessage(""), 2600);
  };

  return (
    <main className={`dashboard ${darkMode ? "dark-mode" : ""}`}>
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>
            Apex<span className="brand-muted"> / finance</span>
          </span>
        </div>
        <nav className="nav-list" aria-label="Main navigation">
          <a className="nav-item active" href="#overview">
            <span>◈</span>Overview
          </a>
          <a className="nav-item" href="#transactions">
            <span>↕</span>Transactions
          </a>
          <a className="nav-item" href="#invoices">
            <span>▤</span>Invoices <b>8</b>
          </a>
          <a className="nav-item" href="#expenses">
            <span>⊙</span>Expenses
          </a>
          <a className="nav-item" href="#reports">
            <span>▥</span>Reports
          </a>
        </nav>
        <div className="sidebar-bottom">
          <a className="nav-item" href="#settings">
            <span>⚙</span>Settings
          </a>
          <div className="profile">
            <div className="avatar">GN</div>
            <div>
              <strong>{user?.name || "User"}</strong>
              <small>Administrator</small>
            </div>
            <span>•••</span>
          </div>
        </div>
      </aside>
      <section className="content" id="overview">
        <header className="topbar">
          <div className="mobile-brand">
            <span className="brand-mark">A</span>Apex
          </div>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label="Toggle dark mode"
              onClick={() => setDarkMode(!darkMode)}
            >
              {darkMode ? "☀" : "☾"}
            </button>
            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              ♧<i />
            </button>
            <div className="top-avatar">GN</div>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <p className="eyebrow">Wednesday, 19 August 2026</p>
            <h1>
              Good morning, {user?.name || "User"} <span>✦</span>
            </h1>
            <p className="subtitle">
              Here’s what’s happening with your finances today.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => runAction("New invoice")}
          >
            <span>＋</span> New invoice
          </button>
        </div>
        <div className="quick-actions">
          <span className="quick-label">Quick actions</span>
          <button onClick={() => runAction("Create invoice")}>
            ＋ <span>Create invoice</span>
          </button>
          <button onClick={() => runAction("Record expense")}>
            ↓ <span>Record expense</span>
          </button>
          <button onClick={() => runAction("Bank reconciliation")}>
            ↻ <span>Reconcile bank</span>
          </button>
        </div>
        <section className="metric-grid" aria-label="Financial health">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-icon ${metric.tone}`}>{metric.icon}</div>
              <p>{metric.label}</p>
              <strong>{metric.value}</strong>
              <div className="metric-change">
                <span
                  className={metric.change.startsWith("-") ? "negative" : ""}
                >
                  {metric.change}
                </span>{" "}
                {metric.note}
              </div>
            </article>
          ))}
        </section>
        <section className="dashboard-grid">
          <article className="panel cash-panel">
            <div className="panel-header">
              <div>
                <h2>Cash flow forecast</h2>
                <p>Expected income and expenses</p>
              </div>
              <div className="segmented">
                {["30 days", "90 days"].map((item) => (
                  <button
                    className={range === item ? "selected" : ""}
                    key={item}
                    onClick={() => setRange(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-income" />
                Income
              </span>
              <span>
                <i className="legend-expense" />
                Expenses
              </span>
              <strong>
                +$35,340 <small>projected</small>
              </strong>
            </div>
            <CashFlowChart range={range} />
          </article>
          <article className="panel breakdown-panel">
            <div className="panel-header">
              <div>
                <h2>Expense breakdown</h2>
                <p>August 2026</p>
              </div>
              <button className="more-button" aria-label="More expense options">
                •••
              </button>
            </div>
            <div className="donut-area">
              <div className="donut">
                <div>
                  <strong>$18,420</strong>
                  <small>Total expenses</small>
                </div>
              </div>
              <div className="breakdown-list">
                <span>
                  <i className="dot payroll" />
                  Payroll <b>42%</b>
                </span>
                <span>
                  <i className="dot software" />
                  Software <b>24%</b>
                </span>
                <span>
                  <i className="dot operations" />
                  Operations <b>18%</b>
                </span>
                <span>
                  <i className="dot other" />
                  Other <b>16%</b>
                </span>
              </div>
            </div>
          </article>
          <article className="panel transactions-panel" id="transactions">
            <div className="panel-header">
              <div>
                <h2>Recent transactions</h2>
                <p>Your latest financial activity</p>
              </div>
              <button className="text-button">
                View all <span>→</span>
              </button>
            </div>
            <div className="transaction-list">
              {transactions.map((transaction) => (
                <div className="transaction" key={transaction.name}>
                  <div className={`transaction-mark ${transaction.type}`}>
                    {transaction.mark}
                  </div>
                  <div className="transaction-name">
                    <strong>{transaction.name}</strong>
                    <small>{transaction.detail}</small>
                  </div>
                  <div className={`transaction-amount ${transaction.type}`}>
                    {transaction.amount}
                  </div>
                  <time>{transaction.date}</time>
                  <button
                    className="row-more"
                    aria-label={`More options for ${transaction.name}`}
                  >
                    •••
                  </button>
                </div>
              ))}
            </div>
          </article>
          <article className="panel aging-panel">
            <div className="panel-header">
              <div>
                <h2>Receivables aging</h2>
                <p>Invoices needing collection</p>
              </div>
              <button className="text-button">
                View report <span>→</span>
              </button>
            </div>
            <div
              className="aging-table"
              role="table"
              aria-label="Receivables aging report"
            >
              <div className="aging-row aging-heading" role="row">
                <span>Age</span>
                <span>Invoices</span>
                <span>Amount</span>
              </div>
              <div className="aging-row" role="row">
                <span>
                  <i className="aging-dot fresh" />
                  0–30 days
                </span>
                <strong>12</strong>
                <b>$42,680</b>
              </div>
              <div className="aging-row" role="row">
                <span>
                  <i className="aging-dot warm" />
                  30–60 days
                </span>
                <strong>5</strong>
                <b>$18,940</b>
              </div>
              <div className="aging-row" role="row">
                <span>
                  <i className="aging-dot overdue" />
                  60+ days
                </span>
                <strong>3</strong>
                <b className="overdue-value">$9,860</b>
              </div>
            </div>
          </article>
          <article className="panel alerts-panel">
            <div className="panel-header">
              <div>
                <h2>Needs your attention</h2>
                <p>Stay ahead of important tasks</p>
              </div>
              <span className="alert-count">3</span>
            </div>
            <div className="alert-list">
              {alerts.map((alert) => (
                <div className="alert" key={alert.title}>
                  <i className={`alert-icon ${alert.tone}`}>!</i>
                  <div>
                    <strong>{alert.title}</strong>
                    <small>{alert.detail}</small>
                  </div>
                  <time>{alert.time}</time>
                </div>
              ))}
            </div>
            <button className="alert-footer">
              View all notifications <span>→</span>
            </button>
          </article>
        </section>
        {message && (
          <div className="toast" role="status">
            ✓ {message}
          </div>
        )}
      </section>
    </main>
  );
}

export default Admin;
