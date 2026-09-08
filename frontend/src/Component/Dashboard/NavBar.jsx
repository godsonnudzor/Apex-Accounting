import React from 'react'
import { useAuth } from '../../context/authContext';

const navBar = () => {
  const { user } = useAuth();

  return (
    <div className='flex justify-between h-12 items-center p-4 bg-teal-600 text-white'>
        <p>Welcome, {user?.name || "Employee"}</p>
        <button className="bg-teal-500 text-white px-4 py-2 rounded">Logout</button>
      
    </div>
  )
}

export default navBar
