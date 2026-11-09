import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../App.css";
import DropdownMenu from "./DropdownMenu";
import { getApiUrl, readApiResponse, useAuth } from "../../context/auth";

const metrics = [
  {
    label: "Cash flow",
    icon: "↗",
    tone: "green",
  },
  {
    label: "Net profit margin",
    icon: "◒",
    tone: "blue",
  },
  {
    label: "Accounts receivable",
    icon: "◎",
    tone: "amber",
  },
  {
    label: "Accounts payable",
    icon: "▣",
    tone: "red",
  },
];

const relationRecord = (value) => (Array.isArray(value) ? value[0] : value);

const transactionDate = (date) =>
  date
    ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Date unavailable";

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

const employeeWorkspaces = [
  {
    label: "Bills",
    description: "Create and review supplier bills.",
    to: "/bill",
    permissions: ["bills"],
  },
  {
    label: "Invoices",
    description: "Create and manage customer invoices.",
    to: "/invoice",
    permissions: ["invoice", "bills"],
  },
  {
    label: "Write cheque",
    description: "Create cash and cheque transactions.",
    to: "/write-cheque",
    permissions: ["writeCheque"],
  },
  {
    label: "Payroll",
    description: "Review payroll activity and compensation.",
    to: "/PayrollDashboard",
    permissions: ["payroll"],
  },
  {
    label: "Departments",
    description: "View and manage departments.",
    to: "/department",
    permissions: ["departments"],
  },
  {
    label: "Employee records",
    description: "Browse employee information.",
    to: "/employees",
    permissions: ["employeeManagement"],
  },
  {
    label: "Salaries",
    description: "View salary records.",
    to: "/salary",
    permissions: ["salaries"],
  },
  {
    label: "Leave",
    description: "Open leave records and requests.",
    to: "/leaveManagement",
    permissions: ["leaveManagement"],
  },
  {
    label: "Group accounts",
    description: "Open group account management.",
    to: "/GroupAccount",
    permissions: ["groupAccount"],
  },
  {
    label: "Tax analyzer",
    description: "Calculate and save tax scenarios.",
    to: "/tax-analyzer",
    permissions: ["taxJurisdictions", "userScenarios"],
  },
  {
    label: "Tax brackets",
    description: "View the tax bracket library.",
    to: "/tax-analyzer/brackets",
    permissions: ["taxBrackets"],
  },
  {
    label: "Profit & Loss",
    description: "Review income, expenses, and net profit.",
    to: "/financial-reports/profit-loss",
    permissions: ["reports", "writeCheque"],
  },
  {
    label: "Balance Sheet",
    description: "Review account balances and financial position.",
    to: "/financial-reports/balance-sheet",
    permissions: ["reports", "writeCheque"],
  },
];

