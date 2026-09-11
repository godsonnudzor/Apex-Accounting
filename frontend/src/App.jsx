import {
  BrowserRouter as Router,
  Route,
  Routes,
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
import { Navigate } from "react-router-dom";
import { useAuth } from "./context/auth";
import PayrollDashboard from "./Pages/PayrollDashboard";
import Department from "./Component/Department/Department";
import Salary from "./Pages/Salary";
import LeaveManagement from "./Pages/LeaveManagemet";

function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return String(user.role).toLowerCase() === "admin" ? children : <Navigate to="/EmployeeDashboard" replace />;
}

function PermissionRoute({ permission, children }) {
  const { user, loading, hasPermission, refreshUser } = useAuth();
  const [checkingPermission, setCheckingPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);

  useEffect(() => {
    if (!loading && user && !hasPermission(permission) && !permissionChecked && !checkingPermission) {
      setCheckingPermission(true);
      refreshUser()
        .finally(() => {
          setPermissionChecked(true);
          setCheckingPermission(false);
        });
    }
  }, [loading, user, permission, permissionChecked, checkingPermission, hasPermission, refreshUser]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (checkingPermission) return <div>Loading...</div>;
  if (!hasPermission(permission)) return <Navigate to="/EmployeeDashboard" replace />;
  return children;
}

function EmployeeDashboardRoute() {
  return (
    <PermissionRoute permission="dashboard">
      <EmployeeDashboard />
    </PermissionRoute>
  );
}


function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        <Route index element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/dashboard" element={<AdminRoute><Deshboard /></AdminRoute>} />
        <Route path="/settings" element={<AdminRoute><Setting /></AdminRoute>} />
        <Route path="/EmployeeDashboard" element={<EmployeeDashboardRoute />} />
        <Route path="/bill" element={<PermissionRoute permission="bills"><Bill /></PermissionRoute>} />
        <Route path="/write-cheque" element={<PermissionRoute permission="writeCheque"><WriteCheque /></PermissionRoute>} />
        <Route path="/salary" element={<PermissionRoute permission="salaries"><Salary /></PermissionRoute>} />
        <Route path="/invoice" element={<PermissionRoute permission="bills"><Bill /></PermissionRoute>} />
        <Route path="/department" element={<PermissionRoute permission="departments"><Department /></PermissionRoute>} />
        <Route path="/leaveManagement" element={<PermissionRoute permission="leaveManagement"><LeaveManagement /></PermissionRoute>} />
        <Route path="/PayrollDashboard" element={<PermissionRoute permission="payroll"><PayrollDashboard /></PermissionRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App
