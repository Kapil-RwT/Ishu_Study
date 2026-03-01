'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { AnimatePresence } from 'framer-motion'
import { useCourseStore } from '@/lib/store'
import { ConceptPanel } from '@/components/lumina/concept-panel'

const SkillTreeScene = dynamic(
  () => import('./skill-tree-scene').then((m) => ({ default: m.SkillTreeScene })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  }
)

export function SkillTreeTab() {
  const selectedConceptId = useCourseStore((s) => s.selectedConceptId)

  return (
    <div className="relative" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
      <Suspense
        fallback={
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <SkillTreeScene />
      </Suspense>

      <AnimatePresence>
        {selectedConceptId && <ConceptPanel />}
      </AnimatePresence>

      {/* Instructions Overlay */}
      <div className="pointer-events-none absolute bottom-4 left-4 flex items-center gap-2 rounded-lg bg-background/60 px-3 py-2 backdrop-blur-sm">
        <span className="text-[10px] text-muted-foreground">
          Click nodes to explore  |  Drag to rotate  |  Scroll to zoom
        </span>
      </div>
    </div>
  )
}
