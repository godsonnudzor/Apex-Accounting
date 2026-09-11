import React from 'react'

const Add = () => {
  return (
    <div className='p-5'>
      <div>
        <h3 className='text-2xl font-bold'>Add New Department</h3>
        <form>
          <div className='flex flex-col gap-4 mt-4'>
            <Label htmlFor="dep_name"
              className='block mb-1'>
              Department Name
              </Label>
            <input type="text" 
            id="dep_name" 
            name="dep_name" 
            placeholder="Enter dept name" 
            className='px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full' />
          </div>
          <div className='flex flex-col gap-4 mt-4'>
            <Label htmlFor="description"
              className='block mb-1'>
              Description
            </Label>
            <textarea 
              name="description"
              placeholder=" description"
              className='px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full' />
          </div>
        </form>
        <button className='px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 mt-4'>Add Department</button>
      </div> 
    </div>
  )
}

export default Add  
