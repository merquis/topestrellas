'use client'

import { useState, useEffect } from 'react'
import { Business } from '@/lib/types'
import { getBrowserLanguage } from '@/lib/utils'
import LanguageSelector from './LanguageSelector'
import RatingSection from './RatingSection'
import LeadForm from './LeadForm'
import RouletteWheel from './RouletteWheel'
import PrizeDisplay from './PrizeDisplay'
import GoogleReviewPrompt from './GoogleReviewPrompt'
import '@/styles/business-review.css'

interface BusinessReviewAppProps {
  business: Business
}

export default function BusinessReviewApp({ business }: BusinessReviewAppProps) {
  const [currentLanguage, setCurrentLanguage] = useState<string>(() => 
    getBrowserLanguage(business.config.languages)
  )
  const [currentView, setCurrentView] = useState<'rating' | 'form' | 'roulette' | 'prize' | 'review'>('rating')
  const [rating, setRating] = useState<number>(0)
  const [formData, setFormData] = useState<any>(null)
  const [prizeWon, setPrizeWon] = useState<any>(null)
  const [watchingCount, setWatchingCount] = useState(Math.floor(Math.random() * 5) + 1)

  // Aplicar colores personalizados al cargar
  useEffect(() => {
    const root = document.documentElement
    const theme = business.config.theme
    
    // Colores de fondo
    if (theme.bgPrimary) root.style.setProperty('--bg-primary', theme.bgPrimary)
    if (theme.bgSecondary) root.style.setProperty('--bg-secondary', theme.bgSecondary)
    
    // Colores principales
    if (theme.primaryColor) root.style.setProperty('--primary-color', theme.primaryColor)
    if (theme.secondaryColor) root.style.setProperty('--primary-color-dark', theme.secondaryColor)
    
    // Colores de botones
    if (theme.buttonPrimary) root.style.setProperty('--button-primary', theme.buttonPrimary)
    if (theme.buttonSecondary) root.style.setProperty('--button-secondary', theme.buttonSecondary)
    
    // Colores de la ruleta
    if (business.config.rouletteColors) {
      business.config.rouletteColors.forEach((color, index) => {
        root.style.setProperty(`--roulette-color-${index}`, color)
      })
    }
  }, [business])

  // Simular contador de personas viendo
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchingCount(prev => {
        const change = Math.floor(Math.random() * 3) - 1
        return Math.max(1, Math.min(5, prev + change))
      })
    }, 3000)
    
    return () => clearInterval(interval)
  }, [])

  const handleRatingConfirmed = (selectedRating: number) => {
    setRating(selectedRating)
    setCurrentView('form')
  }

  const handleFormSubmit = (data: any) => {
    setFormData(data)
    setCurrentView('roulette')
  }

  const handleSpinComplete = async (prizeIndex: number) => {
    const prize = business.config.prizes[prizeIndex]
    // Usar español como fallback si no existe la traducción para el idioma actual
    const translation = prize.translations[currentLanguage] || prize.translations['es'] || { name: 'Premio', emoji: '🎁' }
    const prizeData = {
      index: prizeIndex,
      ...translation,
      value: prize.value
    }
    
    setPrizeWon(prizeData)
    
    // Enviar datos al backend o webhook
    try {
      // Si hay webhook configurado, usar ese
      if (business.config.webhooks?.saveLeadUrl) {
        await fetch(business.config.webhooks.saveLeadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            rating,
            review: formData.feedback,
            premio: prizeData.name,
            codigoPremio: `${business.subdomain.toUpperCase()}-${Date.now().toString(36).toUpperCase()}`,
            lang: currentLanguage,
            businessName: business.name,
            subdomain: business.subdomain
          })
        })
      } else {
        // Si no, usar la API interna
        await fetch('/api/opinions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId: business._id,
            subdomain: business.subdomain,
            ...formData,
            rating,
            prize: prizeData,
            language: currentLanguage
          })
        })
      }
    } catch (error) {
      console.error('Error saving opinion:', error)
    }
    
    // Mostrar premio y review prompt si es 5 estrellas
    if (rating === 5) {
      setCurrentView('review')
    } else {
      setCurrentView('prize')
    }
  }

  const getTranslation = (key: string): string => {
    // Primero buscar en textos personalizados
    if (business.config.customTexts?.[currentLanguage]?.[key]) {
      return business.config.customTexts[currentLanguage][key]!
    }
    
    // Luego usar traducciones por defecto
    const defaultTranslations: any = {
      es: {
        title_part1: '¡Comparte tu experiencia en 30 segundos! Tu opinión nos ayuda a mejorar. ✨',
        title_part2: '🎁 Gira nuestra ruleta y llévate un regalo seguro por tu visita.',
        prizes_subtitle: 'Estos son algunos de nuestros premios.',
        vipBadge: '👑 ZONA VIP - PREMIOS EXCLUSIVOS 👑',
        ratingInstruction: '¿Qué tal ha sido tu experiencia?',
        dinnerForTwo: 'CENA (VALOR 60€)',
        discount30: '30€ DESCUENTO',
        wineBottle: 'BOTELLA VINO',
        confirm: 'RECLAMAR MI PREMIO',
        confirmRating: 'SÍ, QUIERO MI REGALO',
        rewardCode: '🎁 TU PREMIO',
        finishReview: '⚠️ ACTÍVALO AHORA en Google o se PERDERÁ',
        improveQuestion: 'Tu opinión es muy importante para nosotros. 😊',
        emailWarning: 'Asegúrate de que tu email es correcto. ¡Ahí recibirás el código de referencia para canjear tu premio!',
        namePlaceholder: 'Tu nombre',
        emailPlaceholder: 'Tu email',
        feedbackPlaceholder: 'Completa tu reseña del restaurante',
        privacyPolicy: 'Acepto la política de privacidad',
        privacyLinkText: 'Privacidad',
        privacyLink: 'Privacidad',
        submitBtn: 'Continuar',
        continueBtn: 'Continuar',
        googleReviewTitle: '¡Último paso! Completa tu reseña. Recibirás el código de tu premio por email automáticamente',
        googleBtn: 'COMPLETAR MI RESEÑA',
        googleReviewBtn: 'CONFIRMAR MI PREMIO',
        spinBtn: 'Girar la ruleta',
        star: 'Estrella',
        stars: 'Estrellas',
        congratulations: '🏆 ¡GANASTE! ¡ERES UN VIP!',
        enjoyPrize: '📱 Captura esta pantalla - Tu premio está ACTIVADO por 24h',
        prizes: ['🍽️ CENA (VALOR 60€)', '💰 30€ DESCUENTO', '🍾 BOTELLA VINO', '🍦 HELADO', '🍺 CERVEZA', '🥤 REFRESCO', '🍹 MOJITO', '🥃 CHUPITO'],
        urgentMessage: '⚠️ 2 personas están reclamando premios AHORA',
        lastChance: '🔥 ÚLTIMO PREMIO GRANDE disponible',
        vipClient: '👑 Cliente VIP #',
        todayOnly: '⏰ VÁLIDO SOLO HOY',
        shameLowRating: 'No, prefiero pagar precio completo',
        shameExit: '❌ Perder mi premio para siempre',
        justWon: 'acaba de ganar',
        peopleWatching: 'personas viendo esta oferta',
        prizesGivenToday: 'premios entregados HOY',
        prizesLeft: '¡QUEDAN 3 PREMIOS GRANDES HOY!',
        hurryUp: '¡DATE PRISA!',
        almostGone: '¡CASI AGOTADO!',
        morePrizes: '🎁 + 5 premios más en la ruleta',
        expired: '¡EXPIRADO!',
        prizeByEmail: 'Se va a generar el código de tu premio. Lo recibirás en {{email}} en unos minutos, con formato <span class="codigo-premio">EURO‑XXXX</span>.<br>Preséntalo en el local para obtener tu regalo.',
        guaranteedPrize: '✅ PREMIO GARANTIZADO',
        rateWithStars: 'VALORAR CON {{count}} ESTRELLAS',
        rateNow: 'VALORAR AHORA',
        selectAtLeastOneStar: 'Por favor, selecciona al menos una estrella para valorar.',
        closePrivacyPopupBtn: 'Cerrar ventana',
        emailAlreadyUsed: 'Este correo electrónico ya ha sido utilizado',
        invalidEmail: 'Email inválido',
        invalidEmailNew: 'Email no válido. Introduzca uno nuevo.',
        emailVerificationError: 'No se pudo verificar el email. Inténtalo de nuevo.',
        requiredField: 'Este campo es obligatorio',
        whichPrize: '¿Cuál será tu premio?'
      },
      en: {
        title_part1: 'Share your experience in 30 seconds! Your feedback helps us improve. ✨',
        title_part2: '🎁 Spin our roulette and get a guaranteed gift for your visit.',
        prizes_subtitle: 'Some of our prizes...',
        vipBadge: '👑 VIP ZONE - EXCLUSIVE PRIZES 👑',
        ratingInstruction: 'How was your experience?',
        dinnerForTwo: 'DINNER (VALUE 60€)',
        discount30: '30€ DISCOUNT',
        wineBottle: 'BOTTLE OF WINE',
        confirm: 'CLAIM MY PRIZE',
        confirmRating: 'YES, I WANT MY GIFT',
        rewardCode: '🎁 YOUR PRIZE',
        finishReview: '⚠️ ACTIVATE IT NOW on Google or it will be LOST',
        improveQuestion: 'Your opinion is very important to us. 😊',
        emailWarning: 'Make sure your email is correct. You will receive the reference code to redeem your prize there!',
        namePlaceholder: 'Your name',
        emailPlaceholder: 'Your email',
        feedbackPlaceholder: 'Complete your review of the restaurant',
        privacyPolicy: 'I accept the privacy policy',
        privacyLinkText: 'Privacy',
        privacyLink: 'Privacy',
        submitBtn: 'Continue',
        continueBtn: 'Continue',
        googleReviewTitle: 'Last step! Complete your review. You will automatically receive your prize code by email',
        googleBtn: 'COMPLETE MY REVIEW',
        googleReviewBtn: 'CONFIRM MY PRIZE',
        spinBtn: 'Spin the wheel',
        star: 'Star',
        stars: 'Stars',
        congratulations: '🏆 YOU WON! YOU ARE A VIP!',
        enjoyPrize: '📱 Screenshot this screen - Your prize is ACTIVATED for 24h',
        prizes: ['🍽️ DINNER (VALUE 60€)', '💰 30€ DISCOUNT', '🍾 BOTTLE OF WINE', '🍦 ICE CREAM', '🍺 BEER', '🥤 SOFT DRINK', '🍹 MOJITO', '🥃 SHOT'],
        urgentMessage: '⚠️ 2 people are claiming prizes NOW',
        lastChance: '🔥 LAST BIG PRIZE available',
        vipClient: '👑 VIP Client #',
        todayOnly: '⏰ VALID TODAY ONLY',
        shameLowRating: 'No, I prefer to pay full price',
        shameExit: '❌ Lose my prize forever',
        justWon: 'just won',
        peopleWatching: 'people viewing this offer',
        prizesGivenToday: 'prizes given TODAY',
        prizesLeft: '3 BIG PRIZES LEFT TODAY!',
        hurryUp: 'HURRY UP!',
        almostGone: 'ALMOST GONE!',
        morePrizes: '🎁 + 5 premios más en la ruleta',
        expired: 'EXPIRED!',
        prizeByEmail: 'Your prize code will be generated. You will receive it at {{email}} in a few minutes, with the format <span class="codigo-premio">EURO‑XXXX</span>.<br>Present it at the restaurant to get your gift.',
        guaranteedPrize: '✅ GUARANTEED PRIZE',
        rateWithStars: 'RATE WITH {{count}} STARS',
        rateNow: 'RATE NOW',
        selectAtLeastOneStar: 'Please select at least one star to rate.',
        closePrivacyPopupBtn: 'Close window',
        emailAlreadyUsed: 'This email address has already been used',
        invalidEmail: 'Invalid email',
        invalidEmailNew: 'Invalid email. Please enter a new one.',
        emailVerificationError: 'Could not verify the email. Please try again.',
        requiredField: 'This field is required',
        whichPrize: 'What will your prize be?'
      },
      de: {
        title_part1: 'Teile deine Erfahrung in 30 Sekunden! Dein Feedback hilft uns, besser zu werden. ✨',
        title_part2: '🎁 Dreh unser Roulette und erhalte ein garantiertes Geschenk für deinen Besuch.',
        prizes_subtitle: 'Einige unserer Preise...',
        vipBadge: '👑 VIP-BEREICH - EXKLUSIVE PREISE 👑',
        ratingInstruction: 'Wie war Ihre Erfahrung?',
        dinnerForTwo: 'ABENDESSEN (WERT 60€)',
        discount30: '30€ RABATT',
        wineBottle: 'FLASCHE WEIN',
        confirm: 'MEINEN PREIS ANFORDERN',
        confirmRating: 'JA, ICH MÖCHTE MEIN GESCHENK',
        rewardCode: '🎁 DEIN PREIS',
        finishReview: '⚠️ JETZT bei Google AKTIVIEREN, sonst VERFÄLLT es',
        improveQuestion: 'Ihre Meinung ist uns sehr wichtig. 😊',
        emailWarning: 'Stellen Sie sicher, dass Ihre E-Mail-Adresse korrekt ist. Dort erhalten Sie den Referenzcode, um Ihren Preis einzulösen!',
        namePlaceholder: 'Ihr Name',
        emailPlaceholder: 'Ihre E-Mail',
        feedbackPlaceholder: 'Vervollständigen Sie Ihre Restaurantbewertung',
        privacyPolicy: 'Ich akzeptiere die Datenschutzbestimmungen',
        privacyLinkText: 'Datenschutz',
        privacyLink: 'Datenschutz',
        submitBtn: 'Weiter',
        continueBtn: 'Weiter',
        googleReviewTitle: 'Letzter Schritt! Vervollständigen Sie Ihre Bewertung. Sie erhalten Ihren Preiscode automatisch per E-Mail',
        googleBtn: 'MEINE BEWERTUNG ABSCHLIESSEN',
        googleReviewBtn: 'MEINEN PREIS BESTÄTIGEN',
        spinBtn: 'Drehen Sie das Rad',
        star: 'Stern',
        stars: 'Sterne',
        congratulations: '🏆 SIE HABEN GEWONNEN! SIE SIND EIN VIP!',
        enjoyPrize: '📱 Machen Sie einen Screenshot - Ihr Preis ist 24 Stunden lang AKTIVIERT',
        prizes: ['🍽️ ABENDESSEN (WERT 60€)', '💰 30€ RABATT', '🍾 FLASCHE WEIN', '🍦 EIS', '🍺 BIER', '🥤 ERFRISCHUNGSGETRÄNK', '🍹 MOJITO', '🥃 SCHNAPS'],
        urgentMessage: '⚠️ 2 Personen fordern JETZT Preise an',
        lastChance: '🔥 LETZTER GROSSER PREIS verfügbar',
        vipClient: '👑 VIP-Kunde #',
        todayOnly: '⏰ NUR HEUTE GÜLTIG',
        shameLowRating: 'Nein, ich zahle lieber den vollen Preis',
        shameExit: '❌ Meinen Preis für immer verlieren',
        justWon: 'hat gerade gewonnen',
        peopleWatching: 'Personen sehen sich dieses Angebot an',
        prizesGivenToday: 'Preise HEUTE vergeben',
        prizesLeft: 'HEUTE SIND NOCH 3 GROSSE PREISE ÜBRIG!',
        hurryUp: 'BEEILEN SIE SICH!',
        almostGone: 'FAST AUSVERKAUFT!',
        morePrizes: '🎁 + 5 weitere Preise am Rad',
        expired: 'ABGELAUFEN!',
        prizeByEmail: 'Es wird ein Code generiert, den Sie per E-Mail an {{email}} erhalten, mit einem Format wie <span class="codigo-premio">EURO‑XXXX</span>.<br>Sie müssen ihn im Restaurant vorzeigen, um Ihren Preis zu erhalten.',
        guaranteedPrize: '✅ GARANTIERTER PREIS',
        rateWithStars: 'MIT {{count}} STERNEN BEWERTEN',
        rateNow: 'JETZT BEWERTEN',
        selectAtLeastOneStar: 'Bitte wählen Sie mindestens einen Stern zum Bewerten aus.',
        closePrivacyPopupBtn: 'Fenster schließen',
        emailAlreadyUsed: 'Diese E-Mail-Adresse wurde bereits verwendet',
        invalidEmail: 'Ungültige E-Mail',
        invalidEmailNew: 'Ungültige E-Mail. Bitte geben Sie eine neue ein.',
        emailVerificationError: 'E-Mail konnte nicht überprüft werden. Bitte versuchen Sie es erneut.',
        requiredField: 'Dieses Feld ist erforderlich',
        whichPrize: 'Was wird dein Preis sein?'
      },
      fr: {
        title_part1: 'Partagez votre expérience en 30 secondes ! Votre avis nous aide à nous améliorer. ✨',
        title_part2: '🎁 Tournez notre roulette et recevez un cadeau garanti pour votre visite.',
        prizes_subtitle: 'Quelques-uns de nos prix...',
        vipBadge: '👑 ZONE VIP - PRIX EXCLUSIFS 👑',
        ratingInstruction: 'Quelle a été votre expérience ?',
        dinnerForTwo: 'DÎNER (VALEUR 60€)',
        discount30: '30€ DE RÉDUCTION',
        wineBottle: 'BOUTEILLE DE VIN',
        confirm: 'RÉCLAMER MON PRIX',
        confirmRating: 'OUI, JE VEUX MON CADEAU',
        rewardCode: '🎁 VOTRE PRIX',
        finishReview: '⚠️ ACTIVEZ-LE MAINTENANT sur Google ou il sera PERDU',
        improveQuestion: 'Votre avis est très important pour nous. 😊',
        emailWarning: 'Assurez-vous que votre e-mail est correct. C\'est là que vous recevrez le code de référence pour réclamer votre prix !',
        namePlaceholder: 'Votre nom',
        emailPlaceholder: 'Votre e-mail',
        feedbackPlaceholder: 'Complétez votre avis sur le restaurant',
        privacyPolicy: 'J\'accepte la politique de confidentialité',
        privacyLinkText: 'Confidentialité',
        privacyLink: 'Confidentialité',
        submitBtn: 'Continuer',
        continueBtn: 'Continuar',
        googleReviewTitle: 'Dernière étape ! Complétez votre avis. Vous recevrez automatiquement votre code de prix par e-mail',
        googleBtn: 'COMPLÉTER MON AVIS',
        googleReviewBtn: 'CONFIRMER MON PRIX',
        spinBtn: 'Faire tourner la roue',
        star: 'Étoile',
        stars: 'Étoiles',
        congratulations: '🏆 VOUS AVEZ GAGNÉ ! VOUS ÊTES UN VIP !',
        enjoyPrize: '📱 Faites une capture d\'écran - Votre prix est ACTIF pendant 24h',
        prizes: ['🍽️ DÎNER (VALEUR 60€)', '💰 30€ DE RÉDUCTION', '🍾 BOUTEILLE DE VIN', '🍦 GLACE', '🍺 BIÈRE', '🥤 BOISSON GAZEUSE', '🍹 MOJITO', '🥃 SHOT'],
        urgentMessage: '⚠️ 2 personnes réclament des prix MAINTENANT',
        lastChance: '🔥 DERNIER GRAND PRIX disponible',
        vipClient: '👑 Client VIP #',
        todayOnly: '⏰ VALABLE AUJOURD\'HUI SEULEMENT',
        shameLowRating: 'Non, je préfère payer le plein tarif',
        shameExit: '❌ Perdre mon prix pour toujours',
        justWon: 'vient de gagner',
        peopleWatching: 'personnes consultent cette offre',
        prizesGivenToday: 'prix décernés AUJOURD\'HUI',
        prizesLeft: 'IL RESTE 3 GRANDS PRIX RESTANTS AUJOURD\'HUI !',
        hurryUp: 'DÉPÊCHEZ-VOUS !',
        almostGone: 'PRESQUE ÉPUISÉ !',
        morePrizes: '🎁 + 5 autres prix sur la ruleta',
        expired: 'EXPIRÉ !',
        prizeByEmail: 'Un code sera généré que vous recevrez par e-mail à {{email}}, avec un format similaire à <span class="codigo-premio">EURO‑XXXX</span>.<br>Vous devrez le présenter au restaurant pour échanger votre cadeau.',
        guaranteedPrize: '✅ PREMIO GARANTI',
        rateWithStars: 'ÉVALUER AVEC {{count}} ÉTOILES',
        rateNow: 'ÉVALUER MAINTENANT',
        selectAtLeastOneStar: 'Veuillez sélectionner au moins une étoile pour évaluer.',
        closePrivacyPopupBtn: 'Fermer la fenêtre',
        emailAlreadyUsed: 'Cette adresse e-mail a déjà été utilisée',
        invalidEmail: 'E-mail invalide',
        invalidEmailNew: 'E-mail invalide. Veuillez en saisir un nouveau.',
        emailVerificationError: "Impossible de vérifier l'e-mail. Veuillez réessayer.",
        requiredField: 'Ce champ est obligatoire',
        whichPrize: 'Quel sera ton prix ?'
      }
    }
    
    return defaultTranslations[currentLanguage]?.[key] || defaultTranslations['es'][key] || key
  }

  return (
    <div className="business-review-page">
      <div className="main-wrapper">
        <div className="restaurant-title">
          <h2>{business.name}</h2>
        </div>
      
      <div className="container">
        <LanguageSelector
          languages={business.config.languages}
          currentLanguage={currentLanguage}
          onLanguageChange={setCurrentLanguage}
        />
        
        {currentView === 'rating' && (
          <div id="initial-view" className="fade-in">
            <div className="header">
              <p>{getTranslation('title_part1')}</p>
              <p>{getTranslation('title_part2')}</p>
              
              {business.config.features?.showScarcityIndicators !== false && (
                <div className="scarcity-indicators">
                  <div className="scarcity-item">
                    <span className="scarcity-number">3</span>
                    <span>{getTranslation('prizesLeft')}</span>
                  </div>
                  <div className="scarcity-item">
                    <span className="watching-number">{watchingCount}</span>
                    <span>{getTranslation('peopleWatching')}</span>
                  </div>
                </div>
              )}
              
              <p className="prizes-subtitle">{getTranslation('prizes_subtitle')}</p>
              <div className="big-prizes-preview">
                {business.config.prizes.slice(0, 3).map((prize, index) => {
                  // Usar español como fallback si no existe la traducción para el idioma actual
                  const translation = prize.translations[currentLanguage] || prize.translations['es'] || { emoji: '🎁', name: 'Premio' }
                  return (
                    <div key={index} className="prize-preview-item">
                      <span className="prize-icon">{translation.emoji}</span>
                      <span className="prize-text">{translation.name}</span>
                    </div>
                  )
                })}
              </div>
              <div className="more-prizes-text">
                <span>{getTranslation('morePrizes')}</span>
              </div>
            </div>
            
            <RatingSection
              onRatingConfirmed={handleRatingConfirmed}
              language={currentLanguage}
              getTranslation={getTranslation}
              business={business}
            />
          </div>
        )}
        
        {currentView === 'form' && (
          <LeadForm
            rating={rating}
            onSubmit={handleFormSubmit}
            language={currentLanguage}
            getTranslation={getTranslation}
            business={business}
          />
        )}
        
        {currentView === 'prize' && prizeWon && (
          <PrizeDisplay
            prize={prizeWon}
            email={formData.email}
            language={currentLanguage}
            getTranslation={getTranslation}
            business={business}
          />
        )}
        
        {currentView === 'review' && prizeWon && (
          <>
            <PrizeDisplay
              prize={prizeWon}
              email={formData.email}
              language={currentLanguage}
              getTranslation={getTranslation}
              business={business}
            />
            <GoogleReviewPrompt
              googleReviewUrl={business.googleReviewUrl}
              language={currentLanguage}
              getTranslation={getTranslation}
            />
          </>
        )}
      </div>
      
        {currentView === 'roulette' && (
          <div className="roulette-screen">
            <RouletteWheel
              prizes={business.config.prizes}
              language={currentLanguage}
              onSpinComplete={handleSpinComplete}
              getTranslation={getTranslation}
            />
          </div>
        )}
      </div>
    </div>
  )
}
