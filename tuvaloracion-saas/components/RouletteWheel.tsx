// Componente de la Ruleta
'use client'

import { useState, useEffect, useRef } from 'react'
import { Prize } from '@/lib/types'
import '@/styles/roulette.css'

interface RouletteWheelProps {
  prizes: Prize[]
  language: string
  onSpinComplete: (prizeIndex: number) => void
  getTranslation: (key: string) => string
}

export default function RouletteWheel({ 
  prizes, 
  language, 
  onSpinComplete,
  getTranslation 
}: RouletteWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false)
  const wheelRef = useRef<HTMLDivElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Usamos un observer para asegurarnos de que el elemento es visible y tiene dimensiones
    const observer = new ResizeObserver(() => {
      createTexts()
    });

    if (wheelRef.current) {
      observer.observe(wheelRef.current);
    }

    return () => observer.disconnect();
  }, [prizes, language])

  const createTexts = () => {
    if (!textLayerRef.current || !wheelRef.current) return

    const N = prizes.length
    if (N === 0) return;

    const sliceAngle = 360 / N
    const R = wheelRef.current.offsetWidth / 2

    if (R === 0) {
      // Si el radio es 0, no podemos calcular. El ResizeObserver se encargará.
      return
    }

    const cx = R
    const cy = R

    prizes.forEach((prize, i) => {
      const textDiv = textLayerRef.current?.children[i] as HTMLDivElement
      if (!textDiv) return

      const angleDeg = -90 + (i * sliceAngle) + (sliceAngle / 2)
      const angleRad = angleDeg * Math.PI / 180

      const textRadius = 0.55 * R
      const x = cx + textRadius * Math.cos(angleRad)
      const y = cy + textRadius * Math.sin(angleRad)

      const textRotation = angleDeg // Ajuste para que el texto esté orientado radialmente

      textDiv.style.position = 'absolute'
      textDiv.style.left = `${x}px`
      textDiv.style.top = `${y}px`
      textDiv.style.transform = `translate(-50%, -50%) rotate(${textRotation}deg)`
    })
  }

  const spinWheel = () => {
    if (isSpinning || !wheelRef.current) return
    
    setIsSpinning(true)
    
    // Lógica de probabilidades controladas basada en el rating
    let prizeIndex: number;
    const random = Math.random();
    
    // Obtener el rating desde localStorage o asumir 5 por defecto
    const currentRating = parseInt(localStorage.getItem('currentRating') || '5');
    
    if (currentRating >= 1 && currentRating <= 4) {
      // LÓGICA PARA 1-4 ESTRELLAS
      const lowTierPrizes = [3, 4, 7]; // Índices para HELADO, CERVEZA, CHUPITO
      
      // Comprobamos las probabilidades fijas del 0.01% cada una
      if (random < 0.0001) {        // 0.01%
        prizeIndex = 0; // CENA
      } else if (random < 0.0002) { // 0.01%
        prizeIndex = 1; // 30€ DESCUENTO
      } else if (random < 0.0003) { // 0.01%
        prizeIndex = 2; // BOTELLA VINO
      } else if (random < 0.0004) { // 0.01%
        prizeIndex = 5; // REFRESCO
      } else if (random < 0.0005) { // 0.01%
        prizeIndex = 6; // MOJITO
      } else {
        // El 99.95% restante se reparte entre los 3 premios menores
        const randomIndex = Math.floor(Math.random() * lowTierPrizes.length);
        prizeIndex = lowTierPrizes[randomIndex];
      }
    } else {
      // LÓGICA PARA 5 ESTRELLAS
      // Comprobamos las probabilidades fijas del 0.1% cada una
      if (random < 0.001) {        // 0.1%
        prizeIndex = 0; // CENA
      } else if (random < 0.002) { // 0.1%
        prizeIndex = 1; // 30€ DESCUENTO
      } else if (random < 0.003) { // 0.1%
        prizeIndex = 2; // BOTELLA VINO
      } else {
        // El 99.7% restante se reparte entre los 5 premios restantes
        const highTierLowPrizes = [3, 4, 5, 6, 7]; // Helado, Cerveza, Refresco, Mojito, Chupito
        const randomIndex = Math.floor(Math.random() * highTierLowPrizes.length);
        prizeIndex = highTierLowPrizes[randomIndex];
      }
    }
    
    // Calcular rotación para que la ruleta pare en el premio seleccionado
    const anglePerSegment = 360 / prizes.length
    const targetIndex = (prizeIndex - 2 + prizes.length) % prizes.length;
    const rotation = 270 - (targetIndex * anglePerSegment) - (anglePerSegment / 2);
    const randomSpins = Math.floor(Math.random() * 3) + 5; // Entre 5 y 7 vueltas
    const totalRotation = (randomSpins * 360) + rotation;

    wheelRef.current.style.transition = `transform 4300ms cubic-bezier(.17,.67,.17,1)`
    wheelRef.current.style.transform = `rotate(${totalRotation}deg)`
    
    setTimeout(() => {
      setIsSpinning(false)
      onSpinComplete(prizeIndex)
      
      // Resetear la rotación para el próximo giro sin animación
      if(wheelRef.current) {
        wheelRef.current.style.transition = 'none';
        const finalRotation = totalRotation % 360;
        wheelRef.current.style.transform = `rotate(${finalRotation}deg)`;
      }

    }, 4300)
  }

  return (
    <div className="roulette-content">
      <div className="roulette-header">
        <h2 className="roulette-title" id="whichPrizeTitle">
          {getTranslation('whichPrize')}
        </h2>
      </div>
      
      <div id="rouletteContainer">
        <div className="roulette-pointer"></div>
        <div id="rouletteWheel" ref={wheelRef}>
          <div id="rouletteTextLayer" ref={textLayerRef}>
            {prizes.map((prize, index) => (
              <div key={index} className="roulette-text">
                <span>{prize.translations[language]?.name || prize.translations['en']?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <button 
        id="spinBtn" 
        className="confirmation-btn spin-premium"
        onClick={spinWheel}
        disabled={isSpinning}
      >
        {getTranslation('spinBtn')}
      </button>
    </div>
  )
}
