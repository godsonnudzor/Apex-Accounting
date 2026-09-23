import React from "react";
import { NavLink } from "react-router-dom";
import {
  FaTachometerAlt,
  FaMoneyBill,
  FaBalanceScale,
  FaBook,
  FaTruck,
  FaUsers,
  FaBuilding,
  FaCalendar,
  FaList,
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
         {hasPermission("departments") ? <NavLink
          to="/department"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaBuilding /> <span>Departments</span>
        </NavLink> : null}
        {hasPermission("employeeManagement") ? <NavLink
          to="/employees"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaUsers /> <span>Employees</span>
        </NavLink> : null}

         {hasPermission("salaries") ? <NavLink
          to="/salary"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaMoneyBill /> <span>Salaries</span>
        </NavLink> : null}
        {hasPermission("salaries") ? <NavLink
          to="/payroll-liabilities"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaBalanceScale /> <span>Payroll liabilities</span>
        </NavLink> : null}
        {hasPermission("writeCheque") ? <NavLink
          to="/journal"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaBook /> <span>Journal</span>
        </NavLink> : null}
        {hasPermission("writeCheque") ? <NavLink
          to="/chart-of-accounts"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaList /> <span>Chart of accounts</span>
        </NavLink> : null}
        {hasPermission("writeCheque") ? <NavLink
          to="/suppliers"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaTruck /> <span>Suppliers</span>
        </NavLink> : null}
         {hasPermission("leaveManagement") ? <NavLink
          to="/leaveManagement"
          className={({ isActive }) => `${isActive ? "bg-teal-500" : ""} flex items-center space-x-4 block py-2.5 px-4 rounded text-white no-underline`}
          end
        >
          <FaCalendar /> <span>Leave </span>
        </NavLink> : null}
      </div>
    </div>
  );
};

export default PayrollDashboardSidebar;
