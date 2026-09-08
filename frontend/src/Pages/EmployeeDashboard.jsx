import { Link } from "react-router-dom";
import { useAuth } from "../context/authContext";

const EmployeeDashboard = () => {
  const { user, hasPermission } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <h1 className="mb-2 text-3xl text-teal-500">Employee Dashboard</h1>
      <p className="mb-8 text-gray-600">Welcome, {user?.name || "Employee"}.</p>
      <div className="flex flex-wrap gap-4">
        {hasPermission("bills") ? <Link className="rounded bg-white px-5 py-3 shadow" to="/bill">Bills</Link> : null}
        {hasPermission("writeCheque") ? <Link className="rounded bg-white px-5 py-3 shadow" to="/write-cheque">Write cheque</Link> : null}
        {hasPermission("payroll") ? <Link className="rounded bg-white px-5 py-3 shadow" to="/PayrollDashboard">Payroll</Link> : null}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
