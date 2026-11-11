import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";
import Deshboard from "./Pages/Deshboard";
import EmployeeCenter from "./Pages/EmployeeCenter";
import Bill from "./Pages/Bill";
import Invoice from "./Pages/Invoice";
import Settlement from "./Pages/Settlement";
import WriteCheque from "./Pages/WriteCheque";
import Journal from "./Pages/Journal";
import Suppliers from "./Pages/Suppliers";
import SuppliersCenter from "./Pages/SuppliersCenter";
import Customers from "./Pages/Customers";
import CustomersCenter from "./Pages/CustomersCenter";
import AuthProvider from "./context/authContext";
import Setting from "./Pages/Setting";
import { useAuth } from "./context/auth";
import PayrollDashboard from "./Pages/PayrollDashboard";
import Department from "./Component/Department/Department";
import Employees from "./Component/Employee/Employees";
import EmployeeAdd from "./Component/Employee/Add";
import Salary from "./Pages/Salary";
import PayrollLiabilities from "./Pages/PayrollLiabilities";
import ChartOfAccounts from "./Pages/ChartOfAccounts";
import LedgerAccountCreate from "./Pages/LedgerAccountCreate";
import FinancialReports from "./Pages/FinancialReports";
import LeaveManagement from "./Pages/LeaveManagemet";
import Add from "./Component/Department/Add";
import TaxRoot from "./routes/root";
import Calculator from "./routes/calculator";
import { calculatorAction, calculatorLoader } from "./routes/calculatorData";
import { bracketsLoader } from "./routes/brackets";
import TaxDataTable from "./components/TaxDataTable";
import { useLoaderData } from "react-router-dom";
import GroupAccount from "./Pages/GroupAccount";
import AuditTrail from "./Pages/AuditTrail";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return String(user.role).toLowerCase() === "admin" ? (
    children
  ) : (
    <Navigate to="/EmployeeDashboard" replace />
  );
}

function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 p-6 text-center text-slate-900">
      <div>
        <h1 className="text-2xl font-bold">Access not available</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account does not have permission to view this workspace.
        </p>
      </div>
    </main>
  );
}

function PermissionRoute({ permission, children }) {
  const { user, loading, hasPermission, refreshUser } = useAuth();
  const hasRequiredPermission = (
    Array.isArray(permission) ? permission : [permission]
  ).some((requiredPermission) => hasPermission(requiredPermission));
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (
      !loading &&
      user &&
      !hasRequiredPermission &&
      !permissionChecked &&
      !checkingPermission
    ) {
      setCheckingPermission(true);
      refreshUser().finally(() => {
        setPermissionChecked(true);
        setCheckingPermission(false);
      });
    }
  }, [
    loading,
    user,
    permission,
    hasRequiredPermission,
    permissionChecked,
    checkingPermission,
    hasPermission,
    refreshUser,
  ]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (checkingPermission) return <div>Loading...</div>;
  if (!hasRequiredPermission) return <AccessDenied />;
  return children;
}

function EmployeeDashboardRoute() {
  return (
    <PermissionRoute permission="dashboard">
      <Deshboard />
    </PermissionRoute>
  );
}

function TaxAnalyzerRoute() {
  const { hasPermission } = useAuth();
  return hasPermission("taxJurisdictions") || hasPermission("userScenarios") ? (
    <TaxRoot />
  ) : (
    <Navigate to="/EmployeeDashboard" replace />
  );
}

function BracketsPage() {
  const { brackets, demo } = useLoaderData();
  return (
    <div className="tax-page">
      <div className="tax-intro">
        <div>
          <p className="tax-kicker">Tax intelligence</p>
          <h1>Bracket library.</h1>
          <p>Sort and filter the rates behind your estimate.</p>
        </div>
        <div className="tax-status">
          <span className={demo ? "status-dot demo" : "status-dot"} />
          {demo ? "Demo data" : "Live Supabase data"}
        </div>
      </div>
      <TaxDataTable brackets={brackets} />
    </div>
  );
}

