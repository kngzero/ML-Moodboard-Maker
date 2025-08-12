
import React from 'react'
export const Switch = ({ checked, onCheckedChange, id }) => (
  <input id={id} type="checkbox" checked={!!checked} onChange={e=>onCheckedChange?.(e.target.checked)} className="h-4 w-4 accent-neutral-900 cursor-pointer" />
)
