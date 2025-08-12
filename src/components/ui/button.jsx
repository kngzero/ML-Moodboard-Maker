
import React from 'react'
export const Button = ({ variant='default', size='md', className='', ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-neutral-400 disabled:opacity-50 disabled:pointer-events-none'
  const variants = {
    default: 'bg-neutral-900 text-white hover:bg-neutral-800 border border-neutral-900',
    secondary: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 border border-neutral-300',
    outline: 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-50',
    ghost: 'bg-transparent text-neutral-900 hover:bg-neutral-100',
    destructive: 'bg-white text-red-600 border border-red-500 hover:bg-red-50'
  }
  const sizes = { sm: 'h-8 px-2', md: 'h-10 px-4', lg: 'h-12 px-6', icon: 'h-10 w-10 p-0' }
  const cls = [base, variants[variant]||variants.default, sizes[size]||sizes.md, className].join(' ')
  return <button className={cls} {...props} />
}
