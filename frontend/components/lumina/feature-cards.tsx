'use client'

import { motion } from 'framer-motion'
import { TreePine, Layers, Puzzle } from 'lucide-react'

const features = [
  {
    icon: <TreePine className="h-5 w-5" />,
    title: '3D Skill Tree',
    description: 'Navigate concepts in 3D space',
  },
  {
    icon: <Layers className="h-5 w-5" />,
    title: 'Smart Flashcards',
    description: 'Swipeable card stacks',
  },
  {
    icon: <Puzzle className="h-5 w-5" />,
    title: 'Adaptive Quiz',
    description: 'Test your understanding',
  },
]

export function FeatureCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 + i * 0.1 }}
          whileHover={{ scale: 1.03, y: -2 }}
          className="glass flex flex-col items-center gap-2 rounded-xl px-4 py-5 text-center transition-all"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {feature.icon}
          </div>
          <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
          <p className="text-xs text-muted-foreground">{feature.description}</p>
        </motion.div>
      ))}
    </div>
  )
}
