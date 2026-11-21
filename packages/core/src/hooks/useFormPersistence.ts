import { useEffect, useRef, useCallback } from 'react'
import { useWatch } from 'react-hook-form'
import type { Control, UseFormReturn } from 'react-hook-form'
import type { PersistStorage } from '../types'
import { mergeDefaults } from '../utils/mergeDefaults'

/** The form methods `useFormPersistence` can save through. */
export type PersistenceMethods = Pick<
  UseFormReturn<Record<string, unknown>>,
  'watch' | 'getValues'
>

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
 * - Pass the form's `methods` (`watch` and `getValues` from `useForm`) to save
 *   through their subscription instead of `useWatch`, so value changes don't
 *   re-render the calling component.
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
  /** `watch` and `getValues` from `useForm`. When given, values are saved
   *  from `watch`'s subscription and the calling component doesn't re-render
   *  on value changes. */
  methods?: PersistenceMethods
}): { clearPersistedData: () => void } {
  const {
    control,
    key,
    debounceMs,
    storage: customStorage,
    reset,
    defaultValues,
    methods,
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
        reset(mergeDefaults(defaultValues, parsed))
      }
    } catch {
      // Invalid data — ignore silently
    }
  }, [key, storage, reset, defaultValues])

  const save = useCallback(
    (values: unknown) => {
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
    },
    [key, storage, debounceMs],
  )
  const cancelSave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const watch = methods?.watch
  const getValues = methods?.getValues

  // Without `methods`: watch all values and persist on change
  const values = useWatch({ control, disabled: !!watch })

  useEffect(() => {
    if (watch) return
    save(values)
    return cancelSave
  }, [watch, save, cancelSave, values])

  // With `methods`: persist from the subscription, without re-rendering.
  // (`getValues`, not `watch()`: the latter makes RHF re-render the form root.)
  useEffect(() => {
    if (!watch || !getValues) return
    save(getValues())
    const subscription = watch((next) => save(next))
    return () => {
      subscription.unsubscribe()
      cancelSave()
    }
  }, [watch, getValues, save, cancelSave])

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
