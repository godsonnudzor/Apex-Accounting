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
          to="/payroll"
          className={({ isActive }) =>`${isActive ? "bg-teal-500" : ""}
            flex items-center space-x-4 block py-2.5 px-4 rounded text-white }`
          }
        >
          <FaTachometerAlt /> <span>Payroll dashboard</span>
        </NavLink>
        <NavLink
          to="/employees"
          className= 'flex items-center space-x-4 block py-2.5 px-4 rounded text-white '  
        >
          <FaUsers /> <span>Employees List</span>
        </NavLink>
        <NavLink
          to="/departments"
          className='flex items-center space-x-4 block py-2.5 px-4 rounded text-white' 
        >
          <FaBuilding /> <span>Departments</span>
        </NavLink>
        <NavLink
          to="/leave"
          className='flex items-center space-x-4 block py-2.5 px-4 rounded text-white' 
        >
          <FaCalendar /> <span>Leave</span>
        </NavLink>
        <NavLink
          to="/salaries"
          className='flex items-center space-x-4 block py-2.5 px-4 rounded text-white' 
        >
          <FaMoneyBill /> <span>Salaries</span>
        </NavLink>
      </div>
    </div>
  );
};

export default payrollSidebar;
