import { Link } from "react-router-dom";
import { useAuth } from "../context/auth";

const actions = [
  { permission: "payroll", label: "Payroll", description: "Review payroll activity and compensation.", to: "/PayrollDashboard", tone: "bg-teal-600" },
  { permission: "leaveManagement", label: "Leave", description: "Open leave records and requests.", to: "/leaveManagement", tone: "bg-amber-500" },
  { permission: "salaries", label: "Salary", description: "View salary records for your workspace.", to: "/salary", tone: "bg-sky-600" },
  { permission: "employeeManagement", label: "People", description: "Browse employee information.", to: "/employees", tone: "bg-indigo-600" },
  { permission: "reports", label: "Reports", description: "Open the reports available to you.", to: "/Reports", tone: "bg-slate-700" },
  { permission: "taxJurisdictions", label: "Tax analyzer", description: "Calculate and save tax scenarios.", to: "/tax-analyzer", tone: "bg-rose-600" },
];

const initialsFor = (name = "Employee") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

const EmployeeCenter = () => {
  const { user, hasPermission } = useAuth();
  const displayName = user?.name || "Employee";
  const visibleActions = actions.filter(({ permission }) => hasPermission(permission));
  const role = user?.role === "admin" ? "Administrator" : "Employee";

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8 md:py-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 rounded-2xl bg-slate-900 p-6 text-white shadow-xl md:flex-row md:items-end md:justify-between md:p-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-teal-300">Apex / employee center</p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Good to see you, {displayName.split(" ")[0]}.</h1>
            <p className="mt-2 max-w-xl text-sm text-slate-300">Your workspace for the people, payroll, and finance tools available to your account.</p>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-teal-500 text-sm font-bold text-white">{initialsFor(displayName)}</span>
            <span>
              <strong className="block text-sm">{displayName}</strong>
              <span className="text-xs text-slate-400">{role}</span>
            </span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Your workspace</p>
                <h2 className="mt-1 text-2xl font-bold">Quick access</h2>
              </div>
              <span className="text-sm text-slate-500">{visibleActions.length} available</span>
            </div>
            {visibleActions.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {visibleActions.map(({ label, description, to, tone }) => (
                  <Link key={to} to={to} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md">
                    <span className={`mb-5 grid h-10 w-10 place-items-center rounded-lg text-lg font-bold text-white ${tone}`} aria-hidden="true">{label[0]}</span>
                    <h3 className="text-lg font-semibold text-slate-900">{label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
                    <span className="mt-4 inline-block text-sm font-semibold text-teal-700 group-hover:text-teal-800">Open workspace &rarr;</span>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">No additional workspaces are enabled for your account.</div>
            )}
          </div>

          <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Account details</p>
            <div className="mt-5 space-y-4 text-sm">
              <div>
                <span className="block text-xs text-slate-400">Name</span>
                <strong>{displayName}</strong>
              </div>
              <div>
                <span className="block text-xs text-slate-400">Email</span>
                <strong className="break-words">{user?.email || "Not provided"}</strong>
              </div>
              <div>
                <span className="block text-xs text-slate-400">Role</span>
                <strong>{role}</strong>
              </div>
            </div>
            <div className="mt-6 border-t border-slate-100 pt-5">
              <p className="text-xs leading-5 text-slate-500">Access is managed by your administrator. Contact them if a workspace you need is missing.</p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
};

export default EmployeeCenter;