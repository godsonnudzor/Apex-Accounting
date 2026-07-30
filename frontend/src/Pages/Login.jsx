import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../App.css";

const Login = () => {
  return (
    <div className="d-flex justify-content-center align-items-center  vh-100 App">
      <div className="bg-blue p-3 rounded w-25">
        <h2 className="text-center mb-4">Login</h2>
        <form action="">
          <div>
            <label htmlFor="">
              <strong>Email</strong>
            </label>
            <input placeholder="Enter your Email" type="email" />
          </div>
          <div>
            <label htmlFor="">
              <strong>PassWord</strong>
            </label>
            <input placeholder="*****" type="password" />
          </div>
          <button
            type="submit"
            className="btn btn-success w-100 rounded-0"
          ></button>
        </form>
        <div>
          <p>I do not have account</p>
          <Link to={"/SignUp"}>Create Account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
