const MAX_OPEN_DOCUMENTS = 10;

const storageKey = (userId) => `apex-erp-open-documents:${userId}`;

const routeTitles = {
  "/EmployeeDashboard": "Employee workspace",
  "/bill": "Bills",
  "/invoices": "Invoices",
  "/receipts": "Receive payment",
  "/supplier-payments": "Supplier payments",
  "/GroupAccount": "Group ledgers",
  "/write-cheque": "Write cheque",
  "/deposits": "Deposits",
  "/journal": "Journal entries",
  "/audit-trail": "Audit trail",
  "/chart-of-accounts": "Chart of accounts",
  "/ledger-accounts/new": "Create ledger account",
  "/financial-reports": "Financial reports",
  "/financial-reports/profit-loss": "Profit & Loss",
  "/financial-reports/balance-sheet": "Balance sheet",
  "/suppliers/aging": "Supplier aging",
  "/customers/aging": "Customer aging",
  "/suppliers": "Supplier creation",
  "/suppliersCenter": "Suppliers center",
  "/customers": "Customer creation",
  "/customersCenter": "Customers center",
  "/salary": "Salaries",
  "/payroll-liabilities": "Payroll liabilities",
  "/department": "Departments",
  "/department/add": "Add department",
  "/employees": "Employees",
  "/employees/add": "Add employee",
  "/leaveManagement": "Leave management",
  "/PayrollDashboard": "Payroll dashboard",
  "/tax-analyzer": "Tax analyzer",
  "/tax-analyzer/brackets": "Tax brackets",
  "/settings": "Settings",
};

export function readOpenedDocuments(userId) {
  if (!userId) return [];
  const storedDocuments = window.localStorage.getItem(storageKey(userId));
  if (!storedDocuments) return [];

  try {
    const documents = JSON.parse(storedDocuments);
    return Array.isArray(documents)
      ? documents.filter(
          (document) =>
            document &&
            typeof document.href === "string" &&
            typeof document.title === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function registerOpenedDocument(userId, pathname, search = "") {
  if (!userId || !pathname || pathname === "/" || pathname === "/dashboard") {
    return;
  }

  const href = `${pathname}${search}`;
  const title =
    pathname === "/deposits" && search.includes("view=history")
      ? "Deposit history"
      : routeTitles[pathname] ||
        pathname
          .split("/")
          .filter(Boolean)
          .pop()
          .replace(/-/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase());
  const documents = readOpenedDocuments(userId).filter(
    (document) => document.href !== href,
  );

  window.localStorage.setItem(
    storageKey(userId),
    JSON.stringify([{ href, title }, ...documents].slice(0, MAX_OPEN_DOCUMENTS)),
  );
}

export function removeOpenedDocument(userId, href) {
  const documents = readOpenedDocuments(userId).filter(
    (document) => document.href !== href,
  );
  window.localStorage.setItem(storageKey(userId), JSON.stringify(documents));
}
