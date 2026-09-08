import React from 'react'
import { useAuth } from '../../context/authContext';

const navBar = () => {
  const { user } = useAuth();

  return (
    <div className='flex justify-between items-center h-12 p-4 bg-teal-600 text-white px-5'>
        <p>Welcome, {user?.name || "Employee"}</p>
        <button className="bg-teal-500 text-white px-4 py-2 rounded hover:bg-teal-700">Logout</button>
      
    </div>
  )
}

export default navBar
