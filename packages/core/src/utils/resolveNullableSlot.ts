import type * as React from 'react'

/**
 * Resolves an overridable slot where `null` explicitly omits rendering.
 * `undefined` falls back to the provided default.
 */
export function resolveNullableSlot<T>(
  slot: React.ComponentType<T> | null | undefined,
  fallback: React.ComponentType<T> | null,
): React.ComponentType<T> | null {
  if (slot === null) return null
  return slot ?? fallback
}
