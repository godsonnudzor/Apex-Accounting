import React from 'react'
import SummaryCards from './SummaryCards'
import { FaUsers } from 'react-icons/fa'

const payrollSummary = () => {
  return (
    <div>
        <h3>Payroll Overview</h3>
        <div>
            <SummaryCards icon={FaUsers} text="Total Employees" number={100} />
        </div>
    </div>
  )
}

export default payrollSummary