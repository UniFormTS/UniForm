import type { FieldDependencyResult } from '../types'

/**
 * Describes a mutation applied to an array field's rows.
 */
export type MutationType =
  | { type: 'remove'; index: number }
  | { type: 'move'; from: number; to: number }
  | { type: 'add'; index: number }
  | { type: 'duplicate'; index: number }

/**
 * Regex to match row-indexed keys: "{arrayName}.{index}.{childField}"
 * Captures: [1] = index (digits), [2] = childField (rest of the key)
 */
function buildKeyPattern(arrayName: string): RegExp {
  return new RegExp(`^${escapeRegExp(arrayName)}\\.(\\d+)\\.(.+)$`)
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Re-indexes dynamic meta entries for a specific array field
 * after a row mutation (add, remove, move, duplicate).
 *
 * Returns the store unchanged for invalid mutations (negative index, out of bounds).
 */
export function reindexDynamicMeta(
  dynamicMeta: Record<string, Partial<FieldDependencyResult>>,
  arrayName: string,
  mutation: MutationType,
): Record<string, Partial<FieldDependencyResult>> {
  const pattern = buildKeyPattern(arrayName)

  // Parse all keys into matched (row-indexed for this array) and unmatched
  type ParsedEntry = {
    key: string
    index: number
    childField: string
    value: Partial<FieldDependencyResult>
  }

  const matched: ParsedEntry[] = []
  const result: Record<string, Partial<FieldDependencyResult>> = {}

  for (const [key, value] of Object.entries(dynamicMeta)) {
    const match = pattern.exec(key)
    if (match) {
      matched.push({
        key,
        index: parseInt(match[1], 10),
        childField: match[2],
        value,
      })
    } else {
      // Non-matching keys pass through unchanged
      result[key] = value
    }
  }

  // Validate mutation indices
  if (!isValidMutation(mutation, matched)) {
    return dynamicMeta
  }

  // Apply mutation-specific re-indexing
  switch (mutation.type) {
    case 'remove':
      applyRemove(matched, mutation.index, arrayName, result)
      break
    case 'move':
      applyMove(matched, mutation.from, mutation.to, arrayName, result)
      break
    case 'duplicate':
      applyDuplicate(matched, mutation.index, arrayName, result)
      break
    case 'add':
      applyAdd(matched, mutation.index, arrayName, result)
      break
  }

  return result
}

function isValidMutation(
  mutation: MutationType,
  _entries: Array<{ index: number }>,
): boolean {
  switch (mutation.type) {
    case 'remove':
      return mutation.index >= 0
    case 'move':
      return mutation.from >= 0 && mutation.to >= 0
    case 'duplicate':
      return mutation.index >= 0
    case 'add':
      return mutation.index >= 0
  }
}

function buildKey(
  arrayName: string,
  index: number,
  childField: string,
): string {
  return `${arrayName}.${index}.${childField}`
}

/**
 * Remove: delete entries for the removed row, decrement indices > removed.
 */
function applyRemove(
  entries: Array<{
    index: number
    childField: string
    value: Partial<FieldDependencyResult>
  }>,
  removedIndex: number,
  arrayName: string,
  result: Record<string, Partial<FieldDependencyResult>>,
): void {
  for (const entry of entries) {
    if (entry.index === removedIndex) {
      // Skip — this row is being removed
      continue
    } else if (entry.index > removedIndex) {
      // Decrement index
      result[buildKey(arrayName, entry.index - 1, entry.childField)] =
        entry.value
    } else {
      // Index < removedIndex — unchanged
      result[buildKey(arrayName, entry.index, entry.childField)] = entry.value
    }
  }
}

/**
 * Move: shift indices between source and destination.
 * Moving row A to position B means:
 * - Row A's entries get index B
 * - Rows between A and B shift by 1 in the opposite direction
 */
function applyMove(
  entries: Array<{
    index: number
    childField: string
    value: Partial<FieldDependencyResult>
  }>,
  from: number,
  to: number,
  arrayName: string,
  result: Record<string, Partial<FieldDependencyResult>>,
): void {
  if (from === to) {
    // No-op: just copy entries as-is
    for (const entry of entries) {
      result[buildKey(arrayName, entry.index, entry.childField)] = entry.value
    }
    return
  }

  for (const entry of entries) {
    let newIndex: number

    if (entry.index === from) {
      // The moved row goes to the destination
      newIndex = to
    } else if (from < to) {
      // Moving down: rows between (from, to] shift up by 1 (decrement)
      if (entry.index > from && entry.index <= to) {
        newIndex = entry.index - 1
      } else {
        newIndex = entry.index
      }
    } else {
      // Moving up: rows between [to, from) shift down by 1 (increment)
      if (entry.index >= to && entry.index < from) {
        newIndex = entry.index + 1
      } else {
        newIndex = entry.index
      }
    }

    result[buildKey(arrayName, newIndex, entry.childField)] = entry.value
  }
}

/**
 * Duplicate: copy source row entries to new index (source + 1),
 * increment indices > source.
 */
function applyDuplicate(
  entries: Array<{
    index: number
    childField: string
    value: Partial<FieldDependencyResult>
  }>,
  sourceIndex: number,
  arrayName: string,
  result: Record<string, Partial<FieldDependencyResult>>,
): void {
  for (const entry of entries) {
    if (entry.index === sourceIndex) {
      // Keep original at same index
      result[buildKey(arrayName, entry.index, entry.childField)] = entry.value
      // Copy to new index (sourceIndex + 1)
      result[buildKey(arrayName, sourceIndex + 1, entry.childField)] =
        entry.value
    } else if (entry.index > sourceIndex) {
      // Increment index to make room for the duplicate
      result[buildKey(arrayName, entry.index + 1, entry.childField)] =
        entry.value
    } else {
      // Index < sourceIndex — unchanged
      result[buildKey(arrayName, entry.index, entry.childField)] = entry.value
    }
  }
}

/**
 * Add: increment indices >= new index to make room for the new row.
 */
function applyAdd(
  entries: Array<{
    index: number
    childField: string
    value: Partial<FieldDependencyResult>
  }>,
  newIndex: number,
  arrayName: string,
  result: Record<string, Partial<FieldDependencyResult>>,
): void {
  for (const entry of entries) {
    if (entry.index >= newIndex) {
      // Increment index to make room
      result[buildKey(arrayName, entry.index + 1, entry.childField)] =
        entry.value
    } else {
      // Index < newIndex — unchanged
      result[buildKey(arrayName, entry.index, entry.childField)] = entry.value
    }
  }
}
