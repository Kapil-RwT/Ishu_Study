import { describe, it, expect } from 'vitest'
import { cn } from '../lib/utils'

describe('Utility Functions - cn', () => {
    it('merges tailwind classes correctly', () => {
        const result = cn('bg-red-500', 'text-white', 'p-4')
        expect(result).toBe('bg-red-500 text-white p-4')
    })

    it('handles conditional classes properly', () => {
        const isActive = true
        const result = cn('btn', isActive && 'btn-active')
        expect(result).toBe('btn btn-active')
    })

    it('resolves tailwind conflicts', () => {
        const result = cn('px-2 py-1', 'p-4')
        expect(result).toBe('p-4')
    })
})
