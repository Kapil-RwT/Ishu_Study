import { create } from 'zustand'
import type { CourseModule, ViewMode, SavedCourse } from '@/lib/types'

// ── localStorage Helpers ────────────────────────────────────────────────────

const STORAGE_KEY = 'lumina-saved-courses'

function loadSavedCourses(): Record<string, SavedCourse> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function persistSavedCourses(courses: Record<string, SavedCourse>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses))
  } catch {
    // localStorage might be full or unavailable
  }
}

// ── Store Interface ─────────────────────────────────────────────────────────

interface CourseStore {
  // Current course state
  course: CourseModule | null
  viewMode: ViewMode
  selectedConceptId: string | null
  masteryLevels: Record<string, number>
  completedFlashcards: Record<string, boolean>
  quizAnswers: Record<string, number>
  quizSubmitted: boolean

  // Saved courses library
  savedCourses: Record<string, SavedCourse>

  // Actions
  setCourse: (course: CourseModule) => void
  setViewMode: (mode: ViewMode) => void
  selectConcept: (id: string | null) => void
  updateMastery: (conceptId: string, increment: number) => void
  markFlashcardComplete: (cardId: string) => void
  resetFlashcards: () => void
  setQuizAnswer: (questionId: string, answerIndex: number) => void
  submitQuiz: () => void
  resetQuiz: () => void
  saveCurrentCourse: () => void
  loadSavedCourse: (courseId: string) => void
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useCourseStore = create<CourseStore>((set, get) => ({
  // Initial state
  course: null,
  viewMode: 'tree',
  selectedConceptId: null,
  masteryLevels: {},
  completedFlashcards: {},
  quizAnswers: {},
  quizSubmitted: false,
  savedCourses: loadSavedCourses(),

  // ── Set Course ──────────────────────────────────────────────────────────
  setCourse: (course) => {
    const saved = get().savedCourses[course.id]
    set({
      course,
      selectedConceptId: null,
      viewMode: 'tree',
      masteryLevels: saved?.masteryLevels ?? {},
      completedFlashcards: saved?.completedFlashcards ?? {},
      quizAnswers: saved?.quizAnswers ?? {},
      quizSubmitted: saved?.quizSubmitted ?? false,
    })
  },

  // ── View Mode ───────────────────────────────────────────────────────────
  setViewMode: (mode) => set({ viewMode: mode }),

  // ── Concept Selection ───────────────────────────────────────────────────
  selectConcept: (id) => set({ selectedConceptId: id }),

  // ── Mastery ─────────────────────────────────────────────────────────────
  updateMastery: (conceptId, increment) => {
    set((state) => {
      const current = state.masteryLevels[conceptId] || 0
      const newLevel = Math.min(100, current + increment)
      const newMastery = { ...state.masteryLevels, [conceptId]: newLevel }
      return { masteryLevels: newMastery }
    })
    // Auto-save after mastery update
    setTimeout(() => get().saveCurrentCourse(), 0)
  },

  // ── Flashcards ──────────────────────────────────────────────────────────
  markFlashcardComplete: (cardId) => {
    set((state) => {
      const newCompleted = { ...state.completedFlashcards, [cardId]: true }

      // Update mastery for the concept this card belongs to
      const card = state.course?.flashcards.find((f) => f.id === cardId)
      if (card && state.course) {
        const conceptCards = state.course.flashcards.filter(
          (f) => f.conceptId === card.conceptId
        )
        const completedCount = conceptCards.filter(
          (f) => newCompleted[f.id]
        ).length
        const masteryFromCards = Math.round(
          (completedCount / conceptCards.length) * 50
        ) // Cards contribute up to 50% mastery
        const currentMastery = state.masteryLevels[card.conceptId] || 0
        const newMastery = Math.max(currentMastery, masteryFromCards)

        return {
          completedFlashcards: newCompleted,
          masteryLevels: {
            ...state.masteryLevels,
            [card.conceptId]: newMastery,
          },
        }
      }

      return { completedFlashcards: newCompleted }
    })
    setTimeout(() => get().saveCurrentCourse(), 0)
  },

  resetFlashcards: () => {
    set({ completedFlashcards: {} })
    setTimeout(() => get().saveCurrentCourse(), 0)
  },

  // ── Quiz ────────────────────────────────────────────────────────────────
  setQuizAnswer: (questionId, answerIndex) => {
    set((state) => ({
      quizAnswers: { ...state.quizAnswers, [questionId]: answerIndex },
    }))
  },

  submitQuiz: () => {
    set((state) => {
      if (!state.course) return { quizSubmitted: true }

      // Calculate mastery from quiz results
      const conceptScores: Record<string, { correct: number; total: number }> = {}
      state.course.quizQuestions.forEach((q) => {
        if (!conceptScores[q.conceptId]) {
          conceptScores[q.conceptId] = { correct: 0, total: 0 }
        }
        conceptScores[q.conceptId].total++
        if (state.quizAnswers[q.id] === q.correctAnswer) {
          conceptScores[q.conceptId].correct++
        }
      })

      const newMastery = { ...state.masteryLevels }
      Object.entries(conceptScores).forEach(([conceptId, scores]) => {
        const quizMastery = Math.round((scores.correct / scores.total) * 50) + 50 // Quiz contributes 50-100%
        newMastery[conceptId] = Math.max(
          newMastery[conceptId] || 0,
          quizMastery
        )
      })

      return { quizSubmitted: true, masteryLevels: newMastery }
    })
    setTimeout(() => get().saveCurrentCourse(), 0)
  },

  resetQuiz: () => {
    set({ quizAnswers: {}, quizSubmitted: false })
    setTimeout(() => get().saveCurrentCourse(), 0)
  },

  // ── Persistence ─────────────────────────────────────────────────────────
  saveCurrentCourse: () => {
    const state = get()
    if (!state.course) return

    const saved: SavedCourse = {
      course: state.course,
      masteryLevels: state.masteryLevels,
      completedFlashcards: state.completedFlashcards,
      quizAnswers: state.quizAnswers,
      quizSubmitted: state.quizSubmitted,
      savedAt: new Date().toISOString(),
    }

    const allSaved = { ...state.savedCourses, [state.course.id]: saved }
    set({ savedCourses: allSaved })
    persistSavedCourses(allSaved)
  },

  loadSavedCourse: (courseId) => {
    const saved = get().savedCourses[courseId]
    if (!saved) return

    set({
      course: saved.course,
      masteryLevels: saved.masteryLevels,
      completedFlashcards: saved.completedFlashcards,
      quizAnswers: saved.quizAnswers,
      quizSubmitted: saved.quizSubmitted,
      viewMode: 'tree',
      selectedConceptId: null,
    })
  },
}))
