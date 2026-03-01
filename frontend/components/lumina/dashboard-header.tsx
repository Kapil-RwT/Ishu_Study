'use client'

import Link from 'next/link'
import { Sparkles, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCourseStore } from '@/lib/store'

export function DashboardHeader() {
  const { course, masteryLevels } = useCourseStore()
  const [showObjectives, setShowObjectives] = useState(false)

  if (!course) return null

  const totalConcepts = course.concepts.length
  const totalMastery = Object.values(masteryLevels)
  const averageMastery =
    totalConcepts > 0
      ? Math.round(totalMastery.reduce((a, b) => a + b, 0) / totalConcepts)
      : 0
  const masteredCount = totalMastery.filter((m) => m >= 90).length
  const completedFlashcardsObj = useCourseStore((s) => s.completedFlashcards)
  const completedFlashcards = Object.keys(completedFlashcardsObj).length
  const totalFlashcards = course.flashcards.length
  const quizSubmitted = useCourseStore((s) => s.quizSubmitted)
  const quizAnswers = useCourseStore((s) => s.quizAnswers)

  let quizScore = 0
  if (quizSubmitted) {
    const correct = course.quizQuestions.filter(
      (q) => quizAnswers[q.id] === q.correctAnswer
    ).length
    quizScore = Math.round((correct / course.quizQuestions.length) * 100)
  }

  return (
    <div className="sticky top-0 z-40 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      {/* Top Bar */}
      <div className="flex items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/20">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
          </div>
          <span
            className="hidden text-sm font-bold sm:inline"
            style={{
              background: 'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Lumina
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold text-foreground">
            {course.title}
          </h1>
        </div>

        {/* Progress */}
        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-2 w-24 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${averageMastery}%`,
                background: 'linear-gradient(90deg, var(--lumina-blue), var(--lumina-cyan))',
              }}
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {averageMastery}%
          </span>
        </div>

        <Link
          href="/"
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border/40 bg-secondary/50 px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">New Course</span>
        </Link>
      </div>

      {/* Stat Pills */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pb-3 sm:px-6">
        <StatPill
          label={`Mastered ${masteredCount}/${totalConcepts}`}
          color="var(--lumina-gold)"
        />
        <StatPill
          label={`Cards ${completedFlashcards}/${totalFlashcards}`}
          color="var(--lumina-cyan)"
        />
        <StatPill
          label={quizSubmitted ? `Quiz ${quizScore}%` : 'Quiz --'}
          color="var(--lumina-emerald)"
        />
        <button
          onClick={() => setShowObjectives(!showObjectives)}
          className="ml-auto flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Objectives
          {showObjectives ? (
            <ChevronUp className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
        </button>
      </div>

      {/* Learning Objectives */}
      <AnimatePresence>
        {showObjectives && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-border/20"
          >
            <div className="px-4 py-3 sm:px-6">
              <ul className="flex flex-col gap-1.5">
                {course.learningObjectives.map((obj, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs text-muted-foreground"
                  >
                    <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/50" />
                    {obj}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function StatPill({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        borderColor: `color-mix(in oklch, ${color}, transparent 70%)`,
        color: color,
        backgroundColor: `color-mix(in oklch, ${color}, transparent 90%)`,
      }}
    >
      {label}
    </div>
  )
}
