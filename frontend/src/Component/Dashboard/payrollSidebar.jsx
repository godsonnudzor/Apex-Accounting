import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaMoneyBill,
  FaUsers,
  FaBuilding,
  FaCalendar,
} from "react-icons/fa";
import { useAuth } from "../../context/auth";

const PayrollDashboardSidebar = () => {
  const { hasPermission } = useAuth();

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
          end
        >
          <FaTachometerAlt /> <span>Payroll dashboard</span>
        </NavLink>
         <NavLink
          to="/department"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaBuilding /> <span>Departments</span>
        </NavLink>
         <NavLink
          to="/salary"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaMoneyBill /> <span>Salaries</span>
        </NavLink>
         <NavLink
          to="/leaveManagement"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaCalendar /> <span>Leave </span>
        </NavLink>
      </div>
    </div>
  );
};

export default PayrollDashboardSidebar;
