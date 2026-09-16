import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadEmployees = async () => {
      try {
        const response = await fetch(getApiUrl("/api/employees"), {
          credentials: "include",
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Unable to load employees");
        if (active) setEmployees(result.employees || []);
      } catch (loadError) {
        if (active) setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadEmployees();
    return () => {
      active = false;
    };
  }, []);

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter((employee) =>
      [employee.name, employee.email, employee.role]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [employees, search]);

  return (
    <main className="p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">People</p>
          <h1 className="text-3xl font-bold text-slate-900">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">View the employee accounts in your workspace.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            type="search"
            aria-label="Search employees"
            placeholder="Search name, email, or role"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 sm:w-80"
          />
          <Link to="/employees/add" className="rounded bg-teal-500 px-4 py-2 text-center text-white hover:bg-teal-600">Add employee</Link>
        </div>
      </div>

      {error && <p className="mb-4 rounded bg-red-50 px-4 py-3 text-red-700" role="alert">{error}</p>}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-slate-50 text-left text-sm text-slate-600">
            <th className="border-b border-slate-200 px-4 py-3">Name</th>
            <th className="border-b border-slate-200 px-4 py-3">Email</th>
            <th className="border-b border-slate-200 px-4 py-3">Role</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr><td colSpan="3" className="px-4 py-8 text-center text-slate-500">Loading employees...</td></tr>
          ) : filteredEmployees.length ? (
            filteredEmployees.map((employee) => (
              <tr key={employee.id} className="hover:bg-slate-50">
                <td className="border-b border-slate-100 px-4 py-4 font-semibold text-slate-900">{employee.name || "Unnamed employee"}</td>
                <td className="border-b border-slate-100 px-4 py-4 text-slate-600">{employee.email}</td>
                <td className="border-b border-slate-100 px-4 py-4 capitalize text-slate-600">{employee.role}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="px-4 py-8 text-center text-slate-500">No employees found.</td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </main>
  );
};

export default Employees;