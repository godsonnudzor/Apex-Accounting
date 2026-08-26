import React, { useState } from "react";
import "../App.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/authContext";


const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const data = await login(email, password);
      const role = data?.user?.role || data?.role;

      if (role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/EmployeeDashboard");
      }
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-column items-center h-screen justify-center
     bg-gradient-to-b from-teal-600 from-50% to-gray-100 to-50% space-y-6 App">
        <h2 className="font-pacific text-3xl text-white">Apex Accounting ERP</h2>
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
          {error ? <p className="text-danger mt-2">{error}</p> : null}
          <button type="submit" className="btn btn-success w-100 rounded-0" disabled={submitting}>
            {submitting ? "Logging in..." : "Login"}
          </button>
        </form>
        </div>
       
        <div className="mb-4 flex items-center justify-between ">
          <label htmlFor="" className="inline-flex items-center text-gray-700">
            <input type="checkbox" className="form-checkbox" />
            <span className="ml-2 text-gray-700">Remember me</span>
          </label>
         
        </div>
    </div>
  );
};

export default Login;
