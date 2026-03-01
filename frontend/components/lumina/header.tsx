'use client'

import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function LuminaHeader() {
  return (
    <header className="fixed top-0 z-50 flex w-full items-center px-6 py-4">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="absolute inset-0 rounded-lg bg-primary/10 animate-pulse-glow" />
        </div>
        <span
          className="text-lg font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, var(--lumina-blue), var(--lumina-cyan))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Lumina
        </span>
      </Link>
    </header>
  )
}
