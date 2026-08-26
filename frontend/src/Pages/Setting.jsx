import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../context/authContext";
import "../App.css";

const employees = [
  { name: "Ama Mensah", email: "ama@apex.com", role: "employee" },
  { name: "Kojo Asante", email: "kojo@apex.com", role: "employee" },
  { name: "Godson Nudzor", email: "admin@apex.com", role: "admin" },
];

const permissionLabels = [
  { key: "dashboard", label: "Dashboard", description: "View financial overview and activity" },
  { key: "writeCheque", label: "Write cheque", description: "Create cash and cheque transactions" },
  { key: "bills", label: "Bills", description: "Create and manage supplier bills" },
  { key: "reports", label: "Reports", description: "Open financial reports" },
];

function Setting() {
  const { user, getPermissions, updatePermissions } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState(employees[0].email);
  const selectedEmployee = employees.find((employee) => employee.email === selectedEmail) || employees[0];
  const selectedPermissions = getPermissions(selectedEmployee);

  if (user && user.role !== "admin") return <Navigate to="/EmployeeDashboard" replace />;

  const togglePermission = (key) => updatePermissions(selectedEmployee.email, { ...selectedPermissions, [key]: !selectedPermissions[key] });

  return (
    <main className="settings-app">
      <header className="settings-topbar"><div><Link to="/dashboard" className="settings-back">Back to dashboard</Link><p className="settings-eyebrow">Apex / administration</p><h1>Access settings</h1><p>Decide which parts of Apex each employee can open and work on.</p></div><span className="settings-admin-badge">Admin workspace</span></header>
      <div className="settings-layout">
        <aside className="settings-people"><div className="settings-panel-heading"><span>TEAM MEMBERS</span><strong>{employees.length}</strong></div>{employees.map((employee) => <button className={`settings-person ${selectedEmail === employee.email ? "selected" : ""}`} key={employee.email} onClick={() => setSelectedEmail(employee.email)}><span className="settings-avatar">{employee.name.split(" ").map((part) => part[0]).join("")}</span><span><strong>{employee.name}</strong><small>{employee.role === "admin" ? "Administrator" : employee.email}</small></span><b>›</b></button>)}</aside>
        <section className="settings-content"><div className="settings-profile"><span className="settings-avatar large">{selectedEmployee.name.split(" ").map((part) => part[0]).join("")}</span><div><p>PERMISSIONS FOR</p><h2>{selectedEmployee.name}</h2><span>{selectedEmployee.email}</span></div><strong className={selectedEmployee.role === "admin" ? "role-admin" : "role-employee"}>{selectedEmployee.role}</strong></div><div className="settings-section-title"><div><h2>Workspace access</h2><p>Choose the screens and actions available to this person.</p></div><span>{Object.values(selectedPermissions).filter(Boolean).length} of {permissionLabels.length} enabled</span></div><div className="permission-list">{permissionLabels.map((permission) => <div className="permission-row" key={permission.key}><div><strong>{permission.label}</strong><p>{permission.description}</p></div><button className={`permission-toggle ${selectedPermissions[permission.key] ? "on" : ""}`} aria-pressed={selectedPermissions[permission.key]} onClick={() => selectedEmployee.role !== "admin" && togglePermission(permission.key)}><span /></button></div>)}</div><div className="settings-note"><strong>How this works</strong><p>An employee can sign in normally, but only enabled screens should appear in their workspace. Changes are saved on this device.</p></div></section>
      </div>
    </main>
  );
}

export default Setting;