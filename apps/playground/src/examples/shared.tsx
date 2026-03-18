import type { FieldProps, FieldWrapperProps } from '@uniform-ts/core'

// ---------------------------------------------------------------------------
// SubmittedData — shows the form result as pretty-printed JSON
// ---------------------------------------------------------------------------

export function SubmittedData({ data }: { data: unknown }) {
  if (data == null) return null
  return (
    <pre
      style={{
        background: '#f5f5f5',
        padding: '1rem',
        borderRadius: 4,
        marginTop: '0.5rem',
        fontSize: '0.85rem',
        overflow: 'auto',
      }}
    >
      {JSON.stringify(
        data,
        (_k, v) => (v instanceof Date ? v.toISOString() : v),
        2,
      )}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Branded design-system primitives (shared across several factory examples)
// ---------------------------------------------------------------------------

export function BrandedInput(props: FieldProps) {
  return (
    <input
      id={props.name}
      name={props.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      ref={props.ref}
      placeholder={props.placeholder}
      disabled={props.disabled}
      required={props.required}
      aria-required={props.required}
      aria-disabled={props.disabled ?? false}
      type={
        (props.meta.inputType as string) === 'number'
          ? 'number'
          : (props.meta.inputType as string) === 'date'
            ? 'date'
            : 'text'
      }
      style={{
        border: '2px solid #4f46e5',
        borderRadius: 6,
        padding: '0.4rem 0.6rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  )
}

export function BrandedFieldWrapper({
  children,
  field,
  error,
}: FieldWrapperProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={field.name}
        style={{
          fontWeight: 600,
          display: 'block',
          marginBottom: 2,
          color: '#4f46e5',
        }}
      >
        {field.label}
        {field.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      {children}
      {error && (
        <span role='alert' style={{ color: 'red', fontSize: '0.8rem' }}>
          {error}
        </span>
      )}
    </div>
  )
}

export function BrandedSubmitButton({
  isSubmitting,
}: {
  isSubmitting: boolean
}) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      style={{
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.5rem 1.2rem',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
      }}
    >
      {isSubmitting ? 'Saving...' : 'Submit'}
    </button>
  )
}
