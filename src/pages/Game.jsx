import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, collection, onSnapshot, updateDoc, getDoc } from 'firebase/firestore'

export default function Game() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const playerId = localStorage.getItem('playerId')

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState({})
  const [selectedOption, setSelectedOption] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const advanceTriggered = useRef(false)

  useEffect(() => {
    const unsubSession = onSnapshot(doc(db, 'sessions', sessionId), (snap) => {
      const data = snap.data()
      setSession(data)
      if (data?.status === 'finished') {
        navigate(`/results/${sessionId}`)
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
    if (!session?.questionIds?.length) return
    let cancelled = false

    async function loadQuestions() {
      const qs = {}
      for (const qId of session.questionIds) {
        if (cancelled) return
        const qDoc = await getDoc(doc(db, 'questions', qId))
        if (qDoc.exists()) {
          qs[qId] = { id: qId, ...qDoc.data() }
        }
      }
      if (!cancelled) setQuestions(qs)
    }

    loadQuestions()
    return () => { cancelled = true }
  }, [session?.questionIds?.join(',')])

  useEffect(() => {
    if (!session || !players.length) return
    const round = session.currentRound
    const allAnswered = players.every(
      (p) => p.answers && p.answers[`round_${round}`]
    )

    if (allAnswered && !advanceTriggered.current) {
      const sorted = [...players].sort((a, b) => a.order - b.order)
      if (sorted[0]?.id === playerId) {
        advanceTriggered.current = true
        advanceRound()
      }
    }
  }, [players, session?.currentRound])

  useEffect(() => {
    setSelectedOption(null)
    setSubmitting(false)
    advanceTriggered.current = false
  }, [session?.currentRound])

  async function advanceRound() {
    const nextRound = session.currentRound + 1
    if (nextRound >= session.totalRounds) {
      await updateDoc(doc(db, 'sessions', sessionId), { status: 'finished' })
    } else {
      await updateDoc(doc(db, 'sessions', sessionId), {
        currentRound: nextRound,
      })
    }
  }

  function getCurrentQuestion() {
    if (!session || !players.length || !Object.keys(questions).length)
      return null

    const me = players.find((p) => p.id === playerId)
    if (!me || me.order == null) return null

    const round = session.currentRound
    const totalQ = session.questionIds.length
    const questionIndex = (me.order + round) % totalQ
    const questionId = session.questionIds[questionIndex]

    return questions[questionId]
  }

  async function handleAnswer() {
    if (selectedOption === null || submitting) return
    setSubmitting(true)

    const question = getCurrentQuestion()
    const correct = question.options[selectedOption].isCorrect
    const round = session.currentRound

    await updateDoc(doc(db, 'sessions', sessionId, 'players', playerId), {
      [`answers.round_${round}`]: {
        questionId: question.id,
        selected: selectedOption,
        correct,
      },
    })
  }

  const question = getCurrentQuestion()
  const me = players.find((p) => p.id === playerId)
  const hasAnswered = me?.answers?.[`round_${session?.currentRound}`]
  const answeredCount = players.filter(
    (p) => p.answers?.[`round_${session?.currentRound}`]
  ).length

  if (!question || !session) {
    return (
      <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="text-white text-lg animate-pulse">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            Rodada {session.currentRound + 1}/{session.totalRounds}
          </span>
          <span className="text-sm text-slate-400">
            {answeredCount}/{players.length}
          </span>
        </div>

        <h3 className="text-lg font-bold text-slate-800 mb-5 leading-snug">
          {question.text}
        </h3>

        {hasAnswered ? (
          <div className="text-center py-8">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-white ${
                hasAnswered.correct ? 'bg-green-500' : 'bg-red-500'
              }`}
            >
              {hasAnswered.correct ? '✓' : '✗'}
            </div>
            <p
              className={`font-semibold text-lg ${
                hasAnswered.correct ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {hasAnswered.correct ? 'Correto!' : 'Incorreto'}
            </p>
            <p className="text-slate-400 text-sm mt-4 animate-pulse">
              Aguardando outros jogadores...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2 mb-5">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedOption === i
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-700 active:border-slate-300'
                  }`}
                >
                  <span className="font-medium text-sm text-slate-400 mr-2">
                    {String.fromCharCode(65 + i)})
                  </span>
                  {opt.text}
                </button>
              ))}
            </div>

            <button
              onClick={handleAnswer}
              disabled={selectedOption === null || submitting}
              className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold disabled:opacity-50 active:scale-95 transition-transform"
            >
              {submitting ? 'Enviando...' : 'Confirmar'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
