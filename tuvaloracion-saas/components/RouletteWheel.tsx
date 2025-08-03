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

      const textRotation = angleDeg + 90 // Ajuste para que el texto quede horizontal

      textDiv.style.position = 'absolute'
      textDiv.style.left = `${x}px`
      textDiv.style.top = `${y}px`
      textDiv.style.transform = `translate(-50%, -50%) rotate(${textRotation}deg)`
    })
  }

  const spinWheel = () => {
    if (isSpinning || !wheelRef.current) return
    
    setIsSpinning(true)
    
    const prizeIndex = Math.floor(Math.random() * prizes.length)
    
    const anglePerSegment = 360 / prizes.length
    const prizeAngle = prizeIndex * anglePerSegment
    const randomOffset = Math.random() * (anglePerSegment * 0.8) + (anglePerSegment * 0.1)
    const targetAngle = prizeAngle + randomOffset
    
    const totalRotation = (360 * 5) + (360 - targetAngle)

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
