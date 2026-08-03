import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../App.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const apiBaseUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${apiBaseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.Error || result?.message || "Login failed");
      }

      console.log("Login successful", result);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 App">
      <div className="bg-blue p-3 rounded w-25">
        <h2 className="text-center mb-4">Login</h2>
        <form onSubmit={handleSubmit} className="d-flex flex-column">
          <div>
            <label htmlFor="email">
              <strong>Email</strong>
            </label>
            <input
              id="email"
              placeholder="Enter your Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password">
              <strong>PassWord</strong>
            </label>
            <input
              id="password"
              placeholder="*****"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error ? <p className="text-danger mt-2">{error}</p> : null}
          <button type="submit" className="btn btn-success w-100 rounded-0" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
        <div>
          <p>I do not have account</p>
          <Link to="/signup">Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
