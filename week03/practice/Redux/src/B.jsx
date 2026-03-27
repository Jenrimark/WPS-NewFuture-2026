import React from 'react'

export default function B({ setCount }) {
  return (
    <div>B
      <button onClick={() => setCount(8)}>Increment</button>
    </div>
  )
}
