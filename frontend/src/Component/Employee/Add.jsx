import { useEffect, useState } from "react";
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
  departmentId: "",
  basicPay: "",
  password: "",
  confirmPassword: "",
};

const Add = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const response = await fetch(getApiUrl("/api/departments"), {
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Unable to load departments");
        }

        setDepartments(result.departments || []);
      } catch (loadError) {
        setError(loadError.message);
      } finally {
        setDepartmentsLoading(false);
      }
    };

    loadDepartments();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const updateField = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5MB.");
      return;
    }

    setError("");
    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      const formData = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        if (key !== "confirmPassword") {
          formData.append(key, value);
        }
      });

      if (profileImage) {
        formData.append("profile_image", profileImage);
      }

      const response = await fetch(getApiUrl("/api/employees"), {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to add employee");
      }

      navigate("/employees");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-600">
              Employee management
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              Add employee
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Create a new employee account and profile.
            </p>
          </div>

          <Link
            to="/employees"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Back to employees
          </Link>
        </div>

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-2xl bg-white shadow-lg"
        >
          <div className="border-b border-slate-200 bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-5 text-white">
            <h2 className="text-lg font-semibold">Employee information</h2>
            <p className="text-sm text-teal-50">
              Complete the details below to add an employee.
            </p>
          </div>

          <div className="space-y-8 p-6">
            <section>
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Personal details
              </h3>

              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ["firstName", "First name", "text"],
                  ["lastName", "Last name", "text"],
                  ["dateOfBirth", "Date of birth", "date"],
                  ["email", "Email address", "email"],
                  ["qualification", "Qualification", "text"],
                  ["basicPay", "Basic pay", "number"],
                ].map(([name, label, type]) => (
                  <div key={name}>
                    <label
                      htmlFor={name}
                      className="mb-1.5 block text-sm font-medium text-slate-700"
                    >
                      {label}
                    </label>

                    <input
                      id={name}
                      name={name}
                      type={type}
                      value={form[name]}
                      onChange={updateField}
                      required={!["qualification"].includes(name)}
                      min={type === "number" ? "0" : undefined}
                      step={type === "number" ? "0.01" : undefined}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Work details
              </h3>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label htmlFor="departmentId" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Department
                  </label>
                  <select
                    id="departmentId"
                    name="departmentId"
                    value={form.departmentId}
                    onChange={updateField}
                    required
                    disabled={departmentsLoading}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">
                      {departmentsLoading ? "Loading..." : "Select department"}
                    </option>
                    {departments.map((department) => (
                      <option key={department.id} value={department.id}>
                        {department.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="sex" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Sex
                  </label>
                  <select
                    id="sex"
                    name="sex"
                    value={form.sex}
                    onChange={updateField}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="">Select sex</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="role" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={form.role}
                    onChange={updateField}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  >
                    <option value="employee">Employee</option>
                    <option value="admin">Admin</option>
                    <option value="user">User</option>
                    <option value="public">Public</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h3 className="mb-4 text-base font-semibold text-slate-900">
                Profile and security
              </h3>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="profile_image" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Profile image
                  </label>

                  <input
                    id="profile_image"
                    name="profile_image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-3 file:py-2 file:text-teal-700"
                  />

                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      className="mt-4 h-24 w-24 rounded-full object-cover ring-4 ring-teal-50"
                    />
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Password
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={updateField}
                      required
                      minLength="6"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-slate-700">
                      Confirm password
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      value={form.confirmPassword}
                      onChange={updateField}
                      required
                      minLength="6"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    />
                  </div>
                </div>
              </div>
            </section>

            {error && (
              <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end border-t border-slate-200 pt-6">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-teal-600 px-6 py-3 font-medium text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creating employee..." : "Create employee"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
};

export default Add;