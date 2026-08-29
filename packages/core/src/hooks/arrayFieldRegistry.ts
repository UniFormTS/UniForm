/**
 * The live row operations published by a mounted `ArrayField`.
 *
 * Mirrors the subset of `useFieldArray`'s return value that external callers
 * need, so `useArrayField` can delegate to the field array that actually owns
 * the rendered rows instead of mounting a second, desynchronised one.
 */
export type ArrayFieldActions = {
  /** The current rows, each carrying react-hook-form's generated `id`. */
  fields: Record<string, unknown>[]
  append: (value?: unknown) => void
  prepend: (value?: unknown) => void
  insert: (index: number, value?: unknown) => void
  remove: (index?: number | number[]) => void
  move: (from: number, to: number) => void
  swap: (from: number, to: number) => void
  update: (index: number, value: unknown) => void
  replace: (values: unknown[]) => void
}

/**
 * A tiny subscribable map of `path -> ArrayFieldActions`, created once per form
 * instance and published on the AutoForm context.
 *
 * `ArrayField` registers itself on mount so that `useArrayField` (which may be
 * rendered anywhere in the tree) drives the same `useFieldArray` that renders
 * the rows. react-hook-form's `_setFieldArray` does not emit on
 * `_subjects.array`, so two `useFieldArray` hooks on one path never sync —
 * delegation is the only way to keep external controls live.
 */
export type ArrayFieldRegistry = {
  register: (path: string, actions: ArrayFieldActions) => () => void
  get: (path: string) => ArrayFieldActions | undefined
  subscribe: (listener: () => void) => () => void
}

export function createArrayFieldRegistry(): ArrayFieldRegistry {
  const entries = new Map<string, ArrayFieldActions>()
  const listeners = new Set<() => void>()

  const notify = () => {
    for (const listener of listeners) listener()
  }

  return {
    register(path, actions) {
      entries.set(path, actions)
      notify()
      return () => {
        if (entries.get(path) === actions) {
          entries.delete(path)
          notify()
        }
      }
    },
    get(path) {
      return entries.get(path)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
