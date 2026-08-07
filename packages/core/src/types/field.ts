import type * as React from 'react'
import type { RefCallBack } from 'react-hook-form'
import type * as z from 'zod/v4/core'
import type { FormMethods } from './form'
import type { SelectOption } from './shared'
import type { ObjectWrapperProps, ArrayWrapperProps } from './layout'

// ---------------------------------------------------------------------------
// FieldType
// ---------------------------------------------------------------------------

/**
 * The resolved primitive or structural type of a schema field, as determined
 * by introspecting the Zod schema. Used internally to decide which field
 * component to render.
 */
export type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'select' // ZodEnum / ZodNativeEnum
  | 'object' // ZodObject (nested)
  | 'array' // ZodArray
  | 'union' // ZodUnion
  | 'unknown' // fallback for unsupported types

// ---------------------------------------------------------------------------
// FieldCondition
// ---------------------------------------------------------------------------

/**
 * A predicate function that receives the current form values and returns
 * `true` when the field should be visible, `false` when it should be hidden.
 *
 * @template TValues - The shape of the form values object.
 */
export type FieldCondition<TValues = Record<string, unknown>> = (
  values: TValues,
) => boolean

/**
 * A predicate that decides whether a field is required, given the current
 * values. Array-item paths receive the **row**; every other path receives the
 * full form values. The second argument is always the full form values.
 *
 * @template TValues - The shape the predicate receives as its first argument.
 * @template TAll - The shape of the whole form values object.
 */
export type FieldRequirement<
  TValues = Record<string, unknown>,
  TAll = Record<string, unknown>,
> = (values: TValues, allValues: TAll) => boolean

// ---------------------------------------------------------------------------
// FieldDependencyResult
// ---------------------------------------------------------------------------

/**
 * Dynamic field property overrides passed to `ctx.setFieldMeta()` inside a
 * UniForm onChange handler. Each key is optional — only the properties you
 * provide will be applied; omitted keys leave the current field state unchanged.
 */
export type FieldDependencyResult = {
  /** Override the available options for select fields */
  options?: SelectOption[]
  /** Dynamically show or hide the field */
  hidden?: boolean
  /** Dynamically enable or disable the field */
  disabled?: boolean
  /**
   * Dynamically mark the field required or optional. Drives the asterisk,
   * `aria-required`, **and** submit validation — an empty value at a field
   * marked required here blocks submission.
   */
  required?: boolean
  /** Override the field label */
  label?: string
  /** Override the placeholder text */
  placeholder?: string
  /** Override the description text */
  description?: string
}

// ---------------------------------------------------------------------------
// FieldMeta
// ---------------------------------------------------------------------------

/**
 * The base set of per-field UI metadata recognised by UniForm. Merged into
 * Zod's `GlobalMeta` interface via the declaration in `zod-augmentation.d.ts`,
 * so these properties are available on every Zod schema's `.meta()` call.
 *
 * To add custom typed meta fields that flow through to `FieldMeta` /
 * `FieldProps.meta`, augment `GlobalMeta` in your own project:
 *
 * ```ts
 * declare module 'zod/v4/core' {
 *   interface GlobalMeta {
 *     inputMode?: 'numeric' | 'decimal' | 'tel'
 *   }
 * }
 * ```
 */
