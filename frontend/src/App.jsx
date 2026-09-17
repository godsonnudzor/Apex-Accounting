import {
  createBrowserRouter,
  Navigate,
  RouterProvider,
} from "react-router-dom";
import { useEffect, useState } from "react";
import Login from "./Pages/Login";
import SignUp from "./Pages/Signup";
import Deshboard from "./Pages/Deshboard";
import EmployeeDashboard from "./Pages/EmployeeDashboard";
import Bill from "./Pages/Bill";
import WriteCheque from "./Pages/WriteCheque";
import AuthProvider from "./context/authContext";
import Setting from "./Pages/Setting";
import { useAuth } from "./context/auth";
import PayrollDashboard from "./Pages/PayrollDashboard";
import Department from "./Component/Department/Department";
import Employees from "./Component/Employee/Employees";
import EmployeeAdd from "./Component/Employee/Add";
import Salary from "./Pages/Salary";
import LeaveManagement from "./Pages/LeaveManagemet";
import Add from "./Component/Department/Add";
import TaxRoot from "./routes/root";
import Calculator from "./routes/calculator";
import { calculatorAction, calculatorLoader } from "./routes/calculatorData";
import { bracketsLoader } from "./routes/brackets";
import TaxDataTable from "./components/TaxDataTable";
import { useLoaderData } from "react-router-dom";

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

function PermissionRoute({ permission, children }) {
  const { user, loading, hasPermission, refreshUser } = useAuth();
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (
      !loading &&
      user &&
      !hasPermission(permission) &&
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
    permissionChecked,
    checkingPermission,
    hasPermission,
    refreshUser,
  ]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (checkingPermission) return <div>Loading...</div>;
  if (!hasPermission(permission))
    return <Navigate to="/EmployeeDashboard" replace />;
  return children;
}

function EmployeeDashboardRoute() {
  return (
    <PermissionRoute permission="dashboard">
      <EmployeeDashboard />
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
  {
    path: "/bill",
    element: (
      <PermissionRoute permission="bills">
        <Bill />
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
    path: "/salary",
    element: (
      <PermissionRoute permission="salaries">
        <Salary />
      </PermissionRoute>
    ),
  },
  {
    path: "/invoice",
    element: (
      <PermissionRoute permission="bills">
        <Bill />
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
