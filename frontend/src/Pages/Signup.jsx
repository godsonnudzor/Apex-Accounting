import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const SignUp = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  const apiUrl = import.meta.env.MODE === "development"
    ? new URL("/api/signup", rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:5000").toString()
    : "/api/signup";

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to create account");
      }

      setSuccess("Account created. Redirecting to login...");
      setTimeout(() => navigate("/"), 700);
    } catch (submitError) {
      setError(submitError.message || "Unable to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center  vh-100 App">
      <div className="bg-blue p-3 rounded w-25">
        <h2 className="text-center mb-4">Create Account</h2>
        <form onSubmit={handleSubmit} className="d-flex flex-column">
          <label htmlFor="name">Name</label>
          <input id="name" name="name" type="text" value={form.name} onChange={handleChange} required />
          <label htmlFor="email">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" value={form.password} onChange={handleChange} required minLength={6} />
          {error ? <p className="text-danger mt-2">{error}</p> : null}
          {success ? <p className="text-success mt-2">{success}</p> : null}
          <button type="submit" className="btn btn-success w-100 rounded-0 mt-3" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <p className="mt-3 mb-0">Already have an account? <Link to="/">Login</Link></p>
      </div>
    </div>
  );
};

export default SignUp;
