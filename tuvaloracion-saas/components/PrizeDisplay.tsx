'use client'

import { useEffect, useState } from 'react'
import { Business } from '@/lib/types'

interface PrizeDisplayProps {
  prize: any
  email: string
  language: string
  getTranslation: (key: string) => string
  business?: Business
}

export default function PrizeDisplay({ 
  prize, 
  email, 
  language, 
  getTranslation,
  business 
}: PrizeDisplayProps) {
  const [prizeCode, setPrizeCode] = useState('')
  const [currentDate, setCurrentDate] = useState('')

  useEffect(() => {
    // Generar código único
    const code = `${business?.subdomain?.toUpperCase() || 'PREMIO'}-${Date.now().toString(36).toUpperCase()}`
    setPrizeCode(code)

    // Establecer fecha actual
    const today = new Date()
    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }
    setCurrentDate(today.toLocaleDateString(language === 'es' ? 'es-ES' : 'en-US', options))
  }, [business, language])

  return (
    <div id="codigoContainer">
      <div className="reward-code premium-reward">
        <div className="description">
          <span>{getTranslation('rewardCode')}</span>
        </div>
        
        <div className="premio-grande">
          {prize.emoji} {prize.name}
        </div>
        
        <div className="email-message">
          {language === 'es' 
            ? `Se va a generar el código de tu premio. Lo recibirás en ` 
            : `Your prize code will be generated. You will receive it at `}
          <span className="highlight-email">{email}</span>
          {language === 'es' 
            ? ` en unos minutos, con formato ` 
            : ` in a few minutes, with format `}
          <span className="codigo-premio">{prizeCode}</span>
          {language === 'es' 
            ? `. Preséntalo en el local para obtener tu regalo.` 
            : `. Present it at the location to get your gift.`}
        </div>
        
        <div className="expiry-warning">
          <span>{getTranslation('todayOnly')}</span>
          <p id="currentDate" style={{ color: 'white', fontSize: '0.9rem', marginTop: '5px' }}>
            {currentDate}
          </p>
        </div>
      </div>
    </div>
  )
}
