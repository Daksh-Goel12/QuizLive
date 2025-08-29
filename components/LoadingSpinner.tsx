'use client'

import { motion } from 'framer-motion'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  text?: string
}

export default function LoadingSpinner({ 
  size = 'md', 
  color = 'text-white',
  text 
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  }

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <motion.div
        className={`${sizeClasses[size]} border-2 border-current border-t-transparent rounded-full ${color}`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
      {text && (
        <p className={`text-sm ${color} opacity-70`}>{text}</p>
      )}
    </div>
  )
}
