'use client'

import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Stars, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { Concept } from '@/lib/types'
import { useCourseStore } from '@/lib/store'

function getMasteryColor(mastery: number): string {
  if (mastery >= 100) return '#34d399' // green
  if (mastery > 0) return '#e5a93a'    // yellow
  return '#475569'                     // grey (unstarted)
}

function getNodePosition(
  concept: Concept,
  index: number,
  siblings: number
): [number, number, number] {
  // Add more vertical spacing and distinct layers
  const yMap: Record<number, number> = { 0: 6, 1: 2, 2: -2, 3: -6 }
  const y = yMap[concept.depth] ?? 0

  if (concept.depth === 0) return [0, y, 0]

  // Larger radius for deeper levels to fit more nodes spreading out
  const radiusMap: Record<number, number> = { 1: 5.5, 2: 7.5, 3: 9 }
  const radius = radiusMap[concept.depth] ?? 6

  // Use golden ratio angle distribution or offset to prevent overlapping paths
  // By adding (concept.depth * Math.PI/4), we stagger the sub-nodes visually
  const offset = (concept.depth * Math.PI) / 4
  const angle = (index / Math.max(siblings, 1)) * Math.PI * 2 - Math.PI / 2 + offset

  const x = Math.cos(angle) * (radius + (index % 2 === 0 ? 0.5 : -0.5)) // slight jiggle
  const z = Math.sin(angle) * (radius + (index % 2 === 0 ? -0.5 : 0.5))

  return [x, y, z]
}

function ConceptNode({
  concept,
  position,
  mastery,
  isSelected,
  onSelect,
}: {
  concept: Concept
  position: [number, number, number]
  mastery: number
  isSelected: boolean
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const color = getMasteryColor(mastery)

  // Physical size mapping for SVGs
  const sizeMap: Record<number, number> = {
    0: 72,
    1: 56,
    2: 44,
    3: 36,
  }
  const size = sizeMap[concept.depth] ?? 36

  return (
    <group position={position}>
      <Html
        center
        distanceFactor={15}
        zIndexRange={[100, 0]}
      >
        <div
          className="relative flex items-center justify-center cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation()
            onSelect()
          }}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          role="button"
          tabIndex={0}
          aria-label={`${concept.title}, Mastery level: ${mastery}%`}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onSelect()
            }
          }}
        >
          {/* Node SVG container with Glow */}
          <div className="relative flex items-center justify-center">
            {/* Outer blur/glow effect */}
            <div
              className="absolute inset-0 rounded-full blur-xl transition-opacity duration-500"
              style={{
                backgroundColor: color,
                opacity: hovered || isSelected ? 0.6 : 0.2,
                transform: hovered || isSelected ? 'scale(1.2)' : 'scale(1)',
              }}
            />

            {/* SVG Definition based on depth */}
            <svg
              width={size}
              height={size}
              viewBox="0 0 100 100"
              className="relative z-10 drop-shadow-lg transition-transform duration-300 overflow-visible"
              style={{ filter: `drop-shadow(0 0 8px ${color})` }}
            >
              <defs>
                <radialGradient id={`glow-${concept.id}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={color} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={color} stopOpacity="0.1" />
                </radialGradient>
              </defs>

              {/* Node Geometry Shapes - Snug to 100x100 viewBox */}
              {concept.depth === 0 ? (
                // Core concept: Hexagon (Large)
                <polygon
                  points="50,2 96,25 96,75 50,98 4,75 4,25"
                  fill={`url(#glow-${concept.id})`}
                  stroke={color}
                  strokeWidth={hovered || isSelected ? "4" : "2"}
                />
              ) : concept.depth === 1 ? (
                // Secondary: Diamond
                <polygon
                  points="50,2 98,50 50,98 2,50"
                  fill={`url(#glow-${concept.id})`}
                  stroke={color}
                  strokeWidth={hovered || isSelected ? "4" : "2"}
                />
              ) : concept.depth === 2 ? (
                // Tertiary: Triangle
                <polygon
                  points="50,5 98,90 2,90"
                  fill={`url(#glow-${concept.id})`}
                  stroke={color}
                  strokeWidth={hovered || isSelected ? "4" : "2"}
                  strokeLinejoin="round"
                />
              ) : (
                // Leaves: Circle
                <circle
                  cx="50"
                  cy="50"
                  r="48"
                  fill={`url(#glow-${concept.id})`}
                  stroke={color}
                  strokeWidth={hovered || isSelected ? "4" : "2"}
                />
              )}

              {/* Inner active core based on mastery */}
              <circle
                cx="50"
                cy="50"
                r={mastery > 0 ? (mastery / 100) * 18 + 6 : 6}
                fill={color}
                className="transition-all duration-700"
              />

              {/* Spinning selection border */}
              {isSelected && (
                <circle
                  cx="50"
                  cy="50"
                  r="52"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeDasharray="10 10"
                  className="origin-center"
                  style={{ animation: 'spin 10s linear infinite' }}
                />
              )}
            </svg>
          </div>

          {/* Accessible Text Label UI */}
          <div
            className={`absolute top-[90%] left-1/2 -translate-x-1/2 flex flex-col items-center px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 shadow-xl transition-all duration-300 ${hovered || isSelected
              ? 'bg-[#0f172a]/90 opacity-100 scale-100 translate-y-0'
              : 'bg-[#0f172a]/50 opacity-80 scale-95 translate-y-1'
              }`}
            style={{ width: 'max-content', maxWidth: '240px' }}
          >
            <span
              className={`text-sm tracking-wide text-center leading-snug transition-colors duration-300 ${hovered || isSelected ? 'text-white font-semibold' : 'text-slate-300 font-medium'
                }`}
            >
              {concept.title}
            </span>
            <div
              className={`grid transition-all duration-300 ease-in-out ${hovered || isSelected ? 'grid-rows-[1fr] opacity-100 mt-1.5' : 'grid-rows-[0fr] opacity-0 mt-0'
                }`}
            >
              <div className="overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
                  {mastery}% Mastered
                </span>
                <div className="h-1 mt-1 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${mastery}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Html>
    </group>
  )
}

