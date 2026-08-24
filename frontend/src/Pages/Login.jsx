import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL;
  const isDevelopment = import.meta.env.MODE === "development";
  const apiUrl = isDevelopment
    ? new URL("/api/login", rawApiUrl ? rawApiUrl.trim().replace(/\/+$/, "") : "http://localhost:5000").toString()
    : "/api/login";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get("content-type") || "";
      const isJson = contentType.includes("application/json");
      const result = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const message = isJson
          ? result?.Error || result?.message || "Login failed"
          : result || "Login failed";
        throw new Error(message);
      }

      if (!isJson) {
        throw new Error(result || "Unexpected response from server");
      }

      console.log("Login successful", result);
      navigate("/dashboard"); // Redirect to dashboard on successful login
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-column items-center h-screen justify-center
     bg-gradient-to-b from-teal-600 from-50% to-gray-100 to-50% space-y-6 App">
        <h2 className="font-sevillana text-3xl text-white">Apex ERP</h2>
        <div classname = "border shadow p-6  w-80 bg-white rounded-lg">
          <h3 classname = " text-2xl font-bold md-4">Login</h3>
           <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="text-gray-700">
              <strong>Email</strong>
            </label>
            <input
               className="w-full px-3 py-2 border rounded"
              id="email"
              placeholder="Enter your Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label htmlFor="password" className=" text-gray-700">
              <strong>PassWord</strong>
            </label>
            <input
              className="w-full px-3 py-2 border rounded"
              id="password"
              placeholder="*****"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
        </form>

        </div>
       
        <div className="mb-4 flex items-center justify-between ">
          <label htmlFor="" className="inline-flex items-center text-gray-700">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2 text-gray-700">Remember me</span>
          </label>
        </div>
        <div className="mb-4">
          {error ? <p className="text-danger mt-2">{error}</p> : null}
          <button type="submit" className="btn btn-success w-100 rounded-0" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
    </div>
  );
};

export default Login;
