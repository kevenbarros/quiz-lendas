import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, collection, onSnapshot, updateDoc } from 'firebase/firestore'

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
      <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white animate-pulse">Carregando...</div>
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
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-6xl mb-3">{passed ? '🏆' : '😞'}</div>

        <h2 className="text-2xl font-bold text-slate-800 mb-2">
          {passed ? 'Parabens!' : 'Quase la!'}
        </h2>

        <div className="mb-6">
          <div
            className="text-5xl font-bold mb-1"
            style={{ color: passed ? '#16a34a' : '#dc2626' }}
          >
            {percentage}%
          </div>
          <p className="text-slate-500 text-sm">
            {totalCorrect} de {totalAnswers} respostas corretas
          </p>
          <p className="text-slate-400 text-xs mt-1">
            Minimo necessario: {session.threshold}%
          </p>
        </div>

        <div className="space-y-2 mb-6">
          {players.map((p) => {
            const pCorrect = p.answers
              ? Object.values(p.answers).filter((a) => a.correct).length
              : 0
            const pTotal = p.answers ? Object.values(p.answers).length : 0
            return (
              <div
                key={p.id}
                className="flex justify-between items-center px-3 py-2 bg-slate-50 rounded-lg text-sm"
              >
                <span className="text-slate-700">{p.name}</span>
                <span className="font-semibold text-slate-600">
                  {pCorrect}/{pTotal}
                </span>
              </div>
            )
          })}
        </div>

        {passed ? (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5">
            <p className="text-sm text-green-700 mb-2 font-medium">
              Codigo Secreto
            </p>
            <p className="text-3xl font-mono font-bold text-green-800 tracking-widest">
              {session.secretCode}
            </p>
          </div>
        ) : (
          <button
            onClick={handleRetry}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-lg active:scale-95 transition-transform"
          >
            Tentar Novamente
          </button>
        )}
      </div>
    </div>
  )
}
