import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, loginAnonymously } from '../firebase'
import {
  collection, query, where, getDocs, addDoc,
  doc, setDoc, serverTimestamp, getDoc
} from 'firebase/firestore'

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
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Quiz Compliance</h1>
        <p className="text-slate-500 mb-6 text-sm">Escape Box Challenge</p>

        <input
          type="text"
          placeholder="Seu nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-center text-lg mb-4"
          maxLength={20}
          disabled={loading}
        />

        <button
          onClick={handleJoin}
          disabled={!name.trim() || loading}
          className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
