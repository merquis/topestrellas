'use client'

import { useState, useEffect } from 'react'

interface RatingSectionProps {
  rating: number
  onRatingChange: (rating: number) => void
  onRateNow: () => void
  getTranslation: (key: string) => string
  error?: string
}

export default function RatingSection({ 
  rating, 
  onRatingChange, 
  onRateNow, 
  getTranslation,
  error 
}: RatingSectionProps) {
  const [ratingFace, setRatingFace] = useState('🤔')
  const [hoveredStar, setHoveredStar] = useState(0)

  const getFaceForRating = (value: number) => {
    switch (value) {
      case 0: return '🤔'
      case 1: return '😞'
      case 2: return '😕'
      case 3: return '😐'
      case 4: return '🙂'
      case 5: return '😊'
      default: return '🤔'
    }
  }

  useEffect(() => {
    setRatingFace(getFaceForRating(hoveredStar || rating))
  }, [rating, hoveredStar])

  const handleStarClick = (value: number) => {
    onRatingChange(value)
    
    // Añadir efecto de activación
    const stars = document.querySelectorAll('.star')
    stars.forEach((star, index) => {
      const starElement = star as HTMLElement
      if (index < value) {
        starElement.classList.add('active')
        // Añadir animación temporal
        starElement.style.animation = 'starActivate 0.3s ease'
        setTimeout(() => {
          starElement.style.animation = ''
        }, 300)
      } else {
        starElement.classList.remove('active')
      }
    })
  }

  const handleStarHover = (value: number) => {
    setHoveredStar(value)
    
    // Efecto hover en las estrellas
    const stars = document.querySelectorAll('.star')
    stars.forEach((star, index) => {
      const starElement = star as HTMLElement
      if (index < value) {
        starElement.classList.add('hover')
      } else {
        starElement.classList.remove('hover')
      }
    })
  }

  const handleStarLeave = () => {
    setHoveredStar(0)
    
    // Limpiar efectos hover
    const stars = document.querySelectorAll('.star')
    stars.forEach(star => {
      star.classList.remove('hover')
    })
  }

  return (
    <div className="rating-section">
      <p className="rating-instruction">{getTranslation('ratingInstruction')}</p>
      
      <div className="stars" id="rating">
        {[1, 2, 3, 4, 5].map(value => (
          <span
            key={value}
            className={`star ${rating >= value ? 'active' : ''} ${error ? 'pulse-error' : ''}`}
            data-value={value}
            onClick={() => handleStarClick(value)}
            onMouseEnter={() => handleStarHover(value)}
            onMouseLeave={handleStarLeave}
            style={{
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              color: rating >= value || hoveredStar >= value ? '#ffd700' : '#666',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)',
              padding: '0 10px',
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '50px',
              height: '50px',
              fontSize: window.innerWidth <= 480 ? '40px' : '50px',
              transform: rating >= value ? 'scale(1.1)' : 'scale(1)'
            }}
          >
            ★
          </span>
        ))}
        <span className="rating-face" style={{ fontSize: window.innerWidth <= 480 ? '36px' : '48px' }}>
          {ratingFace}
        </span>
      </div>

      {error && (
        <div className="rating-error" style={{ 
          color: '#ff4757',
          fontSize: '14px',
          marginTop: '10px',
          marginBottom: '15px',
          height: '20px',
          transition: 'opacity 0.3s ease'
        }}>
          {error}
        </div>
      )}

      <div id="valorarBtnContainer">
        <button 
          className="confirmation-btn premium-btn" 
          onClick={onRateNow}
          style={{
            animation: rating > 0 ? 'pulse 2s infinite' : 'none'
          }}
        >
          <span>{getTranslation('rateNow')}</span>
        </button>
      </div>
    </div>
  )
}
