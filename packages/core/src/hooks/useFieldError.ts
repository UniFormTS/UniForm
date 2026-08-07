import * as React from 'react'
import { useFormState } from 'react-hook-form'
import type { FieldErrors, FieldValues } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import { useAutoFormContext } from '../context/AutoFormContext'
import { useFieldPath, joinFieldPath } from '../context/FieldPathContext'
import { ROOT_ERROR_KEY } from '../validation/requiredResolver'

export type FormIssue = {
  /** Dot-notated path the issue is anchored to. `''` for the form root. */
  path: string
  message: string
  /** Error code, e.g. `'too_small'`, `'required'`, `'manual'`. */
  code?: string
}

type FormLike<TSchema extends z.$ZodObject> = { readonly schema: TSchema }

function useErrorTree(form?: unknown): FieldErrors {
  const ctx = useAutoFormContext(form as { readonly schema: z.$ZodObject })
  const { errors } = useFormState({ control: ctx.control })
  return errors
}

function readAt(errors: unknown, path: string): unknown {
  if (!path) return errors
  let cursor: unknown = errors
  for (const segment of path.split('.')) {
    if (cursor == null || typeof cursor !== 'object') return undefined
    cursor = (cursor as Record<string, unknown>)[segment]
  }
  return cursor
}

function isErrorNode(
  value: unknown,
): value is { message?: string; type?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    ('message' in value || 'type' in value)
  )
}

/** Depth-first walk collecting every `{ message }` node beneath `node`. */
function collectIssues(node: unknown, prefix: string, into: FormIssue[]) {
  if (node == null || typeof node !== 'object') return

  if (isErrorNode(node) && typeof node.message === 'string') {
    into.push({
      path: prefix === ROOT_ERROR_KEY ? '' : prefix,
      message: node.message,
      code: node.type,
    })
  }

  for (const [key, child] of Object.entries(node)) {
    if (key === 'message' || key === 'type' || key === 'ref') continue
    collectIssues(child, prefix ? `${prefix}.${key}` : key, into)
  }
}

/**
 * The whole typed error tree, reactively.
 *
 * Prefer {@link useFieldError} / {@link useFieldErrors} when you only care about
 * one path — this hook re-renders on every error change.
 *
 * @example
 * const errors = useFormErrors(checkoutForm)
 */
export function useFormErrors<TSchema extends z.$ZodObject>(
  form: FormLike<TSchema>,
): FieldErrors<z.infer<TSchema>>
export function useFormErrors<
  TValues extends FieldValues = FieldValues,
>(): FieldErrors<TValues>
export function useFormErrors(form?: unknown): FieldErrors {
  return useErrorTree(form)
}

/**
 * The error message at any path — including paths that are **not** rendered
 * fields: an array element (`'lines.0'`), a whole container (`'address'`), or
 * the form root (`''`).
 *
 * This is where `superRefine` issues raised at `['lines', 0]` become
 * renderable.
 *
 * @example
 * function RowBanner({ index }: { index: number }) {
 *   const error = useFieldError(`lines.${index}`)
 *   return error ? <p role='alert'>{error}</p> : null
 * }
 *
 * @example
 * // Cross-entity issues with no field to sit on:
 * const rootError = useFieldError('')
 */
export function useFieldError(path: string): string | undefined {
  const errors = useErrorTree()
  const basePath = useFieldPath()
  const resolved = path === '' ? ROOT_ERROR_KEY : joinFieldPath(basePath, path)
  const node = readAt(errors, resolved)
  return isErrorNode(node) && typeof node.message === 'string'
    ? node.message
    : undefined
}

/**
 * Every error at or beneath `path`, flattened — so a container component can
 * render a summary for its own subtree.
 *
 * Pass `''` to collect the whole form.
 *
 * @example
 * const issues = useFieldErrors('lines.0')
 * // [{ path: 'lines.0.sku', message: 'SKU too short', code: 'too_small' }]
 */
export function useFieldErrors(path = ''): FormIssue[] {
  const errors = useErrorTree()
  const basePath = useFieldPath()
  const resolved = path === '' ? '' : joinFieldPath(basePath, path)

  return React.useMemo(() => {
    const node = readAt(errors, resolved)
    const collected: FormIssue[] = []
    collectIssues(node, resolved, collected)
    return collected
  }, [errors, resolved])
}
