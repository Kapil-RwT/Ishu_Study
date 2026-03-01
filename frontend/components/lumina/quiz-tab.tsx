'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Trophy,
  CheckCircle2,
  Brain,
  XCircle,
  ChevronDown,
  RotateCcw,
} from 'lucide-react'
import { useCourseStore } from '@/lib/store'

const difficultyColors: Record<string, { bg: string; text: string }> = {
  Easy: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  Medium: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  Hard: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  Expert: { bg: 'bg-red-500/15', text: 'text-red-400' },
}

const optionLetters = ['A', 'B', 'C', 'D']

export function QuizTab() {
  const { course, quizAnswers, setQuizAnswer, quizSubmitted, submitQuiz, resetQuiz } =
    useCourseStore()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showHint, setShowHint] = useState(false)

  if (!course) return null
  const questions = course.quizQuestions
  const currentQ = questions[currentIndex]
  const allAnswered = questions.every((q) => quizAnswers[q.id] !== undefined)

  if (quizSubmitted) {
    return <QuizResults />
  }

  const diff = difficultyColors[currentQ.difficulty] || difficultyColors.Easy

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 sm:px-6">
      {/* Progress Dots */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {questions.map((q, i) => {
          const isAnswered = quizAnswers[q.id] !== undefined
          const isCurrent = i === currentIndex
          return (
            <button
              key={q.id}
              onClick={() => {
                setCurrentIndex(i)
                setShowHint(false)
              }}
              className={`h-2.5 w-2.5 rounded-full transition-all ${
                isCurrent
                  ? 'scale-125 ring-2 ring-primary/50 bg-primary'
                  : isAnswered
                  ? 'bg-lumina-blue'
                  : 'bg-secondary'
              }`}
              aria-label={`Go to question ${i + 1}`}
            />
          )
        })}
      </div>

      {/* Question Counter */}
      <p className="text-xs text-muted-foreground">
        Question{' '}
        <span className="font-semibold text-foreground">{currentIndex + 1}</span> of{' '}
        {questions.length}
      </p>

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQ.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-lg"
        >
          <div className="rounded-2xl border border-border/30 bg-card p-6">
            {/* Difficulty Badge */}
            <div className="mb-4">
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${diff.bg} ${diff.text}`}
              >
                {currentQ.difficulty}
              </span>
            </div>

            {/* Question */}
            <h3 className="mb-6 text-lg font-semibold text-foreground leading-relaxed">
              {currentQ.question}
            </h3>

            {/* Options */}
            <div className="grid gap-3 sm:grid-cols-2">
              {currentQ.options.map((option, i) => {
                const isSelected = quizAnswers[currentQ.id] === i
                return (
                  <motion.button
                    key={i}
                    onClick={() => setQuizAnswer(currentQ.id, i)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                      isSelected
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border/30 bg-secondary/20 hover:border-border/50 hover:bg-secondary/40'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {optionLetters[i]}
                    </span>
                    <span className="text-sm text-foreground">{option}</span>
                  </motion.button>
                )
              })}
            </div>

            {/* Hint */}
            <div className="mt-4">
              <button
                onClick={() => setShowHint(!showHint)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {showHint ? 'Hide hint' : 'Show hint'}
              </button>
              <AnimatePresence>
                {showHint && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 overflow-hidden rounded-lg bg-lumina-gold/5 px-3 py-2 text-xs text-lumina-gold"
                  >
                    {currentQ.hint}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex w-full max-w-lg items-center justify-between">
        <button
          onClick={() => {
            setCurrentIndex(Math.max(0, currentIndex - 1))
            setShowHint(false)
          }}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>

        {currentIndex === questions.length - 1 ? (
          <button
            onClick={submitQuiz}
            disabled={!allAnswered}
            className="flex items-center gap-1.5 rounded-lg px-6 py-2 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
            style={{
              background: 'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
            }}
          >
            Submit Quiz
          </button>
        ) : (
          <button
            onClick={() => {
              setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))
              setShowHint(false)
            }}
            className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/30 px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}

function QuizResults() {
  const { course, quizAnswers, resetQuiz } = useCourseStore()
  const [animatedScore, setAnimatedScore] = useState(0)
  const [expandedQ, setExpandedQ] = useState<string | null>(null)

  const results = useMemo(() => {
    if (!course) return { score: 0, correct: 0, total: 0, conceptScores: {} as Record<string, { correct: number; total: number; title: string }> }
    const total = course.quizQuestions.length
    let correct = 0
    const conceptScores: Record<string, { correct: number; total: number; title: string }> = {}

    course.quizQuestions.forEach((q) => {
      const concept = course.concepts.find((c) => c.id === q.conceptId)
      if (!conceptScores[q.conceptId]) {
        conceptScores[q.conceptId] = { correct: 0, total: 0, title: concept?.title || '' }
      }
      conceptScores[q.conceptId].total++
      if (quizAnswers[q.id] === q.correctAnswer) {
        correct++
        conceptScores[q.conceptId].correct++
      }
    })

    return { score: Math.round((correct / total) * 100), correct, total, conceptScores }
  }, [course, quizAnswers])

  useEffect(() => {
    const duration = 1500
    const step = results.score / (duration / 16)
    let current = 0
    const interval = setInterval(() => {
      current += step
      if (current >= results.score) {
        setAnimatedScore(results.score)
        clearInterval(interval)
      } else {
        setAnimatedScore(Math.round(current))
      }
    }, 16)
    return () => clearInterval(interval)
  }, [results.score])

  if (!course) return null

  const getScoreIcon = () => {
    if (results.score >= 80) return <Trophy className="h-10 w-10 text-lumina-gold" />
    if (results.score >= 60) return <CheckCircle2 className="h-10 w-10 text-lumina-emerald" />
    return <Brain className="h-10 w-10 text-primary" />
  }

  const getScoreMessage = () => {
    if (results.score >= 80) return 'Excellent!'
    if (results.score >= 60) return 'Good Job!'
    return 'Keep Learning!'
  }

  return (
    <div className="flex flex-col items-center gap-8 px-4 py-8 sm:px-6">
      {/* Score Display */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.div
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring' }}
        >
          {getScoreIcon()}
        </motion.div>
        <div className="text-6xl font-bold text-foreground">{animatedScore}%</div>
        <p className="text-lg font-semibold text-foreground">{getScoreMessage()}</p>
        <p className="text-sm text-muted-foreground">
          {results.correct} of {results.total} correct
        </p>
      </motion.div>

      {/* Concept Breakdown */}
      <div className="w-full max-w-lg">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Score by concept</h4>
        <div className="flex flex-col gap-2">
          {Object.entries(results.conceptScores).map(([id, data]) => {
            const pct = Math.round((data.correct / data.total) * 100)
            return (
              <div key={id} className="flex items-center gap-3">
                <span className="w-28 truncate text-xs text-muted-foreground">
                  {data.title}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                    style={{
                      background:
                        pct >= 80
                          ? 'var(--lumina-gold)'
                          : pct >= 50
                          ? 'var(--lumina-emerald)'
                          : 'var(--lumina-blue)',
                    }}
                  />
                </div>
                <span className="w-10 text-right text-xs font-medium text-foreground">
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Review Questions */}
      <div className="w-full max-w-lg">
        <h4 className="mb-3 text-sm font-semibold text-foreground">Review answers</h4>
        <div className="flex flex-col gap-2">
          {course.quizQuestions.map((q, i) => {
            const userAnswer = quizAnswers[q.id]
            const isCorrect = userAnswer === q.correctAnswer
            const isExpanded = expandedQ === q.id

            return (
              <div
                key={q.id}
                className="rounded-xl border border-border/30 bg-card overflow-hidden"
              >
                <button
                  onClick={() => setExpandedQ(isExpanded ? null : q.id)}
                  className="flex w-full items-center gap-3 p-3 text-left"
                >
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                      isCorrect
                        ? 'bg-lumina-emerald/20 text-lumina-emerald'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {isCorrect ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="flex-1 truncate text-xs text-foreground">
                    {i + 1}. {q.question}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-border/20"
                    >
                      <div className="flex flex-col gap-2 p-3">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] font-medium text-muted-foreground">
                            Your answer:
                          </span>
                          <span
                            className={`text-xs ${
                              isCorrect ? 'text-lumina-emerald' : 'text-red-400'
                            }`}
                          >
                            {q.options[userAnswer]}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-medium text-muted-foreground">
                              Correct:
                            </span>
                            <span className="text-xs text-lumina-emerald">
                              {q.options[q.correctAnswer]}
                            </span>
                          </div>
                        )}
                        <p className="mt-1 rounded-lg bg-secondary/30 p-2 text-xs text-muted-foreground leading-relaxed">
                          {q.explanation}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>

      {/* Retry Button */}
      <button
        onClick={resetQuiz}
        className="flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90"
        style={{
          background: 'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
        }}
      >
        <RotateCcw className="h-4 w-4" />
        Retry Quiz
      </button>
    </div>
  )
}
