import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import {
  doc, collection, onSnapshot, updateDoc,
  getDocs, getDoc
} from 'firebase/firestore'

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

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <h2 className="text-xl font-bold text-slate-800 mb-1">
          Sala de Espera
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          {players.length} jogador(es) na sala
        </p>

        <div className="space-y-2 mb-6">
          {players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between px-4 py-3 rounded-xl ${
                p.id === playerId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-slate-50'
              }`}
            >
              <span className="font-medium text-slate-700">{p.name}</span>
              <span
                className={`text-sm font-semibold ${
                  p.ready ? 'text-green-600' : 'text-slate-400'
                }`}
              >
                {p.ready ? 'Pronto!' : 'Aguardando...'}
              </span>
            </div>
          ))}
        </div>

        {!currentPlayer?.ready ? (
          <button
            onClick={handleReady}
            className="w-full py-3 rounded-xl bg-green-600 text-white font-semibold text-lg active:scale-95 transition-transform"
          >
            Estou Pronto!
          </button>
        ) : (
          <div className="text-slate-500 text-sm">
            {allReady
              ? 'Iniciando o jogo...'
              : 'Aguardando outros jogadores...'}
          </div>
        )}

        {players.length < 2 && (
          <p className="text-xs text-slate-400 mt-4">
            Minimo 2 jogadores para comecar
          </p>
        )}
      </div>
    </div>
  )
}
