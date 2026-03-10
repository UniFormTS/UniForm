import { describe, it, expect } from 'vitest'
import { deriveLabel } from './deriveLabel'

describe('deriveLabel', () => {
  // ---------------------------------------------------------------------------
  // camelCase splitting
  // ---------------------------------------------------------------------------

  it('converts camelCase to title case', () => {
    expect(deriveLabel('firstName')).toBe('First Name')
  })

  it('converts multi-word camelCase', () => {
    expect(deriveLabel('phoneNumber')).toBe('Phone Number')
  })

  it('handles consecutive boundary transitions (camelCase chain)', () => {
    expect(deriveLabel('billingAddress')).toBe('Billing Address')
  })

  // ---------------------------------------------------------------------------
  // snake_case / hyphen-case
  // ---------------------------------------------------------------------------

  it('converts snake_case to title case', () => {
    expect(deriveLabel('first_name')).toBe('First Name')
  })

  it('converts hyphen-case to title case', () => {
    expect(deriveLabel('first-name')).toBe('First Name')
  })

  it('handles multiple consecutive underscores', () => {
    expect(deriveLabel('some__field')).toBe('Some Field')
  })

  // ---------------------------------------------------------------------------
  // Single word
  // ---------------------------------------------------------------------------

  it('title-cases a single lowercase word', () => {
    expect(deriveLabel('name')).toBe('Name')
  })

  it('title-cases a single UPPERCASE word', () => {
    expect(deriveLabel('NAME')).toBe('Name')
  })

  // ---------------------------------------------------------------------------
  // Dot-notated paths — only the last segment should be used
  // ---------------------------------------------------------------------------

  it('uses only the last segment of a dot-notated path', () => {
    expect(deriveLabel('address.streetName')).toBe('Street Name')
  })

  it('handles deeply nested dot-notated path', () => {
    expect(deriveLabel('user.profile.bio')).toBe('Bio')
  })

  it('handles a single-segment path (no dot)', () => {
    expect(deriveLabel('zipCode')).toBe('Zip Code')
  })

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  it('returns an empty string for an empty input', () => {
    expect(deriveLabel('')).toBe('')
  })

  it('handles a name that is already title-cased', () => {
    expect(deriveLabel('Email')).toBe('Email')
  })

  it('normalises all-caps segment to title case', () => {
    expect(deriveLabel('address.ZIP')).toBe('Zip')
  })
})
