import React from 'react'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt, FaMoneyBill, FaUsers,FaBuilding, FaCalendar } from 'react-icons/fa'


const payrollSidebar = () => {
  return (
    <div className='bg-gray-800 text-white h-screen fixed left-0 top-0 bottom-0 space-y-2 w-64 '>
        <div className='bg-teal-600 h-12 flex  items-center justify-center'>
           <h3 className='text-2xl text-center font-pacific'>Payroll </h3>
        </div>
        <div className='px-4'>
            <NavLink to="/payroll" className={({ isActive }) => isActive ? 'bg-teal-600 text-white rounded-md px-2 py-1 flex items-center space-x-2' : 'text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-2 py-1 flex items-center space-x-2'}>
                <FaTachometerAlt /> <span>Payroll</span>
            </NavLink>
            <NavLink to="/employees" className={({ isActive }) => isActive ? 'bg-teal-600 text-white rounded-md px-2 py-1 flex items-center space-x-2' : 'text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-2 py-1 flex items-center space-x-2'}>
                <FaUsers /> <span>Employees List</span>
            </NavLink>
             <NavLink to="/departments" className={({ isActive }) => isActive ? 'bg-teal-600 text-white rounded-md px-2 py-1 flex items-center space-x-2' : 'text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-2 py-1 flex items-center space-x-2'}>
                <FaBuilding /> <span>Departments</span>
            </NavLink>
            <NavLink to="/leave" className={({ isActive }) => isActive ? 'bg-teal-600 text-white rounded-md px-2 py-1 flex items-center space-x-2' : 'text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-2 py-1 flex items-center space-x-2'}>
                <FaCalendar /> <span>Leave</span>
            </NavLink>
            <NavLink to="/salaries" className={({ isActive }) => isActive ? 'bg-teal-600 text-white rounded-md px-2 py-1 flex items-center space-x-2' : 'text-gray-300 hover:bg-gray-700 hover:text-white rounded-md px-2 py-1 flex items-center space-x-2'}>
                <FaMoneyBill /> <span>Salaries</span>
            </NavLink>
        </div>
      
    </div>
  )
}

export default payrollSidebar
