import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../firebase'
import { doc, collection, onSnapshot, updateDoc, getDoc } from 'firebase/firestore'
import MagicRings from '../components/MagicRings'
import CircleTimer from '../components/CircleTimer'
import TextType from '../components/TextType'

export default function Game() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const playerId = localStorage.getItem('playerId')

  const [session, setSession] = useState(null)
  const [players, setPlayers] = useState([])
  const [questions, setQuestions] = useState({})
  const [selectedOption, setSelectedOption] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [shaking, setShaking] = useState(false)
  const advanceTriggered = useRef(false)
  const timerRef = useRef(null)
  const autoSubmitted = useRef(false)

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
    setShaking(false)
    advanceTriggered.current = false
    autoSubmitted.current = false

    if (session?.timePerQuestion) {
      setTimeLeft(session.timePerQuestion)
    }
  }, [session?.currentRound])

  useEffect(() => {
    clearInterval(timerRef.current)

    if (timeLeft === null || timeLeft <= 0) return

    const me = players.find((p) => p.id === playerId)
    const hasAnswered = me?.answers?.[`round_${session?.currentRound}`]
    if (hasAnswered) {
      clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timerRef.current)
  }, [timeLeft !== null && timeLeft > 0, players, session?.currentRound])

  const submitTimeout = useCallback(async () => {
    if (autoSubmitted.current || submitting) return
    autoSubmitted.current = true
    setSubmitting(true)

    const question = getCurrentQuestion()
    if (!question) return
    const round = session.currentRound

    await updateDoc(doc(db, 'sessions', sessionId, 'players', playerId), {
      [`answers.round_${round}`]: {
        questionId: question.id,
        selected: -1,
        correct: false,
        timedOut: true,
      },
    })
  }, [session?.currentRound, submitting, questions, players])

  useEffect(() => {
    if (timeLeft === 0) {
      const me = players.find((p) => p.id === playerId)
      const hasAnswered = me?.answers?.[`round_${session?.currentRound}`]
      if (!hasAnswered) {
        submitTimeout()
      }
    }
  }, [timeLeft])

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
    clearInterval(timerRef.current)

    const question = getCurrentQuestion()
    const correct = question.options[selectedOption].isCorrect
    const round = session.currentRound

    if (!correct) {
      setShaking(true)
      setTimeout(() => setShaking(false), 500)
    }

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
      <div className="game-bg flex items-center justify-center p-4">
        <div className="absolute inset-0 z-0"><MagicRings color="#7c3aed" colorTwo="#06b6d4" speed={0.4} ringCount={4} opacity={0.25} baseRadius={0.15} radiusStep={0.1} /></div>
        <div className="text-cyan-400 text-lg animate-pulse relative z-10">Carregando...</div>
      </div>
    )
  }

  const totalTime = session.timePerQuestion || 30
  const letters = ['A', 'B', 'C', 'D']

  return (
    <div className="game-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 z-0"><MagicRings color="#7c3aed" colorTwo="#06b6d4" speed={0.4} ringCount={4} opacity={0.25} baseRadius={0.15} radiusStep={0.1} /></div>

      <div className={`glass-card p-6 w-full max-w-sm relative z-10 fade-in-up ${shaking ? 'shake' : ''}`}>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <span className="text-xs font-bold text-white/50 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full tracking-wider">
            RODADA {session.currentRound + 1}/{session.totalRounds}
          </span>
          <div className="flex items-center gap-1.5">
            {players.map((p) => (
              <div
                key={p.id}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  p.answers?.[`round_${session.currentRound}`]
                    ? 'bg-green-400'
                    : 'bg-white/15'
                }`}
                title={p.name}
              />
            ))}
          </div>
        </div>

        {/* Timer */}
        {!hasAnswered && timeLeft != null && (
          <div className="mb-5">
            <CircleTimer timeLeft={timeLeft} totalTime={totalTime} />
          </div>
        )}

        {/* Question */}
        <div className="text-lg font-bold text-white mb-5 leading-snug text-center min-h-[3.5rem]">
          <TextType
            key={`${session.currentRound}-${question.id}`}
            text={question.text}
            typingSpeed={25}
            loop={false}
            showCursor={false}
            className="text-lg font-bold text-white"
          />
        </div>

        {hasAnswered ? (
          <div className="text-center py-6 fade-in-up">
            {hasAnswered.timedOut ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-orange-500/20 border-2 border-orange-500/50">
                  <span className="text-3xl font-bold text-orange-400">!</span>
                </div>
                <p className="font-bold text-lg text-orange-400">Tempo esgotado!</p>
              </>
            ) : hasAnswered.correct ? (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-green-500/20 border-2 border-green-500/50 score-reveal">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="font-bold text-lg text-green-400">Correto!</p>
              </>
            ) : (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-500/20 border-2 border-red-500/50 score-reveal">
                  <span className="text-3xl">✗</span>
                </div>
                <p className="font-bold text-lg text-red-400">Incorreto</p>
              </>
            )}
            <p className="text-white/30 text-sm mt-4 flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-white/20 border-t-white/50 rounded-full animate-spin" />
              Aguardando {players.length - answeredCount} jogador(es)...
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2.5 mb-5 stagger">
              {question.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  disabled={submitting}
                  className={`fade-in-up option-card w-full text-left px-4 py-3.5 flex items-center gap-3 ${
                    selectedOption === i ? 'selected' : ''
                  } disabled:opacity-50`}
                >
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${
                      selectedOption === i
                        ? 'bg-cyan-500/30 text-cyan-300'
                        : 'bg-white/5 text-white/30'
                    }`}
                  >
                    {letters[i]}
                  </span>
                  <span className={`text-sm ${selectedOption === i ? 'text-white' : 'text-white/70'}`}>
                    {opt.text}
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={handleAnswer}
              disabled={selectedOption === null || submitting}
              className="glow-btn w-full py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-bold tracking-wide"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enviando...
                </span>
              ) : (
                'CONFIRMAR'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
