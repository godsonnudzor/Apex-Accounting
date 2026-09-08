import React from 'react'
import { NavLink } from 'react-router-dom'
import { FaTachometerAlt } from 'react-icons/fa'

const payrollSidebar = () => {
  return (
    <div>
        <div className='sidebarWrapper'>
           <h3>Payroll Sidebar</h3>
        </div>
        <div>
            <NavLink to="/PayrollDashboard" className={({ isActive }) => (isActive ? 'active' : '')}>
                <FaTachometerAlt /> <span>Payroll</span>
            </NavLink>
        </div>
      
    </div>
  )
}

export default payrollSidebar
