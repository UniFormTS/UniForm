import { useEffect, useRef, useCallback, useState } from 'react'
import type { FieldValues, UseFormWatch } from 'react-hook-form'
import type { PersistStorage } from '../types'

const NO_PATHS: readonly string[] = []

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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value) as unknown
  return proto === Object.prototype || proto === null
}

/** Copy of `values` without the given dot paths (objects only, not array rows). */
function omitPaths(
  values: Record<string, unknown>,
  paths: readonly string[],
): Record<string, unknown> {
  if (!paths.length) return values
  const out = { ...values }
  for (const path of paths) {
    const segments = path.split('.')
    let cursor: Record<string, unknown> | undefined = out
    for (let i = 0; i < segments.length - 1 && cursor; i++) {
      const next: unknown = cursor[segments[i]]
      if (!isPlainObject(next)) {
        cursor = undefined
        break
      }
      const copy = { ...next }
      cursor[segments[i]] = copy
      cursor = copy
    }
    if (cursor) delete cursor[segments[segments.length - 1]]
  }
  return out
}

export type UseFormPersistenceOptions = {
  watch: UseFormWatch<FieldValues>
  getValues: () => FieldValues
  key: string | undefined
  debounceMs: number
  storage?: PersistStorage
  /** Applies a restored draft to the form. */
  restore: (draft: Record<string, unknown>) => void
  version?: number
  migrate?: (
    persisted: unknown,
    fromVersion: number,
  ) => Record<string, unknown> | undefined
  /** Dot paths that are never written to (or restored from) storage. */
  exclude?: readonly string[]
}

/**
 * Persists form values to a storage adapter and restores them on mount.
 *
 * - On mount, and whenever `key` changes, reads `key` from `storage` and hands
 *   the draft to `restore`.
 * - Drafts are written inside a versioned envelope. When the stored version
 *   differs from `version`, `migrate` receives the persisted values and the
 *   version they were written at; returning `undefined` discards the draft.
 * - Corrupt, non-object or unmigratable data is dropped with a console warning
 *   rather than half-restored.
 * - `storage` may be async (returning promises) — restoration is reported via
 *   `isRestoring` so the caller can gate rendering behind it.
 * - After restoration, every value change writes the current values after
 *   `debounceMs`, minus the `exclude` paths.
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
    watch,
    getValues,
    key,
    debounceMs,
    storage: customStorage,
    restore,
    version = 0,
    migrate,
    exclude = NO_PATHS,
  } = options
  const storage = customStorage ?? defaultStorage
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // The key whose draft has been restored; writes wait until it matches `key`.
  const restoredKeyRef = useRef<string | undefined>(undefined)
  const hasDraftRef = useRef(false)

  // Read once, during the first render, so a synchronous adapter never flashes
  // the loading fallback and an async one always does.
  const initialReadRef = useRef<
    { key: string; result: string | null | Promise<string | null> } | undefined
  >(undefined)
  const [isRestoring, setIsRestoring] = useState(() => {
    if (!key || !storage) return false
    try {
      const result = storage.getItem(key)
      initialReadRef.current = { key, result }
      return isThenable(result)
    } catch {
      return false
    }
  })

  // Inline `restore` / `migrate` / `exclude` props change identity every
  // render, so they are read through a ref rather than re-running the effect.
  const latest = useRef({ restore, migrate, exclude })
  latest.current = { restore, migrate, exclude }

  useEffect(() => {
    if (!key || !storage) {
      setIsRestoring(false)
      return
    }
    if (restoredKeyRef.current === key) return
    hasDraftRef.current = false

    // Only a *settled* restore is recorded, so a StrictMode re-run (or a
    // cancelled key) picks the pending read back up instead of hanging.
    let cancelled = false
    const settle = () => {
      if (cancelled) return
      restoredKeyRef.current = key
      initialReadRef.current = undefined
      setIsRestoring(false)
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
      if (raw) {
        try {
          const { version: storedVersion, values } = unwrap(raw)
          let restored: unknown = values

          if (storedVersion !== version) {
            const migrateNow = latest.current.migrate
            restored = migrateNow
              ? migrateNow(values, storedVersion)
              : undefined
            if (!migrateNow) {
              drop(
                `[UniForm] Discarding the persisted draft at "${key}": it was saved at ` +
                  `version ${storedVersion} but this form is at version ${version}, ` +
                  'and no persistMigrate was provided.',
              )
            } else if (!restored) {
              drop(
                `[UniForm] persistMigrate discarded the draft at "${key}" (saved at ` +
                  `version ${storedVersion}). Starting from defaults.`,
              )
            }
          }

          if (restored !== undefined && !isPlainObject(restored)) {
            drop(
              `[UniForm] Discarding the persisted draft at "${key}": it is not an ` +
                'object of form values.',
            )
          } else if (restored) {
            hasDraftRef.current = true
            latest.current.restore(omitPaths(restored, latest.current.exclude))
          }
        } catch (error) {
          drop(
            `[UniForm] Could not restore the persisted draft at "${key}" — the stored ` +
              'data is unreadable and has been discarded.',
            error,
          )
        }
      }
      settle()
    }

    try {
      const initial = initialReadRef.current
      const result =
        initial?.key === key ? initial.result : storage.getItem(key)
      if (isThenable(result)) {
        initialReadRef.current = { key, result }
        setIsRestoring(true)
        void result.then(apply, settle)
      } else {
        apply(result)
      }
    } catch {
      settle()
    }

    return () => {
      cancelled = true
    }
  }, [key, storage, version])

  // Subscribe instead of `useWatch`, so the owning component does not
  // re-render on every keystroke just to schedule a write.
  useEffect(() => {
    if (!key || !storage || isRestoring || restoredKeyRef.current !== key) {
      return
    }
    const subscription = watch(() => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        timerRef.current = null
        const envelope: PersistedEnvelope = {
          __uniformVersion: version,
          values: omitPaths(getValues(), latest.current.exclude),
        }
        try {
          void Promise.resolve(
            storage.setItem(key, JSON.stringify(envelope)),
          ).catch(() => {})
        } catch {
          // Storage full or unavailable — fail silently
        }
      }, debounceMs)
    })

    return () => {
      subscription.unsubscribe()
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [key, storage, isRestoring, debounceMs, version, watch, getValues])

  const clearPersistedData = useCallback(() => {
    if (!key || !storage) return
    // A pending debounced write would otherwise put the draft straight back.
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
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
