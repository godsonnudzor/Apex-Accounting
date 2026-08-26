import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { getApiUrl, useAuth } from "../context/authContext";
import "../App.css";

const permissionLabels = [
  { key: "dashboard", label: "Dashboard", description: "View financial overview and activity" },
  { key: "writeCheque", label: "Write cheque", description: "Create cash and cheque transactions" },
  { key: "bills", label: "Bills", description: "Create and manage supplier bills" },
  { key: "reports", label: "Reports", description: "Open financial reports" },
];
const defaults = { dashboard: true, writeCheque: false, bills: false, reports: false };

function Setting() {
  const { user, getPermissions, updatePermissions } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [savedPermissions, setSavedPermissions] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(getApiUrl("/api/users"), { credentials: "include" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load employees");
        return Array.isArray(result) ? result : result.users || [];
      })
      .then((result) => { setEmployees(result); if (result[0]) setSelectedId(String(result[0].id)); })
      .catch((loadError) => setError(loadError.message));
  }, []);

  if (user && user.role !== "admin") return <Navigate to="/EmployeeDashboard" replace />;

  const selectedEmployee = employees.find((employee) => String(employee.id) === selectedId);
  const selectedPermissions = selectedEmployee ? savedPermissions[selectedEmployee.id] || getPermissions(selectedEmployee) : defaults;

  const togglePermission = async (key) => {
    if (!selectedEmployee || selectedEmployee.role === "admin") return;
    const next = { ...selectedPermissions, [key]: !selectedPermissions[key] };
    setSavedPermissions((current) => ({ ...current, [selectedEmployee.id]: next }));
    setError("");
    try {
      const saved = await updatePermissions(selectedEmployee.id, next);
      setSavedPermissions((current) => ({ ...current, [selectedEmployee.id]: saved }));
      setMessage("Permissions saved");
      window.setTimeout(() => setMessage(""), 2200);
    } catch (saveError) { setError(saveError.message); }
  };

  return (
    <main className="settings-app">
      <header className="settings-topbar"><div><Link to="/dashboard" className="settings-back">Back to dashboard</Link><p className="settings-eyebrow">Apex / administration</p><h1>Access settings</h1><p>Choose which screens each employee can open and work on.</p></div><span className="settings-admin-badge">Admin workspace</span></header>
      {error ? <div className="settings-error" role="alert">{error}</div> : null}
      <div className="settings-layout">
        <aside className="settings-people"><div className="settings-panel-heading"><span>TEAM MEMBERS</span><strong>{employees.length}</strong></div>{employees.map((employee) => <button className={`settings-person ${selectedId === String(employee.id) ? "selected" : ""}`} key={employee.id} onClick={() => setSelectedId(String(employee.id))}><span className="settings-avatar">{employee.name.split(" ").map((part) => part[0]).join("")}</span><span><strong>{employee.name}</strong><small>{employee.role === "admin" ? "Administrator" : employee.email}</small></span><b>›</b></button>)}</aside>
        {selectedEmployee ? <section className="settings-content"><div className="settings-profile"><span className="settings-avatar large">{selectedEmployee.name.split(" ").map((part) => part[0]).join("")}</span><div><p>PERMISSIONS FOR</p><h2>{selectedEmployee.name}</h2><span>{selectedEmployee.email}</span></div><strong className={selectedEmployee.role === "admin" ? "role-admin" : "role-employee"}>{selectedEmployee.role}</strong></div><div className="settings-section-title"><div><h2>Workspace access</h2><p>Changes save immediately to the employee account.</p></div><span>{Object.values(selectedPermissions).filter(Boolean).length} of {permissionLabels.length} enabled</span></div><div className="permission-list">{permissionLabels.map((permission) => <div className="permission-row" key={permission.key}><div><strong>{permission.label}</strong><p>{permission.description}</p></div><button className={`permission-toggle ${selectedPermissions[permission.key] ? "on" : ""}`} aria-pressed={selectedPermissions[permission.key]} onClick={() => togglePermission(permission.key)}><span /></button></div>)}</div><div className="settings-note"><strong>Admin access</strong><p>Administrators always retain access to every workspace. Employees only receive the permissions enabled here.</p></div></section> : <section className="settings-content"><p>No employees found.</p></section>}
      </div>
      {message ? <div className="settings-toast">{message}</div> : null}
    </main>
  );
}
export default Setting;
