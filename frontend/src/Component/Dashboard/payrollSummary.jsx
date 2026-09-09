import React from 'react'
import SummaryCards from './SummaryCards'
import { FaUsers, FaBuilding, FaMoneyBillAlt, FaFileAlt, FaRegCheckCircle, FaHourglassHalf } from 'react-icons/fa'

const payrollSummary = () => {
  return (
    <div className="p-6">
        <h3 className="text-2xl font-bold ">Payroll Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-3  gap-4 mt-6">
            <SummaryCards icon={FaUsers} text="Total Employees" number={13} colour="bg-blue-600" />
            <SummaryCards icon={FaBuilding} text="Total Departments" number={4} colour="bg-yellow-600" />
            <SummaryCards icon={FaMoneyBillAlt} text="Total Salaries" number={100000} colour="bg-red-600" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2  gap-4 mt-6">
            <SummaryCards icon={FaFileAlt} text="Leave Applied" number={5} colour="bg-teal-600" />
            <SummaryCards icon={FaRegCheckCircle} text="Leave Approved" number={3} colour="bg-green-200" />
            <SummaryCards icon={FaHourglassHalf} text="Leave Pending" number={1} colour="bg-yellow-600" />
            <SummaryCards icon={FaHourglassHalf} text="Leave Rejected" number={1} colour="bg-red-600" />
        </div>
    </div>
  )
}

export default payrollSummary