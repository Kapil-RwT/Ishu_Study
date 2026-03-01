'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion'
import { Shuffle, RotateCcw, Filter, Star, Check, RotateCw } from 'lucide-react'
import { useCourseStore } from '@/lib/store'
import type { Flashcard } from '@/lib/types'

const categoryColors: Record<string, { bg: string; text: string }> = {
  definition: { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  example: { bg: 'bg-emerald-500/15', text: 'text-emerald-400' },
  comparison: { bg: 'bg-violet-500/15', text: 'text-violet-400' },
  application: { bg: 'bg-amber-500/15', text: 'text-amber-400' },
  mnemonic: { bg: 'bg-pink-500/15', text: 'text-pink-400' },
}

function DifficultyStars({ level }: { level: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-3 w-3 ${i < level ? 'fill-lumina-gold text-lumina-gold' : 'text-secondary'
            }`}
        />
      ))}
    </div>
  )
}

function FlashcardItem({
  card,
  onSwipeRight,
  onSwipeLeft,
  isTop,
}: {
  card: Flashcard
  onSwipeRight: () => void
  onSwipeLeft: () => void
  isTop: boolean
}) {
  const [isFlipped, setIsFlipped] = useState(false)
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const rightOpacity = useTransform(x, [0, 100], [0, 1])
  const leftOpacity = useTransform(x, [-100, 0], [1, 0])

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x > 100) {
        onSwipeRight()
      } else if (info.offset.x < -100) {
        onSwipeLeft()
      }
    },
    [onSwipeRight, onSwipeLeft]
  )

  const cat = categoryColors[card.category] || categoryColors.definition

  return (
    <motion.div
      className="absolute inset-0"
      style={{ x, rotate, zIndex: isTop ? 10 : 0 }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, y: isTop ? 0 : 8 }}
      animate={{
        scale: isTop ? 1 : 0.95,
        y: isTop ? 0 : 8,
        opacity: 1,
      }}
      exit={{
        x: 300,
        opacity: 0,
        transition: { duration: 0.3 },
      }}
    >
      {/* Swipe indicators */}
      {isTop && (
        <>
          <motion.div
            className="absolute left-4 top-4 z-20 rounded-lg bg-lumina-emerald/20 px-3 py-1.5 text-xs font-bold text-lumina-emerald"
            style={{ opacity: rightOpacity }}
          >
            GOT IT
          </motion.div>
          <motion.div
            className="absolute right-4 top-4 z-20 rounded-lg bg-amber-500/20 px-3 py-1.5 text-xs font-bold text-amber-400"
            style={{ opacity: leftOpacity }}
          >
            REVIEW
          </motion.div>
        </>
      )}

      <div
        className="h-full cursor-pointer"
        onClick={() => isTop && setIsFlipped(!isFlipped)}
        style={{ perspective: '1000px' }}
      >
        <motion.div
          className="relative h-full w-full"
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-border/30 bg-card p-6"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${cat.bg} ${cat.text}`}>
                {card.category}
              </span>
              <DifficultyStars level={card.difficulty} />
            </div>

            <div className="flex flex-1 items-center justify-center px-4">
              <p className="text-center text-lg font-semibold text-foreground leading-relaxed">
                {card.front}
              </p>
            </div>

            <p className="text-center text-xs text-muted-foreground/50">Tap to flip</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col rounded-2xl border border-primary/20 bg-card p-6"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${cat.bg} ${cat.text}`}>
                Answer
              </span>
              <RotateCw className="h-3.5 w-3.5 text-muted-foreground/40" />
            </div>

            <div className="flex flex-1 items-center justify-center px-4">
              <p className="text-center text-sm text-muted-foreground leading-relaxed">
                {card.back}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSwipeLeft()
                }}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
              >
                Review again
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSwipeRight()
                }}
                className="flex items-center gap-1.5 rounded-lg bg-lumina-emerald/10 px-4 py-2 text-xs font-medium text-lumina-emerald transition-colors hover:bg-lumina-emerald/20"
              >
                <Check className="h-3.5 w-3.5" />
                Got it
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function FlashcardsTab() {
  const { course, completedFlashcards, markFlashcardComplete, resetFlashcards } =
    useCourseStore()
  const [conceptFilter, setConceptFilter] = useState<string>('all')
  const [shuffled, setShuffled] = useState(false)
  const [allDone, setAllDone] = useState(false)

  const filteredCards = useMemo(() => {
    if (!course) return []
    let cards = course.flashcards.filter((f) => !completedFlashcards[f.id])
    if (conceptFilter !== 'all') {
      cards = cards.filter((f) => f.conceptId === conceptFilter)
    }
    if (shuffled) {
      cards = [...cards].sort(() => Math.random() - 0.5)
    }
    return cards
  }, [course, completedFlashcards, conceptFilter, shuffled])

  const handleSwipeRight = useCallback(
    (cardId: string) => {
      markFlashcardComplete(cardId)
      if (filteredCards.length <= 1) {
        setAllDone(true)
      }
    },
    [markFlashcardComplete, filteredCards.length]
  )

  const handleSwipeLeft = useCallback(
    (_cardId: string) => {
      // Reviewed card but not completed - just remove from current view
      // In a real app this would mark for review
    },
    []
  )

  const handleReset = useCallback(() => {
    resetFlashcards()
    setAllDone(false)
  }, [resetFlashcards])

  if (!course) return null

  const totalCards = conceptFilter === 'all'
    ? course.flashcards.length
    : course.flashcards.filter((f) => f.conceptId === conceptFilter).length
  const completed = completedFlashcards.size

  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 sm:px-6">
      {/* Controls */}
      <div className="flex w-full max-w-md items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg border border-border/30 bg-secondary/30 px-2 py-1">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={conceptFilter}
              onChange={(e) => setConceptFilter(e.target.value)}
              className="bg-transparent text-xs text-foreground outline-none"
            >
              <option value="all">All concepts</option>
              {course.concepts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShuffled(!shuffled)}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 transition-colors ${shuffled ? 'bg-primary/10 text-primary' : 'bg-secondary/30 text-muted-foreground hover:text-foreground'
              }`}
            aria-label="Shuffle cards"
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleReset}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/30 bg-secondary/30 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Reset cards"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Progress */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{completed}</span>
          {' / '}
          <span>{totalCards}</span> cards reviewed
        </p>
      </div>

      {/* Card Stack */}
      <div className="relative h-80 w-full max-w-md sm:h-96">
        <AnimatePresence>
          {allDone ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex h-full flex-col items-center justify-center gap-4 rounded-2xl border border-lumina-emerald/20 bg-lumina-emerald/5 p-8"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="text-5xl"
              >
                <Check className="h-12 w-12 text-lumina-emerald" />
              </motion.div>
              <h3 className="text-xl font-bold text-foreground">All done!</h3>
              <p className="text-sm text-muted-foreground text-center">
                {"You've"} reviewed all {Object.keys(completedFlashcards).length} flashcards in this module. Great work!
              </p>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
              >
                <RotateCcw className="h-4 w-4" />
                Start over
              </button>
            </motion.div>
          ) : (
            filteredCards.slice(0, 2).map((card, i) => (
              <FlashcardItem
                key={card.id}
                card={card}
                isTop={i === 0}
                onSwipeRight={() => handleSwipeRight(card.id)}
                onSwipeLeft={() => handleSwipeLeft(card.id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>

      {/* Hint */}
      {!allDone && filteredCards.length > 0 && (
        <p className="text-center text-xs text-muted-foreground/40">
          Swipe right for "Got it" | Swipe left to review again
        </p>
      )}
    </div>
  )
}
