'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Play, Clock, Library, Loader2, AlertCircle } from 'lucide-react'
import { getJobHistory } from '@/lib/api'
import { useCourseStore } from '@/lib/store'

export function SavedCourses() {
    const router = useRouter()
    const [jobs, setJobs] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const savedCourses = useCourseStore((state) => state.savedCourses)

    const fetchJobs = useCallback(async () => {
        try {
            const data = await getJobHistory()
            setJobs(data.jobs)
        } catch (err) {
            console.error('Failed to fetch jobs:', err)
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchJobs()

        // Auto-refresh the list every 5 seconds to catch ongoing jobs
        const interval = setInterval(fetchJobs, 5000)
        return () => clearInterval(interval)
    }, [fetchJobs])

    if (isLoading) return null
    if (jobs.length === 0) return null

    return (
        <div className="w-full mt-12 mb-24">
            <div className="flex items-center gap-2 mb-6">
                <Library className="w-5 h-5 text-lumina-cyan" />
                <h2 className="text-xl font-semibold text-foreground tracking-tight">Your Library</h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {jobs.map((job) => {
                    const isPending = job.status === 'pending' || job.status === 'downloading' || job.status === 'processing' || job.status === 'analyzing' || job.status === 'generating'
                    const isFailed = job.status === 'failed'
                    const isComplete = job.status === 'completed'

                    const title = job.videoTitle || 'Processing Video...'
                    const conceptCount = job.course?.concepts?.length || 0

                    return (
                        <motion.div
                            key={job.jobId || `job-${Math.random()}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ y: -2 }}
                            onClick={() => router.push(`/course/${job.jobId}`)}
                            className={`group relative flex flex-col gap-3 rounded-2xl border border-border/50 bg-secondary/30 p-5 transition-all cursor-pointer hover:bg-secondary/50 hover:border-border`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <h3 className="font-semibold text-foreground line-clamp-2">
                                    {title}
                                </h3>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground mt-auto">
                                <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5" />
                                    {new Date(job.createdAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                    })}
                                </div>

                                {isComplete && (() => {
                                    const saved = savedCourses[job.jobId]
                                    let avgMastery = 0
                                    if (saved && saved.masteryLevels && conceptCount > 0) {
                                        const values = Object.values(saved.masteryLevels)
                                        avgMastery = Math.round(
                                            values.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0) / conceptCount
                                        )
                                    }

                                    return (
                                        <>
                                            <div className="flex items-center gap-1.5 text-lumina-emerald">
                                                <span className="font-medium">{conceptCount}</span> concepts
                                            </div>
                                            <div className="flex items-center gap-1.5 text-lumina-blue">
                                                <span className="font-medium">{avgMastery}%</span> mastered
                                            </div>
                                        </>
                                    )
                                })()}

                                {isPending && (
                                    <div className="flex items-center gap-1.5 text-lumina-cyan">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>{job.progress}%</span>
                                    </div>
                                )}

                                {isFailed && (
                                    <div className="flex items-center gap-1.5 text-red-400">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span>Failed</span>
                                    </div>
                                )}
                            </div>

                            <div className="absolute bottom-4 right-4 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/40 hover:scale-110">
                                <Play className="w-4 h-4 ml-0.5" />
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </div>
    )
}
