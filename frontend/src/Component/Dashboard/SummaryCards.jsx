import React from 'react'

const SummaryCards = ({ icon, text, number }) => {
  return (
    <div>
        <div>
            {icon}

        </div>
        <div>
            <p>{text}</p>
            <p>{number}</p>
        </div>
      
    </div>
  )
}

export default SummaryCards
