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