export type FieldMetaBase = {
  /** Human-readable label rendered above the field. Falls back to a derived label from the field name. */
  label?: string
  /** Placeholder text rendered inside the input when it has no value. */
  placeholder?: string
  /** Helper text rendered below the field to provide additional context. */
  description?: string
  /** Static list of options for `select` / enum fields. */
  options?: SelectOption[]
  /** Group the field under a named section in the form layout. */
  section?: string
  /** Explicit render order within the form or section (lower numbers render first). */
  order?: number
  /** Grid column span for multi-column layouts (e.g. `1`–`12`). */
  span?: number
  /** When `true`, the field is not rendered. */
  hidden?: boolean
  /** When `true`, the field is rendered but not interactive. */
  disabled?: boolean
  /** Conditionally show or hide the field based on the current form values. */
  condition?: FieldCondition
  /**
   * Decide at runtime whether the field is required, based on the current
   * values. Returning `true` shows the asterisk, sets `aria-required`, **and**
   * blocks submit when the value is empty.
   *
   * Mark the field `.optional()` in the schema and put the real rule here —
   * that way there is one rule, not two.
   *
   * Inside an array the predicate receives the **row**; elsewhere it receives
   * the full form values. The second argument is always the full values.
   */
  requiredWhen?: FieldRequirement
  /**
   * Override the component used to render this field.
   *
   * - **string** — a key registered in the `ComponentRegistry` (e.g. `'autocomplete'`
   *   registered via `createAutoForm({ components: { autocomplete: MyComp } })` or the
   *   `components` prop).
   * - **React component** — a `FieldProps`-compatible component passed inline,
   *   bypassing the registry entirely (e.g. `component: MyCustomInput`).
   *
   * Uses `React.ComponentType<never>` as the type parameter rather than
   * `React.ComponentType<FieldProps>` to avoid both a circular inference error
   * (FieldProps → FieldMeta → component → FieldProps) and a contravariance
   * error when components typed as `(props: FieldProps) => JSX.Element` are
   * assigned via Zod's `.meta()`, whose return type widens `meta` to `any`.
   * `ComponentType<never>` is the widest possible assignable supertype.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: string | React.ComponentType<any>
  /** Called when this field's value changes. Receives the new value and form control methods. May be async. */
  onChange?: (value: unknown, form: FormMethods) => void | Promise<void>

  // Array-specific options
  /** When `true`, rows in an array field can be reordered via move-up/move-down buttons. */
  movable?: boolean
  /** When `true`, rows in an array field can be duplicated. Object rows only. */
  duplicable?: boolean
  /** When `true`, rows in an array field can be individually collapsed. Object rows only. */
  collapsible?: boolean
  /**
   * Label rendered on each row of an array of primitives (e.g. `z.array(z.string())`).
   * Scalar rows are unlabelled by default because the array's own label already
   * describes the list.
   */
  itemLabel?: string
  /**
   * Override the wrapper component rendered around this specific object or array field.
   * Takes precedence over the global `layout.objectWrapper` / `layout.arrayWrapper` slots.
   *
   * The component receives the same `ObjectWrapperProps` / `ArrayWrapperProps` as the
   * global slot — `children`, `label`, `className`, and `labelClassName`.
   */
  wrapper?: React.ComponentType<ObjectWrapperProps | ArrayWrapperProps>
}

/**
 * Per-field UI metadata. Equals Zod's `GlobalMeta` interface so that any
 * project-level augmentation of `GlobalMeta` (via `declare module 'zod/v4/core'`)
 * is automatically reflected here — custom fields become fully typed on
 * `FieldConfig.meta`, `FieldProps.meta`, and everywhere else `FieldMeta` appears.
 *
 * The open index signature (`[k: string]: unknown`) is inherited from Zod's
 * `JSONSchemaMeta`, so untyped custom keys continue to work as before.
 */
export type FieldMeta = z.GlobalMeta

// ---------------------------------------------------------------------------
// FieldConfig
// ---------------------------------------------------------------------------

/**
 * Common properties shared by every field variant.
 */
type FieldConfigBase = {
  /** Dot-notated field path (e.g. `"address.street"`). */
  name: string
  /** Display label for the field. */
  label: string
  /** Whether the field is required by the schema. */
  required: boolean
  /** Merged UI metadata for the field. */
  meta: FieldMeta
  /**
   * The original Zod schema for this field, after transparent wrappers
   * (`optional`, `nullable`, `default`, `pipe`) have been stripped.
   *
   * This is a general escape hatch for custom components that need to inspect
   * the raw schema — for example, to read union variants, access custom Zod
   * metadata not captured by introspection, or build schema-aware validation UI.
   */
  schema: z.$ZodType
}

/**
 * The fully resolved configuration for a single form field, produced by
 * introspecting the Zod schema and merging any `fields` prop overrides.
 * Consumed internally by field renderer components.
 *
 * This is a discriminated union on the `type` field — narrow on `type` to
 * access the fields that are only present for specific field kinds (e.g.
 * `children` for `"object"`, `itemConfig` for `"array"`, etc.).
 */
export type FieldConfig = FieldConfigBase &
  (
    | { type: 'string' }
    | { type: 'number' }
    | { type: 'boolean' }
    | { type: 'date' }
    | {
        type: 'select'
        /** Resolved options for `select` / enum fields. */
        options: SelectOption[]
      }
    | {
        type: 'object'
        /** Child field configs for nested object fields. */
        children: FieldConfig[]
      }
    | {
        type: 'array'
        /** Item field config describing a single row's shape. */
        itemConfig: FieldConfig
        /** Minimum number of items (from `z.array().min(...)`). */
        minItems?: number
        /** Maximum number of items (from `z.array().max(...)`). */
        maxItems?: number
      }
    | {
        type: 'union'
        /** Variant configs for each union member. */
        unionVariants: FieldConfig[]
        /** Discriminator key for discriminated unions. */
        discriminatorKey?: string
      }
    | { type: 'unknown' }
  )

// ---------------------------------------------------------------------------
// FieldProps
// ---------------------------------------------------------------------------

/**
 * The props passed to every field renderer component. Provides the current
 * value, change/blur handlers, and all resolved UI metadata needed to render
 * a single field.
 */
export interface FieldProps<Value = unknown> {
  /** Dot-notated field path (e.g. `"address.street"`). */
  name: string
  /** The current field value. */
  value: Value
  /** Callback to update the field value. */
  onChange: (value: Value) => void
  /** Callback fired when the field loses focus. */
  onBlur: () => void
  /** Ref callback for registering the DOM element with `react-hook-form`. */
  ref: RefCallBack
  /** Resolved display label for the field. */
  label: string
  /** Placeholder text for the input. */
  placeholder?: string
  /** Helper text rendered below the field. */
  description?: string
  /** Validation error message for the field. */
  error?: string
  /** Whether the field is required by the schema. */
  required: boolean
  /** When `true`, the field is rendered but not interactive. */
  disabled?: boolean
  /** Resolved options for `select` / enum fields. */
  options?: SelectOption[]
  /** Full field metadata, including any custom keys. */
  meta: FieldMeta
  /**
   * The original Zod schema for this field (after transparent wrappers are stripped).
   * Use this as an escape hatch when you need capabilities beyond what `FieldConfig`
   * exposes — e.g. inspecting union variants, accessing custom Zod refinements, etc.
   */
  schema: z.$ZodType
}

// ---------------------------------------------------------------------------
// Container field props (object / array component overrides)
// ---------------------------------------------------------------------------

/**
 * Options accepted by targeted value writes. Mirrors the react-hook-form
 * `setValue` config without leaking the peer dependency's types.
 */
export type SetValueOptions = {
  /** Re-run validation after the write. */
  shouldValidate?: boolean
  /** Mark the field dirty. */
  shouldDirty?: boolean
  /** Mark the field touched. */
  shouldTouch?: boolean
}

/**
 * Props shared by custom components that replace an **object** or **array**
 * field. A superset of {@link FieldProps} — everything a container needs to
 * render its own layout while keeping UniForm's plumbing for the leaves inside.
 */
export interface ContainerFieldProps<
  Value = unknown,
> extends FieldProps<Value> {
  /** Absolute dot-notated path of this container (identical to `name`). */
  path: string
  /**
   * Write a value at a path **relative to this container**, without replacing
   * the container's whole value.
   *
   * @example
   * setPath('0.qty', 3)          // writes lineItems.0.qty
   * setPath('street', 'Main St') // writes address.street
   */
  setPath: (subPath: string, value: unknown, options?: SetValueOptions) => void
}

/** Props passed to a custom component that replaces an object field. */
export interface ObjectContainerProps<
  Value = unknown,
> extends ContainerFieldProps<Value> {
  /** Field configs for the object's children. */
  fields: FieldConfig[]
}

/** Props passed to a custom component that replaces an array field. */
export interface ArrayContainerProps<
  Value = unknown,
> extends ContainerFieldProps<Value> {
  /** Field config describing a single row. */
  itemConfig: FieldConfig
  /** Current number of rows. */
  rowCount: number
  /** Current rows, each carrying react-hook-form's generated `id`. */
  rows: Record<string, unknown>[]
  /** `false` once the schema's `.max(...)` is reached. */
  canAdd: boolean
  /** `true` at or below the schema's `.min(...)`. */
  atMin: boolean
  append: (value?: unknown) => void
  prepend: (value?: unknown) => void
  insert: (index: number, value?: unknown) => void
  remove: (index?: number | number[]) => void
  move: (from: number, to: number) => void
  swap: (from: number, to: number) => void
  update: (index: number, value: unknown) => void
  replace: (values: unknown[]) => void
}

// ---------------------------------------------------------------------------
// FieldOverride
// ---------------------------------------------------------------------------

/**
 * A per-field override entry used in the AutoFormProps `fields` prop.
 * The `onChange` callback is typed to the specific schema's inferred value
 * type, providing full IDE autocomplete.
 */
export type FieldOverride<
  TSchema extends z.$ZodObject = z.$ZodObject,
  TValue = unknown,
> = Partial<FieldMetaBase> & {
  /** Conditionally show or hide the field based on the current form values. */
  condition?: FieldCondition<z.infer<TSchema>>
  /** Called when this field's value changes. Receives the new value and form control methods. May be async. */
  onChange?: (
    value: TValue,
    form: FormMethods<z.infer<TSchema>>,
  ) => void | Promise<void>
  [key: string]: unknown
}
