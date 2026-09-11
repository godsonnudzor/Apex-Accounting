import React from 'react'
import { Link } from 'react-router-dom'


const Department = () => {
  return (
    <div>
      <div>
        <h3>Manage Departments</h3>
      </div>
      <div>
        <input type="text" placeholder="Search by departments Name..." />
        <Link to="/department/add">Add New Department</Link>

      </div>
    </div>
  )
}

export default Department