'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { TreePine, Layers, Puzzle } from 'lucide-react'
import { useCourseStore } from '@/lib/store'
import { getCourseStatus } from '@/lib/api'
import { DashboardHeader } from '@/components/lumina/dashboard-header'
import { SkillTreeTab } from '@/components/lumina/skill-tree-tab'
import { FlashcardsTab } from '@/components/lumina/flashcards-tab'
import { QuizTab } from '@/components/lumina/quiz-tab'
import type { ViewMode, CourseModule } from '@/lib/types'

const tabs: { id: ViewMode; label: string; icon: React.ReactNode }[] = [
  { id: 'tree', label: 'Skill Tree', icon: <TreePine className="h-4 w-4" /> },
  { id: 'flashcards', label: 'Flashcards', icon: <Layers className="h-4 w-4" /> },
  { id: 'quiz', label: 'Quiz', icon: <Puzzle className="h-4 w-4" /> },
]

export default function CoursePage() {
  const params = useParams()
  const jobId = params.id as string
  const { setCourse, viewMode, setViewMode, course, saveCurrentCourse } = useCourseStore()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCourse() {
      try {
        const data = await getCourseStatus(jobId)
        if (data.course) {
          // Override the internal course ID with the backend job ID 
          // so that localStorage and the API jobs list use the exact same key limit.
          data.course.id = jobId
          setCourse(data.course)
          // Wait for state to update, then save to library
          setTimeout(() => {
            saveCurrentCourse()
          }, 0)
        } else if (data.error) {
          setError(data.error)
        } else {
          setError('Course not found or still processing.')
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load course')
      } finally {
        setLoading(false)
      }
    }

    fetchCourse()
  }, [jobId, setCourse, saveCurrentCourse])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading course...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-8 py-6 text-center">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />

      {/* Tab Navigation */}
      <div className="border-b border-border/30 bg-background/50">
        <div className="flex items-center gap-1 px-4 sm:px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setViewMode(tab.id)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${viewMode === tab.id
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground/70'
                }`}
            >
              <span
                className={
                  viewMode === tab.id ? 'text-primary' : 'text-muted-foreground'
                }
              >
                {tab.icon}
              </span>
              <span className="hidden sm:inline">{tab.label}</span>
              {viewMode === tab.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-x-0 bottom-0 h-0.5 rounded-full"
                  style={{
                    background:
                      'linear-gradient(90deg, var(--lumina-blue), var(--lumina-cyan))',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {viewMode === 'tree' && (
            <motion.div
              key="tree"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <SkillTreeTab />
            </motion.div>
          )}
          {viewMode === 'flashcards' && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <FlashcardsTab />
            </motion.div>
          )}
          {viewMode === 'quiz' && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <QuizTab />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
