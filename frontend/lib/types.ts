// ── View Modes ──────────────────────────────────────────────────────────────

export type ViewMode = 'tree' | 'flashcards' | 'quiz'

// ── Content Types ───────────────────────────────────────────────────────────

export interface Concept {
  id: string
  title: string
  description: string
  depth: number
  parentId: string | null
  keyPoints: string[]
  timestamps: string[]
  flashcardCount: number
  quizCount: number
}

export interface Flashcard {
  id: string
  conceptId: string
  front: string
  back: string
  difficulty: number
  category: 'definition' | 'example' | 'comparison' | 'application' | 'mnemonic'
}

export interface QuizQuestion {
  id: string
  conceptId: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Expert'
  hint?: string
}

// ── Course Module ───────────────────────────────────────────────────────────

export interface CourseModule {
  id: string
  title: string
  videoTitle: string
  videoUrl?: string | null
  concepts: Concept[]
  flashcards: Flashcard[]
  quizQuestions: QuizQuestion[]
  learningObjectives: string[]
}

// ── API Response Types ──────────────────────────────────────────────────────

export interface ProcessingResponse {
  jobId: string
  status: string
  message: string
  progress: number
}

export interface ProgressResponse {
  jobId: string
  status: string
  progress: number
  message: string
  videoTitle?: string
  currentStep: string
  stepsCompleted: number
  totalSteps: number
}

export interface CourseStatusResponse {
  jobId: string
  status: string
  course?: CourseModule
  error?: string
}

export interface JobHistoryResponse {
  jobs: {
    jobId: string
    status: string
    progress: number
    videoTitle?: string
    createdAt?: string
    course?: CourseModule
  }[]
}

// ── Saved Course (localStorage) ─────────────────────────────────────────────

export interface SavedCourse {
  course: CourseModule
  masteryLevels: Record<string, number>
  completedFlashcards: Record<string, boolean>
  quizAnswers: Record<string, number>
  quizSubmitted: boolean
  savedAt: string
}