function CashFlowChart({ data }) {
  const maximum = Math.max(
    1,
    ...data.flatMap(({ income, expenses }) => [income, expenses]),
  );
  const toPoints = (key) =>
    data
      .map((month, index) => {
        const x = data.length === 1 ? 242 : 26 + (432 * index) / (data.length - 1);
        const y = 88 - (Math.max(0, month[key]) / maximum) * 74;
        return `${x},${y}`;
      })
      .join(" ");
  const incomePoints = toPoints("income");
  const expensePoints = toPoints("expenses");
  const lastX = data.length === 1 ? 242 : 458;
  const labelInterval = Math.max(1, Math.ceil(data.length / 5));

  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 484 100"
        role="img"
        aria-label="Monthly revenue and expenses from Profit and Loss"
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
          d={incomePoints ? `M ${incomePoints} L ${lastX},100 L 26,100 Z` : ""}
        />
        <polyline points={incomePoints} className="line-income" />
        <polyline points={expensePoints} className="line-expense" />
        {incomePoints.split(" ").filter(Boolean).map((point) => {
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
        {data.map((month, index) =>
          index % labelInterval === 0 || index === data.length - 1 ? (
            <span key={month.key}>{month.label}</span>
          ) : null,
        )}
      </div>
    </div>
  );
}


function Admin() {
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const [range, setRange] = useState("6 months");
  const [darkMode, setDarkMode] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dashboardReport, setDashboardReport] = useState(null);
  const [dashboardReportLoading, setDashboardReportLoading] = useState(true);
  const [dashboardReportError, setDashboardReportError] = useState("");
  const [dashboardAging, setDashboardAging] = useState(null);
  const [dashboardAgingLoading, setDashboardAgingLoading] = useState(true);
  const [dashboardAgingError, setDashboardAgingError] = useState("");
  const [dashboardTransactions, setDashboardTransactions] = useState([]);
  const [dashboardTransactionsLoading, setDashboardTransactionsLoading] =
    useState(true);
  const [dashboardTransactionsError, setDashboardTransactionsError] =
    useState("");

  const displayName = user?.name || "User";
  const initials = displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const isAdmin = String(user?.role).toLowerCase() === "admin";
  const role = isAdmin ? "Administrator" : "Employee";
  useEffect(() => {
    if (!isAdmin) {
      setDashboardReportLoading(false);
      setDashboardAgingLoading(false);
      setDashboardTransactionsLoading(false);
      return undefined;
    }

    let active = true;
    const year = new Date().getFullYear();
    setDashboardReportLoading(true);
    setDashboardReportError("");
    setDashboardAgingLoading(true);
    setDashboardAgingError("");
    setDashboardTransactionsLoading(true);
    setDashboardTransactionsError("");

    const request = (path, fallbackMessage) =>
      fetch(getApiUrl(path), { credentials: "include" }).then(
        async (response) => {
        const result = await readApiResponse(response);
        if (!response.ok) {
          throw new Error(result.message || fallbackMessage);
        }
        return result;
        },
      );

    Promise.allSettled([
      request(
        `/api/reports/financial?year=${year}`,
        "Unable to load dashboard financial data",
      ),
      request("/api/reports/aging", "Unable to load dashboard aging data"),
      request(
        "/api/dashboard/transactions",
        "Unable to load recent transactions",
      ),
    ]).then(([reportResult, agingResult, transactionResult]) => {
      if (!active) return;
      if (reportResult.status === "fulfilled") {
        setDashboardReport(reportResult.value);
      } else {
        setDashboardReportError(reportResult.reason.message);
      }
      if (agingResult.status === "fulfilled") {
        setDashboardAging(agingResult.value);
      } else {
        setDashboardAgingError(agingResult.reason.message);
      }
      if (transactionResult.status === "fulfilled") {
        setDashboardTransactions(transactionResult.value.transactions || []);
      } else {
        setDashboardTransactionsError(transactionResult.reason.message);
      }
      setDashboardReportLoading(false);
      setDashboardAgingLoading(false);
      setDashboardTransactionsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [isAdmin]);

  const reportMonths = dashboardReport?.months || [];
  const monthlyProfitLoss = dashboardReport?.monthlyProfitLoss || [];
  const incomeAccounts = monthlyProfitLoss.filter(
    (account) => account.account_type === "income",
  );
  const expenseAccounts = monthlyProfitLoss.filter(
    (account) => account.account_type === "expense",
  );
  const monthlyCashFlow = reportMonths.map((month, index) => ({
    ...month,
    income: incomeAccounts.reduce(
      (sum, account) => sum + Number(account.months?.[index] || 0),
      0,
    ),
    expenses: expenseAccounts.reduce(
      (sum, account) => sum + Number(account.months?.[index] || 0),
      0,
    ),
  }));
  const visibleCashFlow = monthlyCashFlow.slice(range === "6 months" ? -6 : -12);
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthIndex = reportMonths.findIndex(
    (month) => month.key === currentMonthKey,
  );
  const currentMonthExpenses = expenseAccounts
    .map((account) => ({
      name: account.name,
      amount: Number(account.months?.[currentMonthIndex] || 0),
    }))
    .filter((account) => account.amount !== 0)
    .sort((left, right) => right.amount - left.amount);
  const expenseBreakdown =
    currentMonthExpenses.length > 4
      ? [
          ...currentMonthExpenses.slice(0, 3),
          {
            name: "Other",
            amount: currentMonthExpenses
              .slice(3)
              .reduce((sum, account) => sum + account.amount, 0),
          },
        ]
      : currentMonthExpenses;
  const expenseTotal = currentMonthExpenses.reduce(
    (sum, account) => sum + account.amount,
    0,
  );
  const positiveExpenseTotal = expenseBreakdown.reduce(
    (sum, account) => sum + Math.max(0, account.amount),
    0,
  );
  const breakdownColors = ["#227d66", "#61a9ad", "#e4a74b", "#d4dce0"];
  let expenseArcStart = 0;
  const donutBackground = positiveExpenseTotal
    ? `conic-gradient(${expenseBreakdown
        .map((account, index) => {
          const share =
            (Math.max(0, account.amount) / positiveExpenseTotal) * 100;
          const arc = `${breakdownColors[index % breakdownColors.length]} ${expenseArcStart}% ${expenseArcStart + share}%`;
          expenseArcStart += share;
          return arc;
        })
        .join(", ")})`
    : "conic-gradient(#d4dce0 0 100%)";
  const cashFlowTotals = visibleCashFlow.reduce(
    (totals, month) => ({
      income: totals.income + month.income,
      expenses: totals.expenses + month.expenses,
    }),
    { income: 0, expenses: 0 },
  );
  const annualProfitLoss = dashboardReport?.profitLoss || [];
  const annualIncome = annualProfitLoss
    .filter((account) => account.account_type === "income")
    .reduce((sum, account) => sum + Number(account.balance || 0), 0);
  const netProfitMargin = annualIncome
    ? (Number(dashboardReport?.netProfit || 0) / annualIncome) * 100
    : 0;
  const receivables = (dashboardAging?.customers || []).reduce(
    (sum, customer) => sum + Number(customer.total || 0),
    0,
  );
  const payables = (dashboardAging?.suppliers || []).reduce(
    (sum, supplier) => sum + Number(supplier.total || 0),
    0,
  );
  const receivableBuckets = [
    { key: "days1to30", label: "0–30 days", tone: "fresh" },
    { key: "days31to60", label: "31–60 days", tone: "warm" },
    { key: "days61to90", label: "61–90 days", tone: "overdue" },
    { key: "over90", label: "90+ days", tone: "overdue" },
  ].map((bucket) => ({
    ...bucket,
    amount: (dashboardAging?.customers || []).reduce(
      (sum, customer) => sum + Number(customer[bucket.key] || 0),
      0,
    ),
    count: (dashboardAging?.customers || []).reduce(
      (sum, customer) =>
        sum +
        (customer.transactions || []).filter((transaction) => {
          const age = Number(transaction.age_days || 0);
          if (bucket.key === "days1to30") return age <= 30;
          if (bucket.key === "days31to60") return age > 30 && age <= 60;
          if (bucket.key === "days61to90") return age > 60 && age <= 90;
          return age > 90;
        }).length,
      0,
    ),
  }));
  const incomeAccountNames = new Set(
    annualProfitLoss
      .filter((account) => account.account_type === "income")
      .map((account) => `${account.code} - ${account.name}`),
  );
  const expenseAccountNames = new Set(
    annualProfitLoss
      .filter((account) => account.account_type === "expense")
      .map((account) => `${account.code} - ${account.name}`),
  );
  const recentTransactions = dashboardTransactions.map((entry) => {
    const payment = relationRecord(entry.payment_records);
    const lines = entry.journal_lines || [];
    const incomeAmount = lines.reduce(
      (sum, line) =>
        sum +
        (incomeAccountNames.has(line.account)
          ? Number(line.credit || 0) - Number(line.debit || 0)
          : 0),
      0,
    );
    const expenseAmount = lines.reduce(
      (sum, line) =>
        sum +
        (expenseAccountNames.has(line.account)
          ? Number(line.debit || 0) - Number(line.credit || 0)
          : 0),
      0,
    );
    const type = incomeAmount > 0
      ? "income"
      : expenseAmount > 0 || payment
        ? "expense"
        : "neutral";
    const amount =
      incomeAmount > 0
        ? incomeAmount
        : expenseAmount > 0
          ? expenseAmount
          : Number(payment?.amount || 0) ||
            lines.reduce((sum, line) => sum + Number(line.debit || 0), 0);
    const partyNames = lines
      .map((line) => {
        const supplier = relationRecord(line.supplier);
        const customer = relationRecord(line.customer);
        const employee = relationRecord(line.employee);
        const userRecord = relationRecord(employee?.users);
        return (
          supplier?.name ||
          customer?.name ||
          [employee?.first_name, employee?.last_name].filter(Boolean).join(" ") ||
          userRecord?.name
        );
      })
      .filter(Boolean);
    const name =
      payment?.payee ||
      partyNames[0] ||
      entry.description ||
      entry.source ||
      entry.reference ||
      "Journal entry";
    const detail = [
      entry.reference,
      entry.description || entry.source,
    ]
      .filter(Boolean)
      .join(" · ");
    const initials = String(name)
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase();
    return {
      id: entry.id,
      name,
      detail: detail || "Posted transaction",
      amount,
      date: transactionDate(entry.entry_date),
      type,
      mark: initials || "JE",
    };
  });
  const formatMoney = (value) =>
    `GHC ${Number(value || 0).toLocaleString("en-GH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  const metricData = {
    "Cash flow": {
      value: dashboardReportLoading
        ? "Loading..."
        : dashboardReportError
          ? "Unavailable"
          : formatMoney(cashFlowTotals.income - cashFlowTotals.expenses),
      loading: dashboardReportLoading,
      error: dashboardReportError,
      note: `Net for ${range}`,
    },
    "Net profit margin": {
      value: dashboardReportLoading
        ? "Loading..."
        : dashboardReportError
          ? "Unavailable"
          : `${netProfitMargin.toFixed(1)}%`,
      loading: dashboardReportLoading,
      error: dashboardReportError,
      note: "year to date",
    },
    "Accounts receivable": {
      value: dashboardAgingLoading
        ? "Loading..."
        : dashboardAgingError
          ? "Unavailable"
          : formatMoney(receivables),
      loading: dashboardAgingLoading,
      error: dashboardAgingError,
      note: "open customer invoices",
    },
    "Accounts payable": {
      value: dashboardAgingLoading
        ? "Loading..."
        : dashboardAgingError
          ? "Unavailable"
          : formatMoney(payables),
      loading: dashboardAgingLoading,
      error: dashboardAgingError,
      note: "supplier bills",
    },
  };
  const availableWorkspaces = employeeWorkspaces.filter(({ permissions }) =>
    permissions.some(hasPermission),
  );

  const runAction = (action) => {
    setMessage(`${action} is ready to start`);
    window.setTimeout(() => setMessage(""), 2600);
  };

  return (
    <main className={`dashboard ${darkMode ? "dark-mode" : ""}`}>
      {mobileMenuOpen && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">A</span>
          <span>
            Apex<span className="brand-muted"> / {isAdmin ? "finance" : "workspace"}</span>
          </span>
        </div>
        
       
        <div className="sidebar-bottom">
          {isAdmin && (
            <Link className="nav-item" to="/settings">
              <span>⚙</span>Settings
            </Link>
          )}
          <div className="profile">
            <div className="avatar">{initials}</div>
            <div>
              <strong>{displayName}</strong>
              <small>{role}</small>
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
              className="mobile-menu-button"
              aria-label="Open navigation menu"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              ☰
            </button>
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
            <div className="top-avatar">{initials}</div>
          </div>
        </header>
        <div className="page-heading">
          <div>
            <p className="eyebrow"> <DropdownMenu /></p>
            <h1>
              Hello! {displayName} <span>✦</span>
            </h1>
            <p className="subtitle">
              {isAdmin
                ? "Here’s what’s happening with your finances today."
                : "Your workspace shows only the tools enabled for your account."}
            </p>
          </div>
          {isAdmin && <button
            className="primary-button"
            onClick={() => runAction("New invoice")}
          >
            <span>＋</span> New invoice
          </button>}
        </div>
        {isAdmin && <div className="quick-actions">
          <span className="quick-label">Quick actions</span>
          <button onClick={() => navigate("/bill")}>
            ＋ <span>Create invoice</span>
          </button>
          <button onClick={() => runAction("Record expense")}>
            ↓ <span>Record expense</span>
          </button>
          <button onClick={() => runAction("Bank reconciliation")}>
            ↻ <span>Reconcile bank</span>
          </button>
        </div>}
        {!isAdmin && (
          <section className="employee-workspace-section">
            <div className="employee-workspace-heading">
              <div>
                <p className="eyebrow">Your access</p>
                <h2>Available workspaces</h2>
              </div>
              <span>{availableWorkspaces.length} available</span>
            </div>
            {availableWorkspaces.length ? (
              <div className="employee-workspace-grid">
                {availableWorkspaces.map(({ label, description, to }) => (
                  <Link className="employee-workspace-card" key={to} to={to}>
                    <span aria-hidden="true">{label[0]}</span>
                    <strong>{label}</strong>
                    <p>{description}</p>
                    <small>Open workspace &rarr;</small>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="employee-workspace-empty">
                No additional workspaces are enabled for your account.
              </div>
            )}
          </section>
        )}
        {isAdmin && <section className="metric-grid" aria-label="Financial health">
          {metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <div className={`metric-icon ${metric.tone}`}>{metric.icon}</div>
              <p>{metric.label}</p>
              <strong>{metricData[metric.label].value}</strong>
              <div className="metric-change">
                <span>
                  {metricData[metric.label].loading
                    ? "Loading"
                    : metricData[metric.label].error
                      ? "Error"
                      : "Live"}
                </span>{" "}
                {metricData[metric.label].note}
              </div>
            </article>
          ))}
        </section>}
        {isAdmin && dashboardReportError ? (
          <p
            className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Live dashboard financial data could not be loaded: {dashboardReportError}
          </p>
        ) : null}
        {isAdmin && <section className="dashboard-grid">
          <article className="panel cash-panel">
            <div className="panel-header">
              <div>
                <h2>Cash flow</h2>
                <p>Monthly revenue and expenses from Profit &amp; Loss</p>
              </div>
              <div className="segmented">
                {["6 months", "12 months"].map((item) => (
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
                {formatMoney(cashFlowTotals.income - cashFlowTotals.expenses)}{" "}
                <small>net for period</small>
              </strong>
            </div>
            {dashboardReportLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading monthly revenue and expenses...
              </p>
            ) : visibleCashFlow.length ? (
              <CashFlowChart data={visibleCashFlow} />
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {dashboardReportError
                  ? "Monthly revenue and expenses are unavailable."
                  : "No monthly revenue or expense data is available yet."}
              </p>
            )}
          </article>
          <article className="panel breakdown-panel">
            <div className="panel-header">
              <div>
                <h2>Expense breakdown</h2>
                <p>{reportMonths[currentMonthIndex]?.label || "Current month"}</p>
              </div>
              <Link className="text-button" to="/financial-reports/profit-loss">
                View report
              </Link>
            </div>
            {dashboardReportLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading expenses...
              </p>
            ) : expenseBreakdown.length ? (
              <div className="donut-area">
                <div className="donut" style={{ background: donutBackground }}>
                  <div>
                    <strong>{formatMoney(expenseTotal)}</strong>
                    <small>Total expenses</small>
                  </div>
                </div>
                <div className="breakdown-list">
                  {expenseBreakdown.map((account, index) => (
                    <span key={account.name} title={formatMoney(account.amount)}>
                      <i
                        className="dot"
                        style={{
                          backgroundColor:
                            breakdownColors[index % breakdownColors.length],
                        }}
                      />
                      {account.name}
                      <b>
                        {positiveExpenseTotal
                          ? `${Math.round(
                              (Math.max(0, account.amount) / positiveExpenseTotal) *
                                100,
                            )}%`
                          : "0%"}
                      </b>
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                {dashboardReportError
                  ? "Expense breakdown is unavailable."
                  : "No expenses have been posted this month."}
              </p>
            )}
          </article>
          <article className="panel transactions-panel" id="transactions">
            <div className="panel-header">
              <div>
                <h2>Recent transactions</h2>
                <p>Latest posted journal entries</p>
              </div>
              <Link className="text-button" to="/journal">
                View all <span>→</span>
              </Link>
            </div>
            {dashboardTransactionsLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading recent transactions...
              </p>
            ) : dashboardTransactionsError ? (
              <p className="py-8 text-center text-sm text-red-700" role="alert">
                {dashboardTransactionsError}
              </p>
            ) : recentTransactions.length ? (
              <div className="transaction-list">
                {recentTransactions.map((transaction) => (
                  <div className="transaction" key={transaction.id}>
                    <div className={`transaction-mark ${transaction.type}`}>
                      {transaction.mark}
                    </div>
                    <div className="transaction-name">
                      <strong>{transaction.name}</strong>
                      <small>{transaction.detail}</small>
                    </div>
                    <div className={`transaction-amount ${transaction.type}`}>
                      {transaction.type === "income"
                        ? "+"
                        : transaction.type === "expense"
                          ? "-"
                          : ""}
                      {formatMoney(transaction.amount)}
                    </div>
                    <time>{transaction.date}</time>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-slate-500">
                No posted transactions are available.
              </p>
            )}
          </article>
          <article className="panel aging-panel">
            <div className="panel-header">
              <div>
                <h2>Receivables aging</h2>
                <p>Open customer invoices by age</p>
                <p>Payment allocations are not included yet.</p>
              </div>
              <Link className="text-button" to="/customers/aging">
                View report <span>→</span>
              </Link>
            </div>
            {dashboardAgingLoading ? (
              <p className="py-8 text-center text-sm text-slate-500">
                Loading receivables aging...
              </p>
            ) : dashboardAgingError ? (
              <p className="py-8 text-center text-sm text-red-700" role="alert">
                {dashboardAgingError}
              </p>
            ) : (
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
                {receivableBuckets.map((bucket) => (
                  <div className="aging-row" role="row" key={bucket.key}>
                    <span>
                      <i className={`aging-dot ${bucket.tone}`} />
                      {bucket.label}
                    </span>
                    <strong>{bucket.count}</strong>
                    <b className={bucket.key === "over90" ? "overdue-value" : ""}>
                      {formatMoney(bucket.amount)}
                    </b>
                  </div>
                ))}
              </div>
            )}
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
        </section>}
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
