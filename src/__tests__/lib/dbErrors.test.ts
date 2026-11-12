import { describe, it, expect } from 'vitest'
import { isUniqueViolation, pgErrorCode } from '@/lib/db/errors'

describe('isUniqueViolation', () => {
  it('finds the code on a drizzle-wrapped error (err.cause.code)', () => {
    const wrapped = Object.assign(new Error('Failed query: insert into …'), { cause: Object.assign(new Error('duplicate key value'), { code: '23505' }) })
    expect(isUniqueViolation(wrapped)).toBe(true)
  })
  it('still works on an unwrapped driver error', () => {
    expect(isUniqueViolation({ code: '23505' })).toBe(true)
  })
  it('is false for other errors', () => {
    expect(isUniqueViolation(new Error('timeout'))).toBe(false)
    expect(isUniqueViolation({ cause: { code: '23503' } })).toBe(false)
    expect(pgErrorCode({ cause: { code: '23503' } })).toBe('23503')
    expect(isUniqueViolation(null)).toBe(false)
    expect(isUniqueViolation({ code: 'ECONNRESET' })).toBe(false)
  })
})
