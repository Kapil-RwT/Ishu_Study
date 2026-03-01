'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface VanishInputProps {
  placeholders: string[]
  onSubmit: (value: string) => void
}

export function VanishInput({ placeholders, onSubmit }: VanishInputProps) {
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [value, setValue] = useState('')
  const [isAnimating, setIsAnimating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 3000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [placeholders.length])

  const handleSubmit = useCallback(() => {
    if (!value.trim()) return
    setIsAnimating(true)
    setTimeout(() => {
      onSubmit(value)
      setValue('')
      setIsAnimating(false)
    }, 600)
  }, [value, onSubmit])

  return (
    <div className="relative w-full">
      <motion.div
        className="relative flex items-center gap-2 rounded-xl border border-border/50 bg-secondary/50 px-4 py-3 transition-colors focus-within:border-primary/50 focus-within:bg-secondary/80"
        animate={isAnimating ? { scale: [1, 1.02, 0.98, 1] } : {}}
        transition={{ duration: 0.4 }}
      >
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit()
          }}
          className="flex-1 bg-transparent text-foreground text-base outline-none placeholder-transparent"
          aria-label="Paste a YouTube URL"
        />

        <AnimatePresence mode="wait">
          {!value && (
            <motion.span
              key={currentPlaceholder}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 0.5, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="pointer-events-none absolute left-4 text-base text-muted-foreground"
            >
              {placeholders[currentPlaceholder]}
            </motion.span>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleSubmit}
          disabled={!value.trim()}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
          aria-label="Submit URL"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="shrink-0"
          >
            <path
              d="M2 8h12M9 3l5 5-5 5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.button>
      </motion.div>
    </div>
  )
}
