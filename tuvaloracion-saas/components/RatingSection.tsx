'use client'

import { useState, useEffect } from 'react'
import { Business } from '@/lib/types'

interface RatingSectionProps {
  onRatingConfirmed: (rating: number) => void
  language: string
  getTranslation: (key: string) => string
  business?: Business
}

export default function RatingSection({ 
  onRatingConfirmed, 
  language, 
  getTranslation,
  business 
}: RatingSectionProps) {
  const [selectedRating, setSelectedRating] = useState(0)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleRatingClick = (rating: number) => {
    setSelectedRating(rating)
    setShowError(false)
    setErrorMessage('')
  }

  const handleConfirm = () => {
    if (selectedRating === 0) {
      setShowError(true)
      setErrorMessage(language === 'es' 
        ? 'Por favor, selecciona al menos una estrella para valorar.' 
        : 'Please select at least one star to rate.')
      
      // Añadir animación de error a las estrellas
      const stars = document.querySelectorAll('.star')
      stars.forEach(star => {
        star.classList.add('pulse-error')
        setTimeout(() => star.classList.remove('pulse-error'), 800)
      })
      
      return
    }
    onRatingConfirmed(selectedRating)
  }

  // Emoji de cara según la calificación
  const getFaceEmoji = (rating: number) => {
    const faces = ['🤔', '😢', '😕', '😐', '😊', '😍']
    return faces[rating] || '🤔'
  }

  return (
    <div className="rating-section">
      <p className="rating-instruction">
        {getTranslation('ratingInstruction')}
      </p>
      
      <div className="stars">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={`star ${selectedRating >= star ? 'active' : ''} ${showError ? 'pulse-error' : ''}`}
            onClick={() => handleRatingClick(star)}
          >
            ★
          </span>
        ))}
        <span className="rating-face">{selectedRating > 0 ? getFaceEmoji(selectedRating) : '🤔'}</span>
      </div>

      <div className={`rating-error ${showError ? '' : 'hidden'}`}>
        {errorMessage}
      </div>

      <div id="valorarBtnContainer">
        <button 
          className="confirmation-btn premium-btn"
          id="valorarBtn"
          onClick={handleConfirm}
        >
          <span id="btnText">{getTranslation('confirmRating')}</span>
        </button>
      </div>
    </div>
  )
}
