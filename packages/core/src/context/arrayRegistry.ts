import type { UseFieldArrayReturn } from 'react-hook-form'

/** Row operations of a mounted field array, as published to the registry. */
export type ArrayOperations = Pick<
  UseFieldArrayReturn,
  | 'append'
  | 'prepend'
  | 'insert'
  | 'remove'
  | 'move'
  | 'swap'
  | 'update'
  | 'replace'
>

export type ArrayRegistration = {
  fields: UseFieldArrayReturn['fields']
  ops: ArrayOperations
}

/**
 * Per-form store of the field arrays currently rendered, keyed by their full
 * dot-notated path. Lets `useArrayField` drive the array's own `useFieldArray`
 * instead of mounting a second, unsynchronised one on the same path.
 */
export type ArrayRegistry = {
  /** Publishes `entry` under `name`; returns a function that unregisters it. */
  register: (name: string, entry: ArrayRegistration) => () => void
  get: (name: string) => ArrayRegistration | undefined
  subscribe: (listener: () => void) => () => void
}

export function createArrayRegistry(): ArrayRegistry {
  const entries = new Map<string, ArrayRegistration>()
  const listeners = new Set<() => void>()
  const notify = () => {
    for (const listener of listeners) listener()
  }

  return {
    register(name, entry) {
      entries.set(name, entry)
      notify()
      return () => {
        if (entries.get(name) !== entry) return
        entries.delete(name)
        notify()
      }
    },
    get: (name) => entries.get(name),
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
