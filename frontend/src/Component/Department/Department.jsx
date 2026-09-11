import React from 'react'
import { Link } from 'react-router-dom'


const Department = () => {
  return (
    <div>
      <div className='text-center'>
        <h3 className='text-2xl font-bold'>Manage Departments</h3>
      </div>
      <div className='flex justify-between items-center p-4'>
        <input type="text" placeholder="Search by departments Name..." className='px-4 py-0.5 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500' />
        <Link to="/department/add" className='px-4 py-1 bg-teal-500 text-white rounded hover:bg-teal-600'>Add New Department</Link>

      </div>
    </div>
  )
}

export default Department