'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { LuminaHeader } from '@/components/lumina/header'
import { VanishInput } from '@/components/lumina/vanish-input'
import { UploadDropzone } from '@/components/lumina/upload-dropzone'
import { ProcessingState } from '@/components/lumina/processing-state'
import { FeatureCards } from '@/components/lumina/feature-cards'
import { AnimatedGrid } from '@/components/lumina/animated-grid'
import { SavedCourses } from '@/components/lumina/saved-courses'
import { submitYouTubeUrl, uploadVideoFile } from '@/lib/api'

export default function LandingPage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [videoTitle, setVideoTitle] = useState<string | undefined>()
  const [jobId, setJobId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const urlRef = useRef<string>('')
  const fileRef = useRef<File | null>(null)

  const handleUrlSubmit = useCallback(async (url: string) => {
    urlRef.current = url
    setError(null)
    setVideoTitle(url)
    setIsProcessing(true)

    try {
      const res = await submitYouTubeUrl(url)
      setJobId(res.jobId)
    } catch (err: any) {
      setError(err.message || 'Failed to submit URL')
      setIsProcessing(false)
    }
  }, [])

  const handleFileSelect = useCallback(async (file?: File) => {
    if (!file) return
    fileRef.current = file
    setError(null)
    setVideoTitle(file.name)
    setIsProcessing(true)

    try {
      const res = await uploadVideoFile(file)
      setJobId(res.jobId)
    } catch (err: any) {
      setError(err.message || 'Failed to upload file')
      setIsProcessing(false)
    }
  }, [])

  const handleProcessingComplete = useCallback((completedJobId: string) => {
    router.push(`/course/${completedJobId}`)
  }, [router])

  const handleGenerate = useCallback(async () => {
    if (urlRef.current) {
      await handleUrlSubmit(urlRef.current)
    }
  }, [handleUrlSubmit])

  return (
    <div className="relative flex min-h-screen flex-col items-center">
      <AnimatedGrid />
      <LuminaHeader />

      <main className="relative z-10 flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-6 py-24">
        <AnimatePresence mode="wait">
          {!isProcessing ? (
            <motion.div
              key="input"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex w-full flex-col items-center gap-8"
            >
              {/* Hero Icon */}
              <motion.div
                className="animate-float"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div className="relative flex h-16 w-16 items-center justify-center">
                  <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-pulse-glow" />
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
              </motion.div>

              {/* Headline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-center"
              >
                <h1
                  className="text-4xl font-bold tracking-tight sm:text-5xl text-balance"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan), var(--lumina-blue))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  Learn Smarter, Not Harder
                </h1>
                <p className="mt-4 text-base text-muted-foreground text-pretty leading-relaxed">
                  Drop a lecture video and watch AI transform it into an interactive,
                  gamified study module in minutes.
                </p>
              </motion.div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400"
                >
                  {error}
                </motion.div>
              )}

              {/* Input Section */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex w-full flex-col gap-4"
              >
                <VanishInput
                  placeholders={[
                    'Paste a YouTube lecture URL...',
                    'https://youtube.com/watch?v=...',
                    'Drop any educational video link...',
                  ]}
                  onSubmit={handleUrlSubmit}
                />

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border/50" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <UploadDropzone onFileSelect={handleFileSelect} />

                {/* Generate Button */}
                <motion.button
                  onClick={handleGenerate}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl font-semibold text-primary-foreground transition-all"
                  style={{
                    background:
                      'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
                  }}
                >
                  Generate Course
                  <Sparkles className="h-4 w-4" />
                </motion.button>
              </motion.div>

              {/* Feature Cards */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="w-full"
              >
                <FeatureCards />
                <SavedCourses />
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="w-full"
            >
              <ProcessingState
                videoTitle={videoTitle}
                jobId={jobId}
                onComplete={handleProcessingComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
