import React from 'react'
import SummaryCards from './SummaryCards'
import { FaUsers } from 'react-icons/fa'

const payrollSummary = () => {
  return (
    <div className="p-6">
        <h3 className="text-2xl font-bold ">Payroll Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3  gap-4 mt-6">
            <SummaryCards icon={FaUsers} text="Total Employees" number={100} />
        </div>
    </div>
  )
}

export default payrollSummary