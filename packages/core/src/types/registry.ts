import type * as React from 'react'
import type { FieldProps } from './field'
import type { FieldConfig } from './field'

// ---------------------------------------------------------------------------
// ComponentRegistry
// ---------------------------------------------------------------------------

/**
 * A map of field type keys to React components used to render them.
 * Built-in keys (`string`, `number`, `boolean`, `date`, `select`, `textarea`)
 * are pre-typed. Additional custom keys can be added via the index signature
 * and registered through `createAutoForm` or the `components` prop.
 */
export type ComponentRegistry = {
  string?: React.ComponentType<FieldProps>
  number?: React.ComponentType<FieldProps>
  boolean?: React.ComponentType<FieldProps>
  date?: React.ComponentType<FieldProps>
  select?: React.ComponentType<FieldProps>
  textarea?: React.ComponentType<FieldProps>
  [key: string]: React.ComponentType<FieldProps> | undefined
}

// ---------------------------------------------------------------------------
// FieldWrapperProps
// ---------------------------------------------------------------------------

/**
 * Props passed to the field wrapper component that surrounds every rendered
 * field. Used to render the label, description, error message, and grid span.
 */
export interface FieldWrapperProps {
  /** The field input component to wrap. */
  children: React.ReactNode
  /** The fully resolved field configuration. */
  field: FieldConfig
  /** Validation error message for the field. */
  error?: string
  /** Grid column span override (takes precedence over `field.meta.span`). */
  span?: number
  /**
   * Zero-based render index of this field within its parent container
   * (form root or section). Exposed as the `--field-index` CSS custom property.
   */
  index?: number
  /**
   * Nesting depth of this field (0 = top-level, 1 = inside object, etc.).
   * Exposed as the `--field-depth` CSS custom property.
   */
  depth?: number
}
