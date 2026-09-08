import React from 'react'

const SummaryCards = ({ icon, text, number }) => {
  const Icon = icon

  return (
    <div>
        <div>
            <Icon />

        </div>
        <div>
            <p>{text}</p>
            <p>{number}</p>
        </div>
      
    </div>
  )
}

export default SummaryCards
