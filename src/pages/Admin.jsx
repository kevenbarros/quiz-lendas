import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase'
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, setDoc, getDoc
} from 'firebase/firestore'

export default function Admin() {
  const [questions, setQuestions] = useState([])
  const [config, setConfig] = useState({
    totalRounds: 4,
    threshold: 80,
    secretCode: '1234',
  })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    category: '',
  })
  const [tab, setTab] = useState('questions')
  const [sessions, setSessions] = useState([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    const unsubQ = onSnapshot(collection(db, 'questions'), (snap) => {
      setQuestions(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    })

    const unsubS = onSnapshot(collection(db, 'sessions'), (snap) => {
      setSessions(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      )
    })

    getDoc(doc(db, 'config', 'settings')).then((snap) => {
      if (snap.exists()) setConfig(snap.data())
    })

    return () => {
      unsubQ()
      unsubS()
    }
  }, [])

  async function saveConfig() {
    await setDoc(doc(db, 'config', 'settings'), config)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function saveQuestion() {
    const data = {
      text: form.text,
      options: form.options.map((text, i) => ({
        text,
        isCorrect: i === form.correctIndex,
      })),
      category: form.category,
    }

    if (editing) {
      await updateDoc(doc(db, 'questions', editing), data)
    } else {
      await addDoc(collection(db, 'questions'), data)
    }

    setForm({ text: '', options: ['', '', '', ''], correctIndex: 0, category: '' })
    setEditing(null)
  }

  function editQuestion(q) {
    setEditing(q.id)
    setForm({
      text: q.text,
      options: q.options.map((o) => o.text),
      correctIndex: q.options.findIndex((o) => o.isCorrect),
      category: q.category || '',
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteQuestion(id) {
    if (confirm('Excluir esta pergunta?')) {
      await deleteDoc(doc(db, 'questions', id))
    }
  }

  async function closeSession(id) {
    if (confirm('Encerrar esta sessao?')) {
      await updateDoc(doc(db, 'sessions', id), { status: 'closed' })
    }
  }

  const qrRef = useRef(null)
  const siteUrl = window.location.origin

  function printQR() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>QR Code - Quiz Compliance</title>
      <style>body{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;font-family:sans-serif;margin:0;}
      h2{margin-bottom:8px;}p{color:#666;margin-bottom:24px;}</style></head>
      <body><h2>Quiz Compliance - Escape Box</h2><p>${siteUrl}</p>${svgData}
      <script>setTimeout(()=>window.print(),300)<\/script></body></html>
    `)
    win.document.close()
  }

  const tabs = [
    { key: 'questions', label: 'Perguntas' },
    { key: 'config', label: 'Config' },
    { key: 'qrcode', label: 'QR Code' },
    { key: 'sessions', label: 'Sessoes' },
  ]

  return (
    <div className="min-h-dvh bg-slate-100 p-4 pb-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Painel Admin
        </h1>
        <p className="text-slate-500 text-sm mb-6">
          {questions.length} perguntas cadastradas
        </p>

        <div className="flex gap-2 mb-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                tab === t.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'config' && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Numero de Rodadas
                </label>
                <input
                  type="number"
                  value={config.totalRounds}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      totalRounds: parseInt(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  min="1"
                />
                <p className="text-xs text-slate-400 mt-1">
                  Se menor que o numero de jogadores, sera ajustado
                  automaticamente
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Percentual Minimo (%)
                </label>
                <input
                  type="number"
                  value={config.threshold}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      threshold: parseInt(e.target.value) || 80,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Codigo Secreto
                </label>
                <input
                  type="text"
                  value={config.secretCode}
                  onChange={(e) =>
                    setConfig({ ...config, secretCode: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none font-mono text-lg tracking-wider"
                />
              </div>
              <button
                onClick={saveConfig}
                className={`w-full py-2 rounded-lg font-medium transition-colors ${
                  saved
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 text-white'
                }`}
              >
                {saved ? 'Salvo!' : 'Salvar Configuracoes'}
              </button>
            </div>
          </div>
        )}

        {tab === 'questions' && (
          <>
            <div className="bg-white rounded-xl p-6 shadow-sm mb-4">
              <h3 className="font-semibold text-slate-700 mb-4">
                {editing ? 'Editar Pergunta' : 'Nova Pergunta'}
              </h3>
              <div className="space-y-3">
                <textarea
                  placeholder="Texto da pergunta"
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                  rows="2"
                />
                <input
                  type="text"
                  placeholder="Categoria (ex: LGPD, Etica, Anticorrupcao)"
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                />
                {form.options.map((opt, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      type="radio"
                      name="correct"
                      checked={form.correctIndex === i}
                      onChange={() => setForm({ ...form, correctIndex: i })}
                      className="w-4 h-4 text-blue-600"
                    />
                    <input
                      type="text"
                      placeholder={`Alternativa ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const opts = [...form.options]
                        opts[i] = e.target.value
                        setForm({ ...form, options: opts })
                      }}
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                    />
                  </div>
                ))}
                <p className="text-xs text-slate-400">
                  Selecione o radio da alternativa correta
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={saveQuestion}
                    disabled={!form.text || form.options.some((o) => !o)}
                    className="flex-1 py-2 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
                  >
                    {editing ? 'Atualizar' : 'Adicionar'}
                  </button>
                  {editing && (
                    <button
                      onClick={() => {
                        setEditing(null)
                        setForm({
                          text: '',
                          options: ['', '', '', ''],
                          correctIndex: 0,
                          category: '',
                        })
                      }}
                      className="px-4 py-2 bg-slate-200 text-slate-600 rounded-lg"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {questions.map((q) => (
                <div key={q.id} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-800 text-sm">
                        {q.text}
                      </p>
                      {q.category && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">
                          {q.category}
                        </span>
                      )}
                      <div className="mt-2 space-y-0.5">
                        {q.options?.map((o, i) => (
                          <p
                            key={i}
                            className={`text-xs ${
                              o.isCorrect
                                ? 'text-green-600 font-semibold'
                                : 'text-slate-400'
                            }`}
                          >
                            {o.isCorrect ? '✓' : '○'} {o.text}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => editQuestion(q)}
                        className="text-blue-500 text-xs px-2 py-1 hover:bg-blue-50 rounded"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="text-red-500 text-xs px-2 py-1 hover:bg-red-50 rounded"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {questions.length === 0 && (
                <p className="text-center text-slate-400 py-8">
                  Nenhuma pergunta cadastrada
                </p>
              )}
            </div>
          </>
        )}

        {tab === 'qrcode' && (
          <div className="bg-white rounded-xl p-6 shadow-sm text-center">
            <h3 className="font-semibold text-slate-700 mb-1">
              QR Code do Quiz
            </h3>
            <p className="text-slate-400 text-sm mb-6">
              Imprima e coloque na Escape Box
            </p>

            <div ref={qrRef} className="flex justify-center mb-4">
              <QRCodeSVG
                value={siteUrl}
                size={220}
                level="H"
                includeMargin
              />
            </div>

            <p className="text-xs text-slate-500 bg-slate-50 px-3 py-2 rounded-lg mb-6 font-mono break-all">
              {siteUrl}
            </p>

            <button
              onClick={printQR}
              className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium"
            >
              Imprimir QR Code
            </button>
          </div>
        )}

        {tab === 'sessions' && (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-xl p-4 shadow-sm flex justify-between items-center"
              >
                <div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      s.status === 'lobby'
                        ? 'bg-yellow-100 text-yellow-700'
                        : s.status === 'playing'
                          ? 'bg-green-100 text-green-700'
                          : s.status === 'finished'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {s.status}
                  </span>
                  <span className="text-sm text-slate-500 ml-2">
                    {s.id.slice(0, 8)}...
                  </span>
                </div>
                {(s.status === 'lobby' || s.status === 'playing') && (
                  <button
                    onClick={() => closeSession(s.id)}
                    className="text-red-500 text-sm hover:bg-red-50 px-2 py-1 rounded"
                  >
                    Encerrar
                  </button>
                )}
              </div>
            ))}
            {sessions.length === 0 && (
              <p className="text-center text-slate-400 py-8">
                Nenhuma sessao registrada
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
