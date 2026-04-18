import type * as React from 'react'

// ---------------------------------------------------------------------------
// ArrayButtonProps
// ---------------------------------------------------------------------------

/**
 * Props for a generic array action button. Compatible with standard design
 * system button components — pass your own via the `arrayButton` layout slot
 * and it will be used for all array buttons (add, remove, move, duplicate).
 */
export interface ArrayButtonProps {
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  /** Always `"button"` — prevents accidental form submission. */
  type?: 'button' | 'submit' | 'reset'
  /** Accessible label describing the specific action and target row. */
  'aria-label'?: string
  /** CSS class name forwarded from `classNames.arrayAdd` / `arrayRemove` / etc. */
  className?: string
  children?: React.ReactNode
}

/**
 * Props for the collapse/expand toggle button on an array row.
 * Extends `ArrayButtonProps` with collapse state so custom components
 * can apply directional styling (e.g. rotating a chevron icon).
 */
export interface ArrayCollapseButtonProps extends ArrayButtonProps {
  /** Whether the row is currently collapsed. */
  isCollapsed: boolean
}

// ---------------------------------------------------------------------------
// ArrayFieldLayoutProps / ArrayRowLayoutProps
// ---------------------------------------------------------------------------

/**
 * Props for the component that wraps the entire array field body,
 * controlling the relative position of the rows and the add button.
 */
export interface ArrayFieldLayoutProps {
  /** The rendered list of array rows. */
  rows: React.ReactNode
  /** The rendered "add row" button. */
  addButton: React.ReactNode
  /** Total number of rows currently in the array. */
  rowCount: number
  /** Whether adding another row is permitted (respects `maxItems`). */
  canAdd: boolean
}

/**
 * Props passed to the component that renders a single row inside an array field,
 * including the row's content and action buttons (move, duplicate, remove, collapse).
 */
export interface ArrayRowLayoutProps {
  /** The rendered fields for this array item. */
  children: React.ReactNode
  /** Action button nodes for the row. */
  buttons: {
    /** Button to move the row up, or `null` if already first. */
    moveUp: React.ReactNode | null
    /** Button to move the row down, or `null` if already last. */
    moveDown: React.ReactNode | null
    /** Button to duplicate the row, or `null` if at max items. */
    duplicate: React.ReactNode | null
    /** Button to remove the row, or `null` when omitted via layout slot. */
    remove: React.ReactNode | null
    /** Button to collapse/expand the row, or `null` if collapsing is disabled. */
    collapse: React.ReactNode | null
  }
  /** Zero-based index of this row within the array. */
  index: number
  /** Total number of rows currently in the array. */
  rowCount: number
}

// ---------------------------------------------------------------------------
// Named props for structural layout slots
// ---------------------------------------------------------------------------

/** Props received by the `layout.formWrapper` component. */
export interface FormWrapperProps {
  children: React.ReactNode
}

/** Props received by the `layout.sectionWrapper` component (and per-section `SectionConfig.component`). */
export interface SectionWrapperProps {
  children: React.ReactNode
  title: string
  className?: string
}

/**
 * Props received by the `layout.objectWrapper` component.
 * Replaces the default `<fieldset>` / `<legend>` wrapper rendered around
 * nested object fields.
 */
export interface ObjectWrapperProps {
  /** The rendered child fields. */
  children: React.ReactNode
  /** The field label (used as the legend / heading). May be undefined. */
  label: string | undefined
  /** CSS class name forwarded from `classNames.objectFieldset`. */
  className?: string
  /** CSS class name forwarded from `classNames.objectLegend` for the label element. */
  labelClassName?: string
}

/**
 * Props received by the `layout.arrayWrapper` component.
 * Replaces the default `<fieldset>` / `<legend>` wrapper rendered around
 * array fields.
 */
export interface ArrayWrapperProps {
  /** The rendered array field body (rows + add button). */
  children: React.ReactNode
  /** The field label (used as the legend / heading). May be undefined. */
  label: string | undefined
  /** CSS class name forwarded from `classNames.arrayFieldset`. */
  className?: string
  /** CSS class name forwarded from `classNames.arrayLegend` for the label element. */
  labelClassName?: string
}

/** Props received by the `layout.submitButton` component. */
export interface SubmitButtonProps {
  isSubmitting: boolean
  label: string
}

type OptionalSlotComponent<TProps> = React.ComponentType<TProps> | null

// ---------------------------------------------------------------------------
// SectionConfig
// ---------------------------------------------------------------------------

/**
 * Per-section styling overrides forwarded to the `sectionWrapper` component.
 * Keys are section titles; values control how that section wrapper is styled.
 */
export type SectionConfig = {
  /** CSS class name(s) applied to the section wrapper. */
  className?: string
  /** Replaces the section wrapper component entirely for this section. */
  component?: React.ComponentType<SectionWrapperProps>
}

// ---------------------------------------------------------------------------
// ArrayButtonSlots
// ---------------------------------------------------------------------------

/**
 * Button component overrides for array fields. Set `base` to swap in your
 * design system's button everywhere; use the specific keys to override
 * individual actions on top of that. All keys fall back to `base`, which
 * itself falls back to a plain `<button>`.
 */
