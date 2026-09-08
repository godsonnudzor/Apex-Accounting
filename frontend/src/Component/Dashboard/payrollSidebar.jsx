import React from 'react'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt, FaMoneyBill, FaUsers,FaBuilding, FaCalendar } from 'react-icons/fa'


const payrollSidebar = () => {
  return (
    <div className='bg-gray-800 text-white h-screen fixed left-0 top-0 bottom-0 space-y-2 w-64 '>
        <div className='bg-teal-600 h-12 flex  items-center justify-center'>
           <h3 className='text-2xl text-center font-pacific'>Payroll Sidebar</h3>
        </div>
        <div>
            <NavLink to="/payroll">
                <FaTachometerAlt /> <span>Payroll</span>
            </NavLink>
            <NavLink to="/employees">
                <FaUsers /> <span>Employees List</span>
            </NavLink>
             <NavLink to="/departments">
                <FaBuilding /> <span>Departments</span>
            </NavLink>
            <NavLink to="/leave">
                <FaCalendar /> <span>Leave</span>
            </NavLink>
            <NavLink to="/salaries">
                <FaMoneyBill /> <span>Salaries</span>
            </NavLink>
        </div>
      
    </div>
  )
}

export default payrollSidebar
