import { useEffect, useRef, useCallback, useState } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control } from 'react-hook-form'
import type { PersistStorage } from '../types'

const defaultStorage: PersistStorage | undefined =
  typeof window !== 'undefined'
    ? {
        getItem: (key) => sessionStorage.getItem(key),
        setItem: (key, value) => sessionStorage.setItem(key, value),
        removeItem: (key) => sessionStorage.removeItem(key),
      }
    : undefined

/**
 * JSON drops `undefined`, but a cleared optional field *is* `undefined`; without
 * a marker, restoring would bring back its default. Encoded in drafts and
 * decoded on restore (drafts without markers restore as before).
 */
const UNDEFINED_KEY = '__uniformUndefined'

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  value !== null &&
  typeof value === 'object' &&
  Object.getPrototypeOf(value) === Object.prototype

const isUndefinedMarker = (value: unknown): boolean =>
  isPlainObject(value) &&
  value[UNDEFINED_KEY] === true &&
  Object.keys(value).length === 1

/** Serializes form values, keeping `undefined` values as markers. */
export function serializeDraft(values: unknown): string {
  return JSON.stringify(values, (_key, value: unknown) =>
    value === undefined ? { [UNDEFINED_KEY]: true } : value,
  )
}

/** Replaces markers with `undefined`, keeping the keys present. */
function revive(value: unknown): unknown {
  if (isUndefinedMarker(value)) return undefined
  if (Array.isArray(value)) return value.map(revive)
  if (isPlainObject(value)) {
    const result: Record<string, unknown> = {}
    for (const [key, item] of Object.entries(value)) result[key] = revive(item)
    return result
  }
  return value
}

/**
 * Deep-merges a parsed draft over the form defaults. Plain objects merge
 * recursively; everything else (including cleared `undefined` values) from the
 * draft replaces the default.
 */
export function mergeDraft(
  base: Record<string, unknown>,
  draft: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...base }
  for (const [key, value] of Object.entries(draft)) {
    const current = result[key]
    result[key] =
      isPlainObject(current) &&
      isPlainObject(value) &&
      !isUndefinedMarker(value)
        ? mergeDraft(current, value)
        : revive(value)
  }
  return result
}

/**
 * Persists form values to a storage adapter and restores them on mount.
 *
 * - On mount, reads `key` from `storage` and calls `reset` with the merged
 *   stored + default values, so the form starts with any previously saved data.
 * - On every value change, writes the current form values to `storage` after a
 *   `debounceMs` delay to avoid thrashing the storage layer.
 * - When `key` is `undefined`, persistence is entirely disabled.
 * - Falls back to `sessionStorage` when no custom `storage` adapter is provided.
 *
 * @returns `clearPersistedData` — call this after a successful submission to
 *   remove the persisted draft — and `restoreVersion`, which changes when a draft
 *   is restored (use it as a `key` to remount the rendered fields).
 */
export function useFormPersistence(options: {
  control: Control
  key: string | undefined
  debounceMs: number
  storage?: PersistStorage
  reset: (values: Record<string, unknown>) => void
  defaultValues: Record<string, unknown>
}): { clearPersistedData: () => void; restoreVersion: number } {
  const {
    control,
    key,
    debounceMs,
    storage: customStorage,
    reset,
    defaultValues,
  } = options
  const storage = customStorage ?? defaultStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredRef = useRef(false)
  // Bumped after a draft is restored. Controllers capture their fallback value
  // at mount, so a field restored to `undefined` (cleared) would keep showing
  // its old default; the form keys its fields on this to remount them.
  const [restoreVersion, setRestoreVersion] = useState(0)

  // Restore persisted values on mount
  useEffect(() => {
    if (!key || !storage || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = storage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        reset(mergeDraft(defaultValues, parsed))
        setRestoreVersion((v) => v + 1)
      }
    } catch {
      // Invalid data — ignore silently
    }
  }, [key, storage, reset, defaultValues])

  // Watch all values and persist on change
  const values = useWatch({ control })

  useEffect(() => {
    if (!key || !storage) return
    // Skip the initial render before restoration
    if (!restoredRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        storage.setItem(key, serializeDraft(values))
      } catch {
        // Storage full or unavailable — fail silently
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, storage, values, debounceMs])

  const clearPersistedData = useCallback(() => {
    if (!key || !storage) return
    try {
      storage.removeItem(key)
    } catch {
      // fail silently
    }
  }, [key, storage])

  return { clearPersistedData, restoreVersion }
}
