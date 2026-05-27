import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, loginAnonymously } from '../firebase'
import {
  collection, query, where, getDocs, addDoc,
  doc, setDoc, serverTimestamp, getDoc
} from 'firebase/firestore'
import MagicRings from '../components/MagicRings'

export default function Home() {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleJoin() {
    if (!name.trim()) return
    setLoading(true)

    try {
      const uid = await loginAnonymously()

      const sessionsRef = collection(db, 'sessions')
      const q = query(sessionsRef, where('status', '==', 'lobby'))
      const snapshot = await getDocs(q)

      let sessionId
      if (snapshot.empty) {
        const configDoc = await getDoc(doc(db, 'config', 'settings'))
        const config = configDoc.exists()
          ? configDoc.data()
          : { totalRounds: 4, threshold: 80, secretCode: '1234' }

        const sessionRef = await addDoc(sessionsRef, {
          status: 'lobby',
          currentRound: 0,
          totalRounds: config.totalRounds,
          secretCode: config.secretCode,
          threshold: config.threshold,
          createdAt: serverTimestamp(),
          questionIds: [],
        })
        sessionId = sessionRef.id
      } else {
        sessionId = snapshot.docs[0].id
      }

      await setDoc(doc(db, 'sessions', sessionId, 'players', uid), {
        name: name.trim(),
        ready: false,
        order: Date.now(),
        answers: {},
      })

      localStorage.setItem('playerId', uid)
      localStorage.setItem('playerName', name.trim())
      navigate(`/lobby/${sessionId}`)
    } catch (err) {
      console.error(err)
      alert('Erro ao entrar. Tente novamente.')
    }

    setLoading(false)
  }

  return (
    <div className="game-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0">
        <MagicRings
          color="#7c3aed"
          colorTwo="#06b6d4"
          speed={0.6}
          ringCount={5}
          opacity={0.4}
          baseRadius={0.2}
          radiusStep={0.12}
        />
      </div>

      <div className="glass-card p-8 w-full max-w-sm text-center fade-in-up relative z-10">
        <div className="w-20 h-20 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-4xl">
          🔒
        </div>

        <h1 className="text-3xl font-extrabold neon-text mb-1">
          Quiz Compliance
        </h1>
        <p className="text-white/40 mb-8 text-sm tracking-widest uppercase">
          Escape Box Challenge
        </p>

        <div className="relative mb-5">
          <input
            type="text"
            placeholder="Digite seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
            className="w-full px-5 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-center text-lg placeholder-white/25 outline-none focus:border-cyan-500/50 focus:bg-white/8 transition-all"
            maxLength={20}
            disabled={loading}
          />
        </div>

        <button
          onClick={handleJoin}
          disabled={!name.trim() || loading}
          className="glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold text-lg tracking-wide"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Entrando...
            </span>
          ) : (
            'ENTRAR NA ARENA'
          )}
        </button>
      </div>
    </div>
  )
}
