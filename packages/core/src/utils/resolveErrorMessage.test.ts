import { describe, it, expect } from 'vitest'
import { resolveErrorMessage } from './resolveErrorMessage'

describe('resolveErrorMessage', () => {
  // ---------------------------------------------------------------------------
  // No error
  // ---------------------------------------------------------------------------

  it('returns undefined when error is undefined', () => {
    expect(resolveErrorMessage('email', undefined)).toBeUndefined()
  })

  it('returns undefined when error is undefined and messages are provided', () => {
    expect(
      resolveErrorMessage('email', undefined, { required: 'Required field' }),
    ).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // No messages — fall back to Zod/RHF original message
  // ---------------------------------------------------------------------------

  it('returns the original message when no messages object is provided', () => {
    expect(
      resolveErrorMessage('name', {
        message: 'Name is required',
        type: 'too_small',
      }),
    ).toBe('Name is required')
  })

  it('returns undefined original message when error has no message and no messages provided', () => {
    expect(resolveErrorMessage('name', { type: 'too_small' })).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // Priority 1: per-field string override
  // ---------------------------------------------------------------------------

  it('returns a per-field string override regardless of error type', () => {
    expect(
      resolveErrorMessage(
        'email',
        { message: 'Invalid email', type: 'invalid_string' },
        { email: 'Please provide a valid email address' },
      ),
    ).toBe('Please provide a valid email address')
  })

  it('per-field string override wins over global required', () => {
    expect(
      resolveErrorMessage(
        'name',
        { message: 'Required', type: 'too_small' },
        { name: 'Name cannot be empty', required: 'This field is required' },
      ),
    ).toBe('Name cannot be empty')
  })

  it('per-field string override wins even when error type matches nothing special', () => {
    expect(
      resolveErrorMessage(
        'age',
        { message: 'Must be a number', type: 'invalid_type' },
        { age: 'Age must be a valid number' },
      ),
    ).toBe('Age must be a valid number')
  })

  // ---------------------------------------------------------------------------
  // Priority 2: per-field per-code override
  // ---------------------------------------------------------------------------

  it('returns a per-field per-code override when the type matches', () => {
    expect(
      resolveErrorMessage(
        'username',
        { message: 'Too short', type: 'too_small' },
        { username: { too_small: 'Username is too short' } },
      ),
    ).toBe('Username is too short')
  })

  it('falls through to global required when code does not match the per-field codes', () => {
    expect(
      resolveErrorMessage(
        'username',
        { message: 'Required', type: 'too_small' },
        { username: { invalid_string: 'Bad format' }, required: 'Required!' },
      ),
    ).toBe('Required!')
  })

  it('falls through to original message when code does not match any per-field code and no global required', () => {
    expect(
      resolveErrorMessage(
        'username',
        { message: 'Too short', type: 'too_small' },
        { username: { invalid_string: 'Bad format' } },
      ),
    ).toBe('Too short')
  })

  // ---------------------------------------------------------------------------
  // Priority 3: global required override
  // ---------------------------------------------------------------------------

  it('applies global required override for too_small errors', () => {
    expect(
      resolveErrorMessage(
        'name',
        {
          message: 'String must contain at least 1 character(s)',
          type: 'too_small',
        },
        { required: 'This field is required' },
      ),
    ).toBe('This field is required')
  })

  it('applies global required override for invalid_type errors', () => {
    expect(
      resolveErrorMessage(
        'age',
        {
          message: 'Expected number, received undefined',
          type: 'invalid_type',
        },
        { required: 'This field is required' },
      ),
    ).toBe('This field is required')
  })

  it('does NOT apply global required override for non-required error types', () => {
    expect(
      resolveErrorMessage(
        'email',
        { message: 'Invalid email format', type: 'invalid_string' },
        { required: 'This field is required' },
      ),
    ).toBe('Invalid email format')
  })

  // ---------------------------------------------------------------------------
  // Priority 4: fallback to Zod/RHF original message
  // ---------------------------------------------------------------------------

  it('falls back to the original Zod message when no override matches', () => {
    expect(
      resolveErrorMessage(
        'email',
        { message: 'Invalid email', type: 'invalid_string' },
        { required: 'Required' },
      ),
    ).toBe('Invalid email')
  })

  it('falls back to undefined original message when error has no message and nothing matches', () => {
    expect(
      resolveErrorMessage(
        'score',
        { type: 'invalid_string' },
        { required: 'Required' },
      ),
    ).toBeUndefined()
  })

  // ---------------------------------------------------------------------------
  // Dot-notated field names
  // ---------------------------------------------------------------------------

  it('matches a per-field override by dot-notated field name', () => {
    expect(
      resolveErrorMessage(
        'address.street',
        { message: 'Required', type: 'too_small' },
        { 'address.street': 'Street cannot be empty' },
      ),
    ).toBe('Street cannot be empty')
  })
})
