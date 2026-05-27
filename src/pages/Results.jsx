import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, collection, onSnapshot, updateDoc } from 'firebase/firestore'
import MagicRings from '../components/MagicRings'
import Confetti from '../components/Confetti'
import Counter from '../components/Counter'

export default function Results() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      if (snap.exists()) setSession(snap.data())
    })
    const unsubPlayers = onSnapshot(
      collection(db, 'sessions', sessionId, 'players'),
      (snap) => {
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      }
    )
    return () => {
      unsubSession()
      unsubPlayers()
    }
  }, [sessionId])

  if (!session || !players.length) {
    return (
      <div className="game-bg flex items-center justify-center">
        <div className="text-cyan-400 animate-pulse">Carregando...</div>
      </div>
    )
  }

  let totalCorrect = 0
  let totalAnswers = 0
  players.forEach((p) => {
    if (p.answers) {
      Object.values(p.answers).forEach((a) => {
        totalAnswers++
        if (a.correct) totalCorrect++
      })
    }
  })

  const percentage =
    totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0
  const passed = percentage >= session.threshold

  const sortedPlayers = [...players].sort((a, b) => {
    const aCorrect = a.answers ? Object.values(a.answers).filter((x) => x.correct).length : 0
    const bCorrect = b.answers ? Object.values(b.answers).filter((x) => x.correct).length : 0
    return bCorrect - aCorrect
  })

  const medals = ['🥇', '🥈', '🥉']

  async function handleRetry() {
    for (const p of players) {
      await updateDoc(doc(db, 'sessions', sessionId, 'players', p.id), {
        ready: false,
        answers: {},
      })
    }
    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'lobby',
      currentRound: 0,
      questionIds: [],
    })
    navigate(`/lobby/${sessionId}`)
  }

  return (
    <div className="game-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <MagicRings
          color={passed ? '#22c55e' : '#ef4444'}
          colorTwo={passed ? '#06b6d4' : '#f97316'}
          speed={0.5}
          ringCount={4}
          opacity={0.3}
          baseRadius={0.2}
          radiusStep={0.12}
        />
      </div>
      {passed && <Confetti />}

      <div className="glass-card p-8 w-full max-w-sm text-center relative z-10 fade-in-up">
        {/* Icon */}
        <div className="score-reveal mb-4">
          <div
            className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center text-4xl border-2 ${
              passed
                ? 'bg-green-500/20 border-green-500/50'
                : 'bg-red-500/20 border-red-500/50'
            }`}
          >
            {passed ? '🏆' : '💀'}
          </div>
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-1 score-reveal" style={{ animationDelay: '0.2s' }}>
          {passed ? 'MISSAO COMPLETA!' : 'MISSAO FALHOU'}
        </h2>
        <p className="text-white/30 text-sm mb-5">
          {passed ? 'O time provou seu conhecimento' : 'Conhecimento insuficiente'}
        </p>

        {/* Score */}
        <div className="mb-6 score-reveal" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-center mb-1">
            <Counter
              value={percentage}
              fontSize={56}
              padding={8}
              gap={4}
              textColor={passed ? '#22c55e' : '#ef4444'}
              fontWeight="800"
              gradientFrom="transparent"
              gradientTo="transparent"
            />
            <span
              className="text-5xl font-extrabold ml-1"
              style={{ color: passed ? '#22c55e' : '#ef4444' }}
            >
              %
            </span>
          </div>
          <p className="text-white/40 text-sm">
            {totalCorrect} de {totalAnswers} respostas corretas
          </p>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-1.5 flex-1 rounded-full bg-white/5 overflow-hidden max-w-48">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${percentage}%`,
                  backgroundColor: passed ? '#22c55e' : '#ef4444',
                }}
              />
            </div>
            <span className="text-xs text-white/25">{session.threshold}%</span>
          </div>
        </div>

        {/* Ranking */}
        <div className="space-y-2 mb-6 stagger">
          {sortedPlayers.map((p, idx) => {
            const pCorrect = p.answers
              ? Object.values(p.answers).filter((a) => a.correct).length
              : 0
            const pTotal = p.answers ? Object.values(p.answers).length : 0
            return (
              <div
                key={p.id}
                className="fade-in-up flex items-center justify-between px-4 py-3 rounded-xl bg-white/5 border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-6 text-center">
                    {idx < 3 ? medals[idx] : <span className="text-white/20 text-sm">{idx + 1}</span>}
                  </span>
                  <span className="text-white/80 font-medium text-sm">{p.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {Array.from({ length: pTotal }, (_, i) => (
                      <div
                        key={i}
                        className={`w-2 h-2 rounded-full ${
                          i < pCorrect ? 'bg-green-400' : 'bg-red-400/50'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-white/50 text-xs font-mono">
                    {pCorrect}/{pTotal}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Secret code or retry */}
        {passed ? (
          <div className="score-reveal rounded-xl p-5 bg-green-500/10 border border-green-500/30" style={{ animationDelay: '0.8s' }}>
            <p className="text-xs text-green-400/70 mb-2 tracking-widest uppercase font-bold">
              Codigo Secreto
            </p>
            <p className="text-4xl font-mono font-extrabold text-green-400 tracking-widest code-reveal">
              {session.secretCode}
            </p>
          </div>
        ) : (
          <button
            onClick={handleRetry}
            className="glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold text-lg tracking-wide"
          >
            TENTAR NOVAMENTE
          </button>
        )}
      </div>
    </div>
  )
}
