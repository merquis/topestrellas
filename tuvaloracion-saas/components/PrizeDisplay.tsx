'use client'

interface PrizeDisplayProps {
  prize: {
    name: string
    emoji: string
    value?: string
  }
  email: string
  language: string
  getTranslation: (key: string) => string
}

export default function PrizeDisplay({ 
  prize, 
  email, 
  language, 
  getTranslation 
}: PrizeDisplayProps) {
  const defaultTranslations: Record<string, Record<string, string>> = {
    es: {
      rewardCode: '🎁 TU PREMIO',
      prizeByEmail: 'Se va a generar el código de tu premio. Lo recibirás en {{email}} en unos minutos, con formato <span class="codigo-premio">EURO‑XXXX</span>.<br>Preséntalo en el local para obtener tu regalo.',
      todayOnly: '⏰ VÁLIDO SOLO HOY'
    },
    en: {
      rewardCode: '🎁 YOUR PRIZE',
      prizeByEmail: 'Your prize code will be generated. You will receive it at {{email}} in a few minutes, with the format <span class="codigo-premio">EURO‑XXXX</span>.<br>Present it at the restaurant to get your gift.',
      todayOnly: '⏰ VALID TODAY ONLY'
    },
    de: {
      rewardCode: '🎁 DEIN PREIS',
      prizeByEmail: 'Es wird ein Code generiert, den Sie per E-Mail an {{email}} erhalten, mit einem Format wie <span class="codigo-premio">EURO‑XXXX</span>.<br>Sie müssen ihn im Restaurant vorzeigen, um Ihren Preis zu erhalten.',
      todayOnly: '⏰ NUR HEUTE GÜLTIG'
    },
    fr: {
      rewardCode: '🎁 VOTRE PRIX',
      prizeByEmail: 'Un code sera généré que vous recevrez par e-mail à {{email}}, avec un format similaire à <span class="codigo-premio">EURO‑XXXX</span>.<br>Vous devrez le présenter au restaurant pour échanger votre cadeau.',
      todayOnly: '⏰ VALABLE AUJOURD\'HUI SEULEMENT'
    }
  }

  const getLocalTranslation = (key: string): string => {
    return defaultTranslations[language]?.[key] || defaultTranslations['es'][key] || key
  }

  const formatPrizeMessage = (): string => {
    let message = getTranslation('prizeByEmail') || getLocalTranslation('prizeByEmail')
    const formattedEmail = email.replace('@', '@<wbr>')
    const highlightedEmail = `<span class="highlight-email">${formattedEmail}</span>`
    
    message = message
      .replace('{{email}}', highlightedEmail)
      .replace('{{premio}}', `<strong>${prize.name}</strong>`)
    
    return message
  }

  return (
    <div className="reward-code premium-reward fade-in">
      <div className="description">
        <span>{getTranslation('rewardCode') || getLocalTranslation('rewardCode')}</span>
      </div>
      
      <div className="premium-code">
        <div className="premio-grande text-3xl font-bold mb-4">
          {prize.emoji} {prize.name}
        </div>
        <div 
          className="email-message text-base"
          dangerouslySetInnerHTML={{ __html: formatPrizeMessage() }}
        />
      </div>
      
      {/* Mostrar validez solo para premios de 1-4 estrellas */}
      <div className="expiry-warning mt-4">
        <span>{getTranslation('todayOnly') || getLocalTranslation('todayOnly')}</span>
        <p className="text-white text-sm mt-2">
          {new Date().toLocaleDateString(language === 'en' ? 'en-US' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </p>
      </div>
    </div>
  )
}
