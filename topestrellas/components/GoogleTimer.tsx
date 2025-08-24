'use client'

import { useState, useEffect } from 'react'

interface GoogleTimerProps {
  getTranslation: (key: string) => string
  onExpired?: () => void
  startTimer?: boolean
}

export default function GoogleTimer({ getTranslation, onExpired, startTimer = true }: GoogleTimerProps) {
  const [timeLeft, setTimeLeft] = useState(5 * 60) // 5 minutos en segundos
  const [isExpired, setIsExpired] = useState(false)

  useEffect(() => {
    if (!startTimer) return

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsExpired(true)
          if (onExpired) onExpired()
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [startTimer, onExpired])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  if (isExpired) {
    return (
      <div className="google-timer" style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: '#ff0000',
        textAlign: 'center',
        marginBottom: '20px',
        fontFamily: "'Courier New', monospace",
        textShadow: '0 0 20px rgba(255, 0, 0, 0.8)'
      }}>
        {getTranslation('expired')}
      </div>
    )
  }

  return (
    <div 
      className="google-timer" 
      style={{
        fontSize: '48px',
        fontWeight: 'bold',
        color: timeLeft <= 60 ? '#ff0000' : '#fff',
        textAlign: 'center',
        marginBottom: '20px',
        fontFamily: "'Courier New', monospace",
        textShadow: '0 0 20px rgba(255, 0, 0, 0.8)',
        animation: timeLeft <= 60 ? 'timerPulse 1s infinite' : 'none'
      }}
    >
      {formatTime(timeLeft)}
    </div>
  )
}
