import React from 'react'
import PayrollDashboardSidebar from '../Component/Dashboard/payrollSidebar'
import NavBar from '../Component/Dashboard/navBar'

const PayrollDashboard = props => {
  return (
    <div className='flex'>
        <PayrollDashboardSidebar />
        <div className='flex-1 ml-64 bg-gray-100 h-screen'>
          <NavBar />
        </div>
      
    </div>
  )
}



export default PayrollDashboard
