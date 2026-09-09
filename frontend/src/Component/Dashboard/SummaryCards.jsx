import React from 'react'

const SummaryCards = ({ icon, text, number, colour }) => {
  const Icon = icon

  return (
    <div className="bg-white rounded flex ">
        <div className={`text-3xl ${colour || 'bg-teal-600'} p-4  flex items-center justify-center`}>
            <Icon />
        </div>
        <div className="pl-4 py-1">
            <p className="text-lg font-semibold">{text}</p>
            <p className="text-xl font-bold">{number}</p>
        </div>
      
    </div> 
  )
}

export default SummaryCards