export type ArrayButtonSlots = {
  /** Used for every array button that has no specific override. Set to `null` to omit all unspecified buttons. */
  base?: OptionalSlotComponent<ArrayButtonProps>
  /** Override for the add-row button only. Set to `null` to omit. */
  add?: OptionalSlotComponent<ArrayButtonProps>
  /** Override for the remove-row button only. Set to `null` to omit. */
  remove?: OptionalSlotComponent<ArrayButtonProps>
  /** Override for the move-up button only. Set to `null` to omit. */
  moveUp?: OptionalSlotComponent<ArrayButtonProps>
  /** Override for the move-down button only. Set to `null` to omit. */
  moveDown?: OptionalSlotComponent<ArrayButtonProps>
  /** Override for the duplicate-row button only. Set to `null` to omit. */
  duplicate?: OptionalSlotComponent<ArrayButtonProps>
  /**
   * Override for the collapse/expand toggle button only.
   * Receives `isCollapsed` in addition to standard `ArrayButtonProps`.
   */
  collapse?: OptionalSlotComponent<ArrayCollapseButtonProps>
}

/**
 * Resolved button slots where every entry is guaranteed to be defined.
 */
export type ResolvedArrayButtonSlots = {
  base: OptionalSlotComponent<ArrayButtonProps>
  add: OptionalSlotComponent<ArrayButtonProps>
  remove: OptionalSlotComponent<ArrayButtonProps>
  moveUp: OptionalSlotComponent<ArrayButtonProps>
  moveDown: OptionalSlotComponent<ArrayButtonProps>
  duplicate: OptionalSlotComponent<ArrayButtonProps>
  collapse: OptionalSlotComponent<ArrayCollapseButtonProps>
}

// ---------------------------------------------------------------------------
// LayoutSlots / ResolvedLayoutSlots
// ---------------------------------------------------------------------------

/**
 * Optional layout slot overrides for top-level structural components of the
 * form. Provide only the slots you want to replace; omitted slots fall back
 * to the built-in defaults.
 */
export type LayoutSlots = {
  /** Wrapper rendered around the entire form. */
  formWrapper?: React.ComponentType<FormWrapperProps>
  /** Wrapper rendered around each named field section. */
  sectionWrapper?: React.ComponentType<SectionWrapperProps>
  /** Custom submit button component. Set to `null` to omit rendering it. */
  submitButton?: OptionalSlotComponent<SubmitButtonProps>
  /** Custom layout component for individual rows in array fields. */
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
  /**
   * Controls the layout of the entire array field body — position the rows
   * and add button relative to each other (e.g. add button above rows).
   */
  arrayFieldLayout?: React.ComponentType<ArrayFieldLayoutProps>
  /**
   * Replaces the `<fieldset>` / `<legend>` wrapper rendered around nested
   * object fields. Receives `label`, `className`, and `labelClassName` props.
   */
  objectWrapper?: React.ComponentType<ObjectWrapperProps>
  /**
   * Replaces the `<fieldset>` / `<legend>` wrapper rendered around array
   * fields. Receives `label`, `className`, and `labelClassName` props.
   */
  arrayWrapper?: React.ComponentType<ArrayWrapperProps>
  /**
   * Button component overrides for array fields. Set `base` to use your
   * design system's button everywhere; use specific keys to override
   * individual actions.
   */
  arrayButtons?: ArrayButtonSlots
  /**
   * Content rendered while async `defaultValues` are loading.
   * Defaults to a simple `<p>Loading…</p>` when not provided.
   */
  loadingFallback?: React.ReactNode
  /**
   * Per-section config keyed by section title.
   * Forwarded to the `sectionWrapper` component as a `className` prop.
   */
  sections?: Record<string, SectionConfig>
}

/**
 * The resolved version of `LayoutSlots` used internally, where all slots are
 * guaranteed to be defined (falling back to built-in defaults).
 */
export type ResolvedLayoutSlots = {
  formWrapper: React.ComponentType<FormWrapperProps>
  sectionWrapper: React.ComponentType<SectionWrapperProps>
  submitButton: OptionalSlotComponent<SubmitButtonProps>
  arrayRowLayout: React.ComponentType<ArrayRowLayoutProps>
  arrayFieldLayout: React.ComponentType<ArrayFieldLayoutProps>
  objectWrapper: React.ComponentType<ObjectWrapperProps>
  arrayWrapper: React.ComponentType<ArrayWrapperProps>
  arrayButtons: ResolvedArrayButtonSlots
  loadingFallback: React.ReactNode
}

// ---------------------------------------------------------------------------
// FormClassNames
// ---------------------------------------------------------------------------

/**
 * CSS class name overrides for the various structural elements of the form.
 * Only the keys you provide will be applied; omitted keys use the built-in
 * default class names (or none, if the default components don't apply any).
 */
export type FormClassNames = {
  /** Class applied to the `<form>` element. */
  form?: string
  /** Class applied to each field wrapper. */
  fieldWrapper?: string
  /** Class applied to each field label. */
  label?: string
  /** Class applied to each field description. */
  description?: string
  /** Class applied to each field error message. */
  error?: string
  /** Class applied to the "add item" button in array fields. */
  arrayAdd?: string
  /** Class applied to the "remove item" button in array fields. */
  arrayRemove?: string
  /** Class applied to the "move item" buttons in array fields. */
  arrayMove?: string
  /** Class applied to the "duplicate item" button in array fields. */
  arrayDuplicate?: string
  /** Class applied to the "collapse item" button in array fields. */
  arrayCollapse?: string
  /** Class applied to the `<fieldset>` wrapper around nested object fields. */
  objectFieldset?: string
  /** Class applied to the `<legend>` label inside nested object fields. */
  objectLegend?: string
  /** Class applied to the `<fieldset>` wrapper around array fields. */
  arrayFieldset?: string
  /** Class applied to the `<legend>` label inside array fields. */
  arrayLegend?: string
}
