'use client'

import { useState, useEffect } from 'react'

interface ScarcityIndicatorsProps {
  getTranslation: (key: string) => string
}

export default function ScarcityIndicators({ getTranslation }: ScarcityIndicatorsProps) {
  const [watchingCount, setWatchingCount] = useState(() => Math.floor(Math.random() * 10) + 5)
  const [prizesLeft] = useState(3)

  useEffect(() => {
    const interval = setInterval(() => {
      setWatchingCount((prev: number) => {
        const change = Math.floor(Math.random() * 3) - 1 // -1, 0, or 1
        return Math.max(5, Math.min(20, prev + change))
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="scarcity-indicators">
      <div className="scarcity-item">
        <span className="scarcity-number">{prizesLeft}</span>
        <span>{getTranslation('prizesLeft')}</span>
      </div>
      <div className="scarcity-item">
        <span className="watching-number">{watchingCount}</span>
        <span>{getTranslation('peopleWatching')}</span>
      </div>
    </div>
  )
}
