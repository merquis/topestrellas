'use client'

import { useEffect, useState } from 'react'

interface GoogleReviewPromptProps {
  googleReviewUrl: string
  language: string
  getTranslation: (key: string) => string
}

export default function GoogleReviewPrompt({ 
  googleReviewUrl, 
  language, 
  getTranslation 
}: GoogleReviewPromptProps) {
  const [timeLeft, setTimeLeft] = useState(300) // 5 minutos

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 0) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const goToReview = () => {
    window.open(googleReviewUrl, '_blank')
  }

  return (
    <div id="resenaBtn">
      <div className="form-section final-step">
        <h3 className="urgent-final">
          <span>{getTranslation('googleReviewTitle')}</span>
        </h3>
        
        <div className="google-timer" id="googleTimer">
          {formatTime(timeLeft)}
        </div>
        
        <div id="googleBtnContainer">
          <button 
            className="google-btn premium-google" 
            onClick={goToReview}
          >
            <span>{getTranslation('googleBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
