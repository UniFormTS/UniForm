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

/** Envelope written to storage, so a draft can be migrated later. */
type PersistedEnvelope = {
  __uniformVersion: number
  values: Record<string, unknown>
}

function unwrap(raw: string): { version: number; values: unknown } {
  const parsed: unknown = JSON.parse(raw)
  if (
    parsed &&
    typeof parsed === 'object' &&
    '__uniformVersion' in parsed &&
    'values' in parsed
  ) {
    const envelope = parsed as PersistedEnvelope
    return { version: envelope.__uniformVersion, values: envelope.values }
  }
  // Drafts written before versioning existed are version 0.
  return { version: 0, values: parsed }
}

function isThenable(value: unknown): value is Promise<string | null> {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { then?: unknown }).then === 'function'
  )
}

export type UseFormPersistenceOptions = {
  control: Control
  key: string | undefined
  debounceMs: number
  storage?: PersistStorage
  reset: (values: Record<string, unknown>) => void
  defaultValues: Record<string, unknown>
  version?: number
  migrate?: (
    persisted: unknown,
    fromVersion: number,
  ) => Record<string, unknown> | undefined
}

/**
 * Persists form values to a storage adapter and restores them on mount.
 *
 * - On mount, reads `key` from `storage` and calls `reset` with the merged
 *   stored + default values, so the form starts with any previously saved data.
 * - Drafts are written inside a versioned envelope. When the stored version
 *   differs from `version`, `migrate` receives the persisted values and the
 *   version they were written at; returning `undefined` discards the draft.
 * - Corrupt or unmigratable data is dropped with a console warning rather than
 *   half-restored.
 * - `storage` may be async (returning promises) — restoration is reported via
 *   `isRestoring` so the caller can gate rendering behind it.
 * - On every value change, writes the current values after `debounceMs`.
 * - When `key` is `undefined`, persistence is entirely disabled.
 * - Falls back to `sessionStorage` when no custom `storage` adapter is provided.
 *
 * @returns `clearPersistedData` to remove the draft, `hasPersistedDraft` to test
 *   whether one was restored, and `isRestoring` while an async adapter is read.
 */
export function useFormPersistence(options: UseFormPersistenceOptions): {
  clearPersistedData: () => void
  hasPersistedDraft: () => boolean
  isRestoring: boolean
} {
  const {
    control,
    key,
    debounceMs,
    storage: customStorage,
    reset,
    defaultValues,
    version = 0,
    migrate,
  } = options
  const storage = customStorage ?? defaultStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const restoredRef = useRef(false)
  const hasDraftRef = useRef(false)

  // Read once, during the first render, so a synchronous adapter never flashes
  // the loading fallback and an async one always does.
  const initialReadRef = useRef<string | null | Promise<string | null>>(null)
  const [isRestoring, setIsRestoring] = useState(() => {
    if (!key || !storage) return false
    try {
      const result = storage.getItem(key)
      initialReadRef.current = result
      return isThenable(result)
    } catch {
      return false
    }
  })

  // Restoration must happen exactly once. Inline `defaultValues` / `migrate`
  // props change identity every render, so they are read through refs rather
  // than re-running (and cancelling) the effect.
  const latest = useRef({ reset, defaultValues, migrate })
  latest.current = { reset, defaultValues, migrate }

  useEffect(() => {
    if (!key || !storage) {
      setIsRestoring(false)
      return
    }
    if (restoredRef.current) return
    restoredRef.current = true

    let cancelled = false
    const finish = () => {
      if (!cancelled) setIsRestoring(false)
    }

    const drop = (message: string, error?: unknown) => {
      console.warn(message, ...(error === undefined ? [] : [error]))
      try {
        void storage.removeItem(key)
      } catch {
        // Storage unavailable — nothing further to do.
      }
    }

    const apply = (raw: string | null) => {
      if (cancelled) return
      if (!raw) return finish()
      try {
        const { version: storedVersion, values } = unwrap(raw)
        let restored = values as Record<string, unknown> | undefined

        if (storedVersion !== version) {
          const migrateNow = latest.current.migrate
          if (!migrateNow) {
            drop(
              `[UniForm] Discarding the persisted draft at "${key}": it was saved at ` +
                `version ${storedVersion} but this form is at version ${version}, ` +
                'and no persistMigrate was provided.',
            )
            return finish()
          }
          restored = migrateNow(values, storedVersion)
          if (!restored) {
            drop(
              `[UniForm] persistMigrate discarded the draft at "${key}" (saved at ` +
                `version ${storedVersion}). Starting from defaults.`,
            )
            return finish()
          }
        }

        hasDraftRef.current = true
        latest.current.reset({ ...latest.current.defaultValues, ...restored })
      } catch (error) {
        drop(
          `[UniForm] Could not restore the persisted draft at "${key}" — the stored ` +
            'data is unreadable and has been discarded.',
          error,
        )
      }
      finish()
    }

    try {
      const result = initialReadRef.current ?? storage.getItem(key)
      if (isThenable(result)) {
        void result.then(apply, finish)
      } else {
        apply(result)
      }
    } catch {
      finish()
    }

    return () => {
      cancelled = true
    }
  }, [key, storage, version])

  // Watch all values and persist on change. Disabled without a key so the
  // owning component does not re-render on every keystroke for nothing.
  const values = useWatch({ control, disabled: !key })

  useEffect(() => {
    if (!key || !storage) return
    // Skip until restoration has settled, so we never overwrite a stored draft
    // with the defaults we are about to replace.
    if (!restoredRef.current || isRestoring) return

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      try {
        const envelope: PersistedEnvelope = {
          __uniformVersion: version,
          values: values as Record<string, unknown>,
        }
        void storage.setItem(key, JSON.stringify(envelope))
      } catch {
        // Storage full or unavailable — fail silently
      }
    }, debounceMs)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [key, storage, values, debounceMs, version, isRestoring])

  const clearPersistedData = useCallback(() => {
    if (!key || !storage) return
    hasDraftRef.current = false
    try {
      void storage.removeItem(key)
    } catch {
      // fail silently
    }
  }, [key, storage])

  const hasPersistedDraft = useCallback(() => hasDraftRef.current, [])

  return { clearPersistedData, hasPersistedDraft, isRestoring }
}
