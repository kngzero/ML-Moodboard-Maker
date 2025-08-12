
import React from 'react'
export const Card = ({ className='', ...props }) => <div className={['bg-white border border-neutral-200 rounded-xl', className].join(' ')} {...props} />
export const CardHeader = ({ className='', ...props }) => <div className={['p-4 border-b border-neutral-200', className].join(' ')} {...props} />
export const CardTitle = ({ className='', ...props }) => <h3 className={['text-lg font-semibold', className].join(' ')} {...props} />
export const CardContent = ({ className='', ...props }) => <div className={['p-4', className].join(' ')} {...props} />
