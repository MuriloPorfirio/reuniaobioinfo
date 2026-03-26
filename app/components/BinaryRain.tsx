'use client'

import { useEffect, useState } from 'react'

type Drop = {
  id: number
  left: number
  top: number
  speed: number
  length: number
  size: number
  opacity: number
  text: string
}

function makeVerticalBinary(length: number) {
  return Array.from({ length }, () => (Math.random() > 0.5 ? '1' : '0')).join('\n')
}

function mutateVerticalBinary(text: string) {
  return text
    .split('\n')
    .map((char) => (Math.random() > 0.74 ? (char === '1' ? '0' : '1') : char))
    .join('\n')
}

function createDrops(): Drop[] {
  return Array.from({ length: 24 }, (_, index) => {
    const length = 18 + Math.floor(Math.random() * 14)

    return {
      id: index,
      left: 1.5 + index * 4.1,
      top: -Math.random() * 110,
      speed: 0.17 + Math.random() * 0.2,
      length,
      size: 12 + Math.floor(Math.random() * 4),
      opacity: 0.045 + Math.random() * 0.055,
      text: makeVerticalBinary(length),
    }
  })
}

export default function BinaryRain() {
  const [mounted, setMounted] = useState(false)
  const [drops, setDrops] = useState<Drop[]>([])

  useEffect(() => {
    setMounted(true)
    setDrops(createDrops())
  }, [])

  useEffect(() => {
    if (!mounted) return

    const interval = window.setInterval(() => {
      setDrops((current) =>
        current.map((drop) => {
          const nextTop = drop.top + drop.speed

          if (nextTop > 118) {
            const newLength = 18 + Math.floor(Math.random() * 14)

            return {
              ...drop,
              top: -28 - Math.random() * 42,
              speed: 0.17 + Math.random() * 0.2,
              length: newLength,
              size: 12 + Math.floor(Math.random() * 4),
              opacity: 0.045 + Math.random() * 0.055,
              text: makeVerticalBinary(newLength),
            }
          }

          return {
            ...drop,
            top: nextTop,
            text: mutateVerticalBinary(drop.text),
          }
        })
      )
    }, 120)

    return () => window.clearInterval(interval)
  }, [mounted])

  if (!mounted) return null

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((drop) => (
        <div
          key={drop.id}
          className="absolute font-mono leading-[0.82] text-cyan-100"
          style={{
            left: `${drop.left}%`,
            top: `${drop.top}%`,
            fontSize: `${drop.size}px`,
            opacity: drop.opacity,
            whiteSpace: 'pre',
            filter: 'blur(0.15px)',
            textShadow: '0 0 12px rgba(165, 243, 252, 0.06)',
            transform: 'translateZ(0)',
            transition: 'top 120ms linear',
          }}
        >
          {drop.text}
        </div>
      ))}
    </div>
  )
}