const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/signup", element: <SignUp /> },
  {
    path: "/dashboard",
    element: (
      <AdminRoute>
        <Deshboard />
      </AdminRoute>
    ),
  },
  {
    path: "/settings",
    element: (
      <AdminRoute>
        <Setting />
      </AdminRoute>
    ),
  },
  { path: "/EmployeeDashboard", element: <EmployeeDashboardRoute /> },
  { path: "/employee-center", element: <EmployeeDashboardRoute /> },
  {
    path: "/bill",
    element: (
      <PermissionRoute permission="bills">
        <Bill />
      </PermissionRoute>
    ),
  },
  {
    path: "/invoices",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <Invoice />
      </PermissionRoute>
    ),
  },
  {
    path: "/receipts",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <Settlement settlementType="receipt" />
      </PermissionRoute>
    ),
  },
  {
    path: "/supplier-payments",
    element: (
      <PermissionRoute permission={["bills", "writeCheque"]}>
        <Settlement settlementType="supplier_payment" />
      </PermissionRoute>
    ),
  },
  {
    path: "/GroupAccount",
    element: (
      <PermissionRoute permission="groupAccount">
        <GroupAccount />
      </PermissionRoute>
    ),
  },
  {
    path: "/write-cheque",
    element: (
      <PermissionRoute permission="writeCheque">
        <WriteCheque />
      </PermissionRoute>
    ),
  },
  {
    path: "/journal",
    element: (
      <PermissionRoute permission="writeCheque">
        <Journal />
      </PermissionRoute>
    ),
  },
  {
    path: "/audit-trail",
    element: (
      <PermissionRoute permission="writeCheque">
        <AuditTrail />
      </PermissionRoute>
    ),
  },
  {
    path: "/chart-of-accounts",
    element: (
      <PermissionRoute permission="writeCheque">
        <ChartOfAccounts />
      </PermissionRoute>
    ),
  },
  {
    path: "/ledger-accounts/new",
    element: (
      <PermissionRoute permission="writeCheque">
        <LedgerAccountCreate />
      </PermissionRoute>
    ),
  },
  {
    path: "/financial-reports",
    element: (
      <PermissionRoute permission={["reports", "writeCheque"]}>
        <FinancialReports reportType="profit-loss" />
      </PermissionRoute>
    ),
  },
  {
    path: "/financial-reports/profit-loss",
    element: (
      <PermissionRoute permission={["reports", "writeCheque"]}>
        <FinancialReports reportType="profit-loss" />
      </PermissionRoute>
    ),
  },
  {
    path: "/financial-reports/balance-sheet",
    element: (
      <PermissionRoute permission={["reports", "writeCheque"]}>
        <FinancialReports reportType="balance-sheet" />
      </PermissionRoute>
    ),
  },
  {
    path: "/suppliers/aging",
    element: (
      <PermissionRoute permission={["bills", "writeCheque"]}>
        <FinancialReports reportType="supplier-aging" />
      </PermissionRoute>
    ),
  },
  {
    path: "/customers/aging",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <FinancialReports reportType="customer-aging" />
      </PermissionRoute>
    ),
  },
  {
    path: "/suppliers",
    element: (
      <PermissionRoute permission={["writeCheque", "bills", "invoice"]}>
        <Suppliers />
      </PermissionRoute>
    ),
  },
  {
    path: "/suppliersCenter",
    element: (
      <PermissionRoute permission={["writeCheque", "bills", "invoice"]}>
        <SuppliersCenter />
      </PermissionRoute>
    ),
  },
  {
    path: "/customers",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <Customers />
      </PermissionRoute>
    ),
  },
  {
    path: "/customersCenter",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <CustomersCenter />
      </PermissionRoute>
    ),
  },
  {
    path: "/salary",
    element: (
      <PermissionRoute permission="salaries">
        <Salary />
      </PermissionRoute>
    ),
  },
  {
    path: "/payroll-liabilities",
    element: (
      <PermissionRoute permission="salaries">
        <PayrollLiabilities />
      </PermissionRoute>
    ),
  },
  {
    path: "/invoice",
    element: (
      <PermissionRoute permission={["invoice", "bills"]}>
        <Invoice />
      </PermissionRoute>
    ),
  },
  {
    path: "/department",
    element: (
      <PermissionRoute permission="departments">
        <Department />
      </PermissionRoute>
    ),
  },
  {
    path: "/department/add",
    element: (
      <PermissionRoute permission="departments">
        <Add />
      </PermissionRoute>
    ),
  },
  {
    path: "/employees",
    element: (
      <PermissionRoute permission="employeeManagement">
        <Employees />
      </PermissionRoute>
    ),
  },
  {
    path: "/employees/add",
    element: (
      <PermissionRoute permission="employeeManagement">
        <EmployeeAdd />
      </PermissionRoute>
    ),
  },
  {
    path: "/employees/:id",
    element: (
      <PermissionRoute permission="employeeManagement">
        <EmployeeAdd />
      </PermissionRoute>
    ),
  },
  {
    path: "/leaveManagement",
    element: (
      <PermissionRoute permission="leaveManagement">
        <LeaveManagement />
      </PermissionRoute>
    ),
  },
  {
    path: "/PayrollDashboard",
    element: (
      <PermissionRoute permission="payroll">
        <PayrollDashboard />
      </PermissionRoute>
    ),
  },
  {
    path: "/tax-analyzer",
    element: <TaxAnalyzerRoute />,
    children: [
      {
        index: true,
        element: <Calculator />,
        loader: calculatorLoader,
        action: calculatorAction,
      },
      {
        path: "brackets",
        element: (
          <PermissionRoute permission="taxBrackets">
            <BracketsPage />
          </PermissionRoute>
        ),
        loader: bracketsLoader,
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);

function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

export default App;
