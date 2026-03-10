import { useEffect, useRef, useCallback } from 'react'
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
 * Persists form values to a storage adapter and restores them on mount.
 *
 * - On mount, reads `key` from `storage` and calls `reset` with the merged
 *   stored + default values, so the form starts with any previously saved data.
 * - On every value change, writes the current form values to `storage` after a
 *   `debounceMs` delay to avoid thrashing the storage layer.
 * - When `key` is `undefined`, persistence is entirely disabled.
 * - Falls back to `sessionStorage` when no custom `storage` adapter is provided.
 *
 * @returns An object with `clearPersistedData` — call this after a successful
 *   submission to remove the persisted draft.
 */
export function useFormPersistence(options: {
  control: Control
  key: string | undefined
  debounceMs: number
  storage?: PersistStorage
  reset: (values: Record<string, unknown>) => void
  defaultValues: Record<string, unknown>
}): { clearPersistedData: () => void } {
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

  // Restore persisted values on mount
  useEffect(() => {
    if (!key || !storage || restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = storage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        reset({ ...defaultValues, ...parsed })
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
        storage.setItem(key, JSON.stringify(values))
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

  return { clearPersistedData }
}
