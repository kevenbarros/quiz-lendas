const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export default function CircleTimer({ timeLeft, totalTime }) {
  const progress = timeLeft / totalTime
  const offset = CIRCUMFERENCE * (1 - progress)
  const color =
    timeLeft <= 5 ? '#ef4444' : timeLeft <= 10 ? '#f97316' : '#00d4ff'

  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="timer-circle w-24 h-24" viewBox="0 0 96 96">
        <circle className="timer-circle-track" cx="48" cy="48" r={RADIUS} />
        <circle
          className="timer-circle-bar"
          cx="48"
          cy="48"
          r={RADIUS}
          stroke={color}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-2xl font-bold font-mono"
          style={{ color }}
        >
          {timeLeft}
        </span>
      </div>
    </div>
  )
}
