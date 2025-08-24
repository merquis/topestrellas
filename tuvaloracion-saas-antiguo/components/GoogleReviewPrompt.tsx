'use client'

import GoogleTimer from './GoogleTimer'

interface GoogleReviewPromptProps {
  googleReviewUrl: string
  language: string
  getTranslation: (key: string) => string
  startTimer: boolean
}

export default function GoogleReviewPrompt({ 
  googleReviewUrl, 
  language, 
  getTranslation,
  startTimer
}: GoogleReviewPromptProps) {

  const goToReview = () => {
    window.open(googleReviewUrl, '_blank')
  }

  return (
    <div id="resenaBtn">
      <div className="form-section final-step">
        <h3 className="urgent-final">
          <span>{getTranslation('googleReviewTitle')}</span>
        </h3>
        
        <GoogleTimer getTranslation={getTranslation} startTimer={startTimer} />
        
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
