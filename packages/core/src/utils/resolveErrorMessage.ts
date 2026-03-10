import type { ValidationMessages } from '../types'

type FieldError = {
  message?: string
  type?: string
}

/**
 * Resolves the final error message to display for a field, applying
 * `ValidationMessages` overrides on top of the raw Zod/RHF error.
 *
 * Resolution priority:
 * 1. Per-field string override in `messages[fieldName]` — used regardless of
 *    error type.
 * 2. Per-field per-code override in `messages[fieldName][error.type]`.
 * 3. Global `messages.required` — applied when the error is a required-field
 *    error (`too_small` or `invalid_type`).
 * 4. The original message from Zod/RHF as a final fallback.
 *
 * @param fieldName - Dot-notated field name (e.g. `"address.street"`).
 * @param error - The raw error object from RHF's `formState.errors`.
 * @param messages - Optional `ValidationMessages` overrides.
 * @returns The resolved error string, or `undefined` if there is no error.
 */
export function resolveErrorMessage(
  fieldName: string,
  error: FieldError | undefined,
  messages?: ValidationMessages,
): string | undefined {
  if (!error) return undefined

  const originalMessage = error.message

  if (!messages) return originalMessage

  // 1. Per-field override
  const fieldMessage = messages[fieldName]
  if (fieldMessage !== undefined) {
    // Per-field string — use it as the error message regardless of error code
    if (typeof fieldMessage === 'string') return fieldMessage
    // Per-field per-code — look up the error type
    if (typeof fieldMessage === 'object' && error.type) {
      const coded = fieldMessage[error.type]
      if (coded) return coded
    }
  }

  // 2. Global required override
  if (messages.required && isRequiredError(error)) {
    return messages.required
  }

  // 3. Fall back to Zod's original message
  return originalMessage
}

/**
 * Returns `true` when the given RHF error represents a missing required value.
 *
 * Zod v4 uses `invalid_type` for `undefined` on required fields, and
 * `too_small` (with `inclusive` minimum) for empty strings / zero values.
 */
function isRequiredError(error: FieldError): boolean {
  // RHF maps Zod errors; "too_small" with inclusive minimum is the common Zod required pattern
  // Also handle "invalid_type" which Zod v4 uses for undefined-on-required
  return error.type === 'too_small' || error.type === 'invalid_type'
}
