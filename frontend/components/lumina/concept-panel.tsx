'use client'

import { motion } from 'framer-motion'
import { X, BookOpen, Layers, Puzzle, Clock } from 'lucide-react'
import { useCourseStore } from '@/lib/store'
import { Badge } from '@/components/ui/badge'

const depthLabels: Record<number, string> = {
  0: 'Core Concept',
  1: 'Topic',
  2: 'Detail',
  3: 'Deep Dive',
}

const depthColors: Record<number, string> = {
  0: 'bg-primary/20 text-primary',
  1: 'bg-lumina-cyan/20 text-lumina-cyan',
  2: 'bg-lumina-emerald/20 text-lumina-emerald',
  3: 'bg-lumina-gold/20 text-lumina-gold',
}

export function ConceptPanel() {
  const { course, selectedConceptId, selectConcept, masteryLevels, updateMastery } =
    useCourseStore()

  if (!course || !selectedConceptId) return null

  const concept = course.concepts.find((c) => c.id === selectedConceptId)
  if (!concept) return null

  const mastery = masteryLevels[concept.id] || 0

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="absolute right-0 top-0 z-20 flex h-full w-full max-w-sm flex-col border-l border-border/30 bg-background/95 backdrop-blur-xl sm:w-96"
    >
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-border/20 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-semibold ${depthColors[concept.depth]}`}
            >
              {depthLabels[concept.depth]}
            </span>
          </div>
          <h3 className="text-base font-semibold text-foreground">{concept.title}</h3>
        </div>
        <button
          onClick={() => selectConcept(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex flex-col gap-5">
          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {concept.description}
          </p>

          {/* Mastery Bar */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Mastery</span>
              <span className="text-xs font-semibold text-foreground">{mastery}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${mastery}%` }}
                transition={{ duration: 0.5 }}
                style={{
                  background:
                    mastery >= 90
                      ? 'var(--lumina-gold)'
                      : mastery >= 50
                        ? 'var(--lumina-emerald)'
                        : 'var(--lumina-blue)',
                }}
              />
            </div>
          </div>

          {/* Key Points */}
          <div>
            <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Key Points
            </h4>
            <ul className="flex flex-col gap-1.5">
              {concept.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/50" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          {/* Timestamps */}
          {concept.timestamps.length > 0 && (
            <div>
              <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Clock className="h-3.5 w-3.5 text-primary" />
                Timestamps
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {concept.timestamps.map((ts, i) => {
                  // Parse start time (e.g. "1:43 - 2:52" -> "1:43")
                  let seconds = 0
                  const startStr = ts.split('-')[0].trim()
                  if (startStr) {
                    const parts = startStr.split(':').map(Number)
                    if (parts.length === 3) {
                      seconds = parts[0] * 3600 + parts[1] * 60 + parts[2]
                    } else if (parts.length === 2) {
                      seconds = parts[0] * 60 + parts[1]
                    }
                  }

                  const href = course.videoUrl
                    ? `${course.videoUrl}${course.videoUrl.includes('?') ? '&' : '?'}t=${seconds}s`
                    : '#'

                  if (course.videoUrl) {
                    return (
                      <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-md border border-transparent bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-primary/20 hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      >
                        {ts}
                      </a>
                    )
                  }

                  return (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="bg-secondary/80 text-xs text-muted-foreground"
                    >
                      {ts}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}

          {/* Related counts */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Layers className="h-3.5 w-3.5" />
              {concept.flashcardCount} flashcards
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Puzzle className="h-3.5 w-3.5" />
              {concept.quizCount} questions
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border/20 p-4">
        <button
          onClick={() => updateMastery(concept.id, 25)}
          disabled={mastery >= 100}
          className="flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30"
          style={{
            background: 'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
          }}
        >
          {mastery >= 100 ? 'Fully Mastered' : 'Mark as Studied (+25%)'}
        </button>
      </div>
    </motion.div>
  )
}
