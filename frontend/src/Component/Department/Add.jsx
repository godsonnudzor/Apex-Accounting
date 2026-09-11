import React from 'react'

const Add = () => {
  return (
    <div className='max-w-3xl mx-auto mt-10 bg-white p-8 rounded-md shadow-md w-96'>
      <div>
        <h3 className='text-2xl font-bold mb-6'>
          Add New Department
        </h3>
        <form>
          <div >
            <label htmlFor="dep_name"
              className='text-sm font-medium text-gray-700 '>
              Department Name
            </label>
            <input type="text" 
            name="dep_name" 
            placeholder="Enter dept name" 
            className='mt-1 w-full p-2 border border-gray-300 rounded-md' />
          </div>
          <div className=' mt-3'>
            <label htmlFor="description"
              className='text-sm font-medium text-gray-700 mb-1 block'>
              Description
            </label>
            <textarea 
              name="description"
              placeholder="Enter description"
              rows ={4}
              className='block mt-1 p-2 w-full border border-gray-300 rounded-md' />
          </div>
           <button 
        type="submit"
        className='px-4 py-2 bg-teal-500 text-white  rounded hover:bg-teal-600 mt-4'>
          Add Department
        </button>
        </form>   
      </div> 
    </div>
  )
}

export default Add  
