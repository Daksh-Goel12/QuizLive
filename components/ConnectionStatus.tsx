'use client'

import { useEffect, useState } from 'react'
import { Wifi, WifiOff } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
}

export default function ConnectionStatus({ isConnected }: ConnectionStatusProps) {
  const [showStatus, setShowStatus] = useState(false)

  useEffect(() => {
    setShowStatus(true)
    if (isConnected) {
      const timer = setTimeout(() => setShowStatus(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [isConnected])

  if (!showStatus) return null

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center space-x-2 px-4 py-2 rounded-lg ${
      isConnected 
        ? 'bg-green-500 text-white' 
        : 'bg-red-500 text-white'
    }`}>
      {isConnected ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span className="text-sm font-medium">
        {isConnected ? 'Connected' : 'Disconnected'}
      </span>
    </div>
  )
}
