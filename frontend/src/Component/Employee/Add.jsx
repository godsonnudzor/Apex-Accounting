import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getApiUrl } from "../../context/auth";

const initialForm = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  sex: "",
  email: "",
  qualification: "",
  role: "employee",
  department: "",
  basicPay: "",
  profileImage: "",
  password: "",
};

const Add = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const response = await fetch(getApiUrl("/api/employees"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Unable to add employee");
      navigate("/employees");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const fields = [
    ["firstName", "First name", "text"],
    ["lastName", "Last name", "text"],
    ["dateOfBirth", "Date of birth", "date"],
    ["email", "Email address", "email"],
    ["qualification", "Qualification", "text"],
    ["department", "Department", "text"],
    ["basicPay", "Basic pay", "number"],
    ["profileImage", "Profile image URL", "url"],
    ["password", "Password", "password"],
  ];

  return (
    <main className="mx-auto mt-8 max-w-4xl px-4 pb-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-600">People</p>
          <h1 className="text-3xl font-bold text-slate-900">Add employee</h1>
        </div>
        <Link to="/employees" className="text-sm text-teal-600 hover:underline">Back to employees</Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-md bg-white p-6 shadow-md">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([name, label, type]) => (
            <div key={name}>
              <label htmlFor={name} className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
              <input
                id={name}
                name={name}
                type={type}
                value={form[name]}
                onChange={updateField}
                required={!['qualification', 'profileImage'].includes(name)}
                min={type === "number" ? "0" : undefined}
                step={type === "number" ? "0.01" : undefined}
                className="w-full rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
          <div>
            <label htmlFor="sex" className="mb-1 block text-sm font-medium text-slate-700">Sex</label>
            <select id="sex" name="sex" value={form.sex} onChange={updateField} required className="w-full rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Select sex</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
          <div>
            <label htmlFor="role" className="mb-1 block text-sm font-medium text-slate-700">Role</label>
            <select id="role" name="role" value={form.role} onChange={updateField} className="w-full rounded-md border border-slate-300 p-2 focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="employee">Employee</option>
              <option value="admin">Admin</option>
            </select>
          </div>
        </div>
        {error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}
        <button type="submit" disabled={saving} className="mt-6 rounded bg-teal-500 px-4 py-2 text-white hover:bg-teal-600 disabled:opacity-50">
          {saving ? "Saving..." : "Add employee"}
        </button>
      </form>
    </main>
  );
};

export default Add;
