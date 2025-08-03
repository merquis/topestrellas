'use client'

import { useState, useEffect, useRef } from 'react'
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
  const wheelRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Dibujar segmentos
    const anglePerSegment = (2 * Math.PI) / prizes.length
    
    prizes.forEach((prize, index) => {
      const startAngle = index * anglePerSegment - Math.PI / 2
      const endAngle = (index + 1) * anglePerSegment - Math.PI / 2
      
      // Obtener color del segmento
      const color = getComputedStyle(document.documentElement)
        .getPropertyValue(`--roulette-color-${index}`)
        .trim() || getDefaultColor(index)
      
      // Dibujar segmento
      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, endAngle)
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()
      
      // Dibujar texto
      ctx.save()
      ctx.translate(centerX, centerY)
      ctx.rotate(startAngle + anglePerSegment / 2)
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 14px Arial'
      ctx.shadowColor = 'rgba(0,0,0,0.8)'
      ctx.shadowBlur = 4
      
      // Emoji
      ctx.fillText(prize.translations[language].emoji, radius * 0.7, 0)
      
      // Nombre del premio (dividir en líneas si es muy largo)
      const name = prize.translations[language].name
      const words = name.split(' ')
      if (words.length > 2) {
        ctx.font = 'bold 10px Arial'
        ctx.fillText(words.slice(0, 2).join(' '), radius * 0.5, -5)
        ctx.fillText(words.slice(2).join(' '), radius * 0.5, 5)
      } else {
        ctx.font = 'bold 12px Arial'
        ctx.fillText(name, radius * 0.5, 0)
      }
      
      ctx.restore()
    })
    
    // Dibujar círculo central
    ctx.beginPath()
    ctx.arc(centerX, centerY, 30, 0, 2 * Math.PI)
    ctx.fillStyle = '#333'
    ctx.fill()
    ctx.strokeStyle = '#ffd700'
    ctx.lineWidth = 3
    ctx.stroke()
  }

  const getDefaultColor = (index: number) => {
    const colors = [
      '#e67e22', '#e74c3c', '#2980b9', '#8e44ad',
      '#27ae60', '#f1c40f', '#3498db', '#9b59b6'
    ]
    return colors[index % colors.length]
  }

  const spinWheel = () => {
    if (isSpinning || !wheelRef.current) return
    
    setIsSpinning(true)
    
    // Calcular premio aleatorio
    const prizeIndex = Math.floor(Math.random() * prizes.length)
    
    // Calcular ángulo de rotación
    const anglePerSegment = 360 / prizes.length
    const prizeAngle = prizeIndex * anglePerSegment
    const randomOffset = Math.random() * anglePerSegment * 0.8 + anglePerSegment * 0.1
    const totalRotation = 360 * 5 + (360 - prizeAngle - anglePerSegment / 2) + randomOffset
    
    // Aplicar rotación
    wheelRef.current.style.transform = `rotate(${totalRotation}deg)`
    
    // Esperar a que termine la animación
    setTimeout(() => {
      setIsSpinning(false)
      onSpinComplete(prizeIndex)
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
        <div id="rouletteWheel" className="roulette-wheel" ref={wheelRef}>
          <canvas 
            ref={canvasRef}
            width={300}
            height={300}
            style={{ width: '100%', height: '100%' }}
          />
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
