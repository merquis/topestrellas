'use client'

import { useState, useEffect, useRef } from 'react'
import { ROULETTE_COLORS, calculateRouletteRotation } from '@/lib/utils'
import { Prize } from '@/lib/types'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wheelRef = useRef<HTMLDivElement>(null)
  const [selectedPrizeIndex, setSelectedPrizeIndex] = useState<number | null>(null)

  const defaultTranslations: Record<string, Record<string, string>> = {
    es: {
      whichPrize: '¿Cuál será tu premio?',
      spinBtn: 'Girar la ruleta'
    },
    en: {
      whichPrize: 'What will your prize be?',
      spinBtn: 'Spin the wheel'
    },
    de: {
      whichPrize: 'Was wird dein Preis sein?',
      spinBtn: 'Drehen Sie das Rad'
    },
    fr: {
      whichPrize: 'Quel sera ton prix ?',
      spinBtn: 'Faire tourner la roue'
    }
  }

  const getLocalTranslation = (key: string): string => {
    return defaultTranslations[language]?.[key] || defaultTranslations['es'][key] || key
  }

  useEffect(() => {
    drawWheel()
  }, [prizes, language])

  const drawWheel = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const anglePerPrize = (2 * Math.PI) / prizes.length

    prizes.forEach((prize, index) => {
      const startAngle = index * anglePerPrize - Math.PI / 2
      const endAngle = (index + 1) * anglePerPrize - Math.PI / 2

      // Draw segment
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = ROULETTE_COLORS[index % ROULETTE_COLORS.length]
      ctx.fill()

      // Draw border
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw text
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + anglePerPrize / 2)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px Arial'
      
      const prizeText = prize.translations[language]?.name || prize.translations['es'].name
      const emoji = prize.translations[language]?.emoji || prize.translations['es'].emoji
      
      ctx.fillText(emoji + ' ' + prizeText, radius - 10, 5)
      ctx.restore()
    })

    // Draw center circle
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = '#333'
    ctx.fill()
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const handleSpin = () => {
    if (isSpinning) return

    setIsSpinning(true)
    
    // Seleccionar premio (ponderado hacia premios menores)
    const weights = [5, 8, 10, 15, 20, 15, 15, 12] // Pesos para cada premio
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    let random = Math.random() * totalWeight
    let prizeIndex = 0
    
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        prizeIndex = i
        break
      }
    }

    setSelectedPrizeIndex(prizeIndex)
    
    const rotation = calculateRouletteRotation(prizeIndex, prizes.length)
    
    if (wheelRef.current) {
      wheelRef.current.style.transform = `rotate(${rotation}deg)`
      wheelRef.current.style.transition = 'transform 4s cubic-bezier(.17,.67,.17,1)'
    }

    setTimeout(() => {
      setIsSpinning(false)
      onSpinComplete(prizeIndex)
    }, 4300)
  }

  return (
    <div className="roulette-screen">
      <div className="roulette-content">
        <div className="roulette-header">
          <h2 className="roulette-title">
            {getTranslation('whichPrize') || getLocalTranslation('whichPrize')}
          </h2>
        </div>
        
        <div id="rouletteContainer">
          <div className="roulette-pointer"></div>
          <div ref={wheelRef} className="roulette-wheel">
            <canvas
              ref={canvasRef}
              width={320}
              height={320}
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        </div>
        
        <button
          id="spinBtn"
          className="confirmation-btn spin-premium mt-6"
          onClick={handleSpin}
          disabled={isSpinning}
        >
          {isSpinning ? '...' : (getTranslation('spinBtn') || getLocalTranslation('spinBtn'))}
        </button>
      </div>
    </div>
  )
}