function ConnectionLine({
  start,
  end,
  mastery,
}: {
  start: [number, number, number]
  end: [number, number, number]
  mastery: number
}) {
  const color = getMasteryColor(mastery)
  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={1.5}
      transparent
      opacity={mastery > 0 ? 0.8 : 0.4}
    />
  )
}

function SceneContent() {
  const { course, masteryLevels, selectedConceptId, selectConcept } =
    useCourseStore()

  const nodePositions = useMemo(() => {
    if (!course) return {}
    const positions: Record<string, [number, number, number]> = {}
    const depthGroups: Record<number, Concept[]> = {}

    course.concepts.forEach((c) => {
      if (!depthGroups[c.depth]) depthGroups[c.depth] = []
      depthGroups[c.depth].push(c)
    })

    Object.entries(depthGroups).forEach(([, concepts]) => {
      concepts.forEach((c, i) => {
        positions[c.id] = getNodePosition(c, i, concepts.length)
      })
    })

    return positions
  }, [course])

  if (!course) return null

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      <pointLight position={[-10, -10, 5]} intensity={0.3} color="#60a5fa" />

      <Stars
        radius={50}
        depth={50}
        count={1000}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      <fog attach="fog" args={['#0c0f1a', 15, 30]} />

      {course.concepts
        .filter((c) => c.parentId)
        .map((c) => {
          const parentPos = nodePositions[c.parentId!]
          const childPos = nodePositions[c.id]
          if (!parentPos || !childPos) return null
          return (
            <ConnectionLine
              key={`line-${c.id}`}
              start={parentPos}
              end={childPos}
              mastery={masteryLevels[c.id] || 0}
            />
          )
        })}

      {course.concepts.map((concept) => (
        <ConceptNode
          key={concept.id}
          concept={concept}
          position={nodePositions[concept.id] || [0, 0, 0]}
          mastery={masteryLevels[concept.id] || 0}
          isSelected={selectedConceptId === concept.id}
          onSelect={() =>
            selectConcept(
              selectedConceptId === concept.id ? null : concept.id
            )
          }
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={5}
        maxDistance={40}
        autoRotate={!selectedConceptId}
        autoRotateSpeed={0.3}
      />
    </>
  )
}

export function SkillTreeScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 20], fov: 50 }}
      style={{ background: 'transparent' }}
      gl={{ antialias: true }}
    >
      <SceneContent />
    </Canvas>
  )
}
