import { useMemo } from 'react'

const COLORS = ['#00d4ff', '#a855f7', '#f43f5e', '#22c55e', '#facc15', '#f97316']

export default function Confetti({ count = 50 }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 6 + Math.random() * 8,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 1.5,
        shape: Math.random() > 0.5 ? '50%' : '2px',
      })),
    [count]
  )

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  )
}
