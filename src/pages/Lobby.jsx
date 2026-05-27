import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  doc, collection, onSnapshot, updateDoc,
  getDocs, getDoc
} from 'firebase/firestore'
import MagicRings from '../components/MagicRings'

export default function Lobby() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [players, setPlayers] = useState([])
  const [session, setSession] = useState(null)
  const playerId = localStorage.getItem('playerId')
  const startTriggered = useRef(false)

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      const data = snap.data()
      setSession(data)
      if (data?.status === 'playing') {
        navigate(`/game/${sessionId}`)
      }
    })

    const unsubPlayers = onSnapshot(
      collection(db, 'sessions', sessionId, 'players'),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        list.sort((a, b) => a.order - b.order)
        setPlayers(list)
      }
    )

    return () => {
      unsubSession()
      unsubPlayers()
    }
  }, [sessionId, navigate])

  useEffect(() => {
    if (
      players.length >= 2 &&
      players.every((p) => p.ready) &&
      !startTriggered.current
    ) {
      const sorted = [...players].sort((a, b) => a.order - b.order)
      if (sorted[0]?.id === playerId) {
        startTriggered.current = true
        startGame()
      }
    }
  }, [players])

  async function startGame() {
    const numPlayers = players.length

    const configDoc = await getDoc(doc(db, 'config', 'settings'))
    const config = configDoc.exists()
      ? configDoc.data()
      : { totalRounds: numPlayers }
    const totalRounds = config.totalRounds || numPlayers

    const questionsSnap = await getDocs(collection(db, 'questions'))
    const allQuestions = questionsSnap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }))

    const needed = Math.max(numPlayers, totalRounds)
    const shuffled = allQuestions.sort(() => Math.random() - 0.5)
    const selected = shuffled.slice(0, needed).map((q) => q.id)

    const sorted = [...players].sort((a, b) => a.order - b.order)
    for (let i = 0; i < sorted.length; i++) {
      await updateDoc(
        doc(db, 'sessions', sessionId, 'players', sorted[i].id),
        { order: i }
      )
    }

    await updateDoc(doc(db, 'sessions', sessionId), {
      status: 'playing',
      currentRound: 0,
      totalRounds,
      timePerQuestion: config.timePerQuestion || 30,
      questionIds: selected,
    })
  }

  async function handleReady() {
    await updateDoc(doc(db, 'sessions', sessionId, 'players', playerId), {
      ready: true,
    })
  }

  const currentPlayer = players.find((p) => p.id === playerId)
  const allReady = players.length >= 2 && players.every((p) => p.ready)
  const readyCount = players.filter((p) => p.ready).length

  return (
    <div className="game-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <MagicRings color="#7c3aed" colorTwo="#06b6d4" speed={0.5} ringCount={4} opacity={0.3} baseRadius={0.18} radiusStep={0.1} />
      </div>

      <div className="glass-card p-8 w-full max-w-sm text-center fade-in-up relative z-10">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center">
          <span className="text-2xl">⚔️</span>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">Sala de Espera</h2>
        <p className="text-white/30 text-sm mb-6">
          {readyCount}/{players.length} prontos
        </p>

        <div className="space-y-2 mb-6 stagger">
          {players.map((p) => (
            <div
              key={p.id}
              className={`fade-in-up flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                p.id === playerId
                  ? 'bg-cyan-500/10 border border-cyan-500/30'
                  : 'bg-white/5 border border-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    p.ready
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium text-white/90">{p.name}</span>
              </div>
              {p.ready ? (
                <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2.5 py-1 rounded-full pulse-ring">
                  PRONTO
                </span>
              ) : (
                <span className="text-xs text-white/30">
                  <span className="inline-flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                  </span>
                </span>
              )}
            </div>
          ))}
        </div>

        {!currentPlayer?.ready ? (
          <button
            onClick={handleReady}
            className="glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg tracking-wide"
          >
            ESTOU PRONTO!
          </button>
        ) : (
          <div className="text-white/40 text-sm py-2">
            {allReady ? (
              <span className="text-cyan-400 font-semibold flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                Iniciando...
              </span>
            ) : (
              'Aguardando outros jogadores...'
            )}
          </div>
        )}

        {players.length < 2 && (
          <p className="text-xs text-white/20 mt-4">
            Minimo 2 jogadores para comecar
          </p>
        )}
      </div>
    </div>
  )
}
