'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Check, Download, Brain, Sparkles, CircleCheck } from 'lucide-react'
import { getProgress } from '@/lib/api'

interface ProcessingStep {
  id: string
  label: string
  icon: React.ReactNode
  status: 'pending' | 'active' | 'complete'
}

interface ProcessingStateProps {
  videoTitle?: string
  jobId: string | null
  onComplete: (jobId: string) => void
}

const STEP_MAP: Record<string, number> = {
  'Queued': 0,
  'Fetching video info': 0,
  'Video info fetched': 0,
  'Downloading video': 0,
  'Download complete': 1,
  'AI analysis': 1,
  'Extracting transcript (fallback)': 1,
  'Uploading video to AI for analysis...': 1,
  'Uploading video to AI for analysis': 1,
  'Analysis complete': 1,
  'Validating file': 0,
  'File validated': 0,
  'Preparing for analysis': 0,
  'Generating course structure': 2,
  'Course generated': 2,
  'Complete': 3,
  'Failed': -1,
  // Fallbacks for messages as current_step instead of actual current_step
  'Downloading video...': 0,
  'Downloaded': 1,
  'Uploading video to AI': 1,
}

export function ProcessingState({ videoTitle, jobId, onComplete }: ProcessingStateProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'download', label: 'Downloading video', icon: <Download className="h-4 w-4" />, status: 'active' },
    { id: 'analyze', label: 'Analyzing content', icon: <Brain className="h-4 w-4" />, status: 'pending' },
    { id: 'generate', label: 'Generating course', icon: <Sparkles className="h-4 w-4" />, status: 'pending' },
    { id: 'complete', label: 'Finalizing', icon: <CircleCheck className="h-4 w-4" />, status: 'pending' },
  ])
  const [progress, setProgress] = useState(0)
  const [title, setTitle] = useState(videoTitle)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!jobId) return
    if (completedRef.current) return

    const pollInterval = setInterval(async () => {
      try {
        const data = await getProgress(jobId)

        // Update progress bar
        setProgress(data.progress)

        // Update video title if we got one from the backend
        if (data.videoTitle) setTitle(data.videoTitle)

        // Map currentStep to our 4-step UI
        const stepIndex = STEP_MAP[data.currentStep] ?? -1

        setSteps((prev) =>
          prev.map((s, i) => ({
            ...s,
            status:
              i < stepIndex
                ? ('complete' as const)
                : i === stepIndex
                  ? ('active' as const)
                  : i <= stepIndex
                    ? ('complete' as const)
                    : ('pending' as const),
          }))
        )

        // Handle completion
        if (data.status === 'completed') {
          completedRef.current = true
          clearInterval(pollInterval)
          setSteps((prev) => prev.map((s) => ({ ...s, status: 'complete' as const })))
          setProgress(100)
          setTimeout(() => onComplete(jobId), 800)
        }

        // Handle failure
        if (data.status === 'failed') {
          completedRef.current = true
          clearInterval(pollInterval)
          setErrorMsg(data.message || 'Processing failed')
        }
      } catch (err) {
        // Silently retry on network errors
        console.error('Poll error:', err)
      }
    }, 1500)

    return () => clearInterval(pollInterval)
  }, [jobId, onComplete])

  // Fallback: if no jobId yet (still submitting), show initial spinner
  if (!jobId) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="glass rounded-2xl p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
          <p className="text-sm text-muted-foreground">Submitting...</p>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="glass rounded-2xl p-8">
        {/* Animated Orb */}
        <div className="relative flex justify-center mb-8">
          <motion.div
            className="relative h-20 w-20"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-glow" />
            <div className="absolute inset-2 rounded-full bg-primary/30" />
            <div className="absolute inset-4 rounded-full bg-primary/50" />
            <motion.div
              className="absolute inset-6 rounded-full bg-primary"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </motion.div>
        </div>

        {/* Video Title */}
        {title && (
          <p className="text-center text-sm font-medium text-foreground mb-6 truncate px-4">
            {title}
          </p>
        )}

        {/* Error */}
        {errorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {errorMsg}
          </div>
        )}

        {/* Progress Bar */}
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary mb-8">
          <motion.div
            className="h-full rounded-full"
            style={{
              background: 'linear-gradient(90deg, var(--lumina-blue), var(--lumina-cyan))',
            }}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Steps */}
        <div className="flex flex-col gap-3">
          {steps.map((step) => (
            <motion.div
              key={step.id}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all ${step.status === 'active'
                ? 'bg-primary/10'
                : step.status === 'complete'
                  ? 'bg-lumina-emerald/5'
                  : 'opacity-40'
                }`}
              animate={step.status === 'active' ? { x: [0, 2, 0] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${step.status === 'complete'
                  ? 'bg-lumina-emerald/20 text-lumina-emerald'
                  : step.status === 'active'
                    ? 'bg-primary/20 text-primary'
                    : 'bg-secondary text-muted-foreground'
                  }`}
              >
                {step.status === 'complete' ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={`text-sm ${step.status === 'active'
                  ? 'font-medium text-foreground'
                  : step.status === 'complete'
                    ? 'text-lumina-emerald'
                    : 'text-muted-foreground'
                  }`}
              >
                {step.label}
              </span>
              {step.status === 'active' && (
                <motion.div
                  className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
