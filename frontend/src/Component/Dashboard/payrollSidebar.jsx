import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaMoneyBill,
  FaUsers,
  FaBuilding,
  FaCalendar,
} from "react-icons/fa";

const payrollSidebar = () => {
  return (
    <div className="bg-gray-800 text-white h-screen fixed left-0 top-0 bottom-0 space-y-2 w-64 ">
      <div className="bg-teal-600 h-12 flex  items-center justify-center">
        <h3 className="text-2xl text-center font-pacific">Payroll </h3>
      </div>
      <div className="px-4">
        <NavLink
          to="/PayrollDashboard"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`
          }
        >
          <FaTachometerAlt /> <span>Payroll dashboard</span>
        </NavLink>
        <NavLink
          to="/employees"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
        >
          <FaUsers /> <span>Employees List</span>
        </NavLink>
        <NavLink
          to="/department"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
        >
          <FaBuilding /> <span>Departments</span>
        </NavLink>
        <NavLink
          to="/leave"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
        >
          <FaCalendar /> <span>Leave</span>
        </NavLink>
        <NavLink
          to="/salary"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
        >
          <FaMoneyBill /> <span>Salaries</span>
        </NavLink>
      </div>
    </div>
  );
};

export default payrollSidebar;
