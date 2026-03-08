import type {
  ProcessingResponse,
  ProgressResponse,
  CourseStatusResponse,
  JobHistoryResponse,
} from '@/lib/types'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'

// ── Helpers ─────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.message || `Request failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── YouTube Processing ──────────────────────────────────────────────────────

export async function submitYouTubeUrl(url: string): Promise<ProcessingResponse> {
  const res = await fetch(`${API_BASE}/process/youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  return handleResponse<ProcessingResponse>(res)
}

// ── File Upload ─────────────────────────────────────────────────────────────

export async function uploadVideoFile(file: File): Promise<ProcessingResponse> {
  const formData = new FormData()
  formData.append('file', file)

  const res = await fetch(`${API_BASE}/process/upload`, {
    method: 'POST',
    body: formData,
  })
  return handleResponse<ProcessingResponse>(res)
}

// ── Progress Polling ────────────────────────────────────────────────────────

export async function getProgress(jobId: string): Promise<ProgressResponse> {
  const res = await fetch(`${API_BASE}/progress/${jobId}`)
  return handleResponse<ProgressResponse>(res)
}

// ── Course Status ───────────────────────────────────────────────────────────

export async function getCourseStatus(jobId: string): Promise<CourseStatusResponse> {
  const res = await fetch(`${API_BASE}/status/${jobId}`)
  return handleResponse<CourseStatusResponse>(res)
}

// ── Job History ─────────────────────────────────────────────────────────────

export async function getJobHistory(): Promise<JobHistoryResponse> {
  const res = await fetch(`${API_BASE}/jobs`)
  return handleResponse<JobHistoryResponse>(res)
}

// ── Flashcards ──────────────────────────────────────────────────────────────

export async function getFlashcards(jobId: string, conceptId?: string) {
  const params = conceptId ? `?conceptId=${conceptId}` : ''
  const res = await fetch(`${API_BASE}/course/${jobId}/flashcards${params}`)
  return handleResponse(res)
}

// ── Quiz ────────────────────────────────────────────────────────────────────

export async function getQuiz(jobId: string, conceptId?: string, difficulty?: string) {
  const params = new URLSearchParams()
  if (conceptId) params.set('conceptId', conceptId)
  if (difficulty) params.set('difficulty', difficulty)
  const qs = params.toString() ? `?${params.toString()}` : ''
  const res = await fetch(`${API_BASE}/course/${jobId}/quiz${qs}`)
  return handleResponse(res)
}
