# UniForm — Phase 8 Prompt: Typed `depend` Values & i18n Label Strings

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phases 1–7 are complete — there are 107 passing tests (34 introspection + 73 AutoForm), a recursive field renderer, unstyled default components, a component registry with a 5-step resolution chain, conditional fields, section grouping, layout slots, CSS class name threading, a `createAutoForm()` factory, pluggable coercion, custom validation messages, deep field overrides, programmatic control via ref, form state persistence, enhanced array fields (reorder, duplicate, collapsible, minItems/maxItems), custom array row layout, field dependencies (`meta.depend`), value cascade, and per-field custom components (both direct React components in `meta.component` and registry-key strings).

This prompt covers **Phase 8 only**: two focused improvements to the `AutoForm`/`createAutoForm` API surface:

1. **Typed `depend` values** — when `depend` is specified inside the `fields` prop, the `values` argument is typed to `z.infer<TSchema>` instead of `Record<string, unknown>`, giving consumers full IDE autocomplete and type safety on the watched values object.
2. **i18n label strings** — a new `labels` prop (and matching factory-level `labels` config) that lets consumers replace every piece of hard-coded UI text in the library (`"Submit"`, `"Add"`, `"Remove"`, move/duplicate/collapse buttons) without having to replace entire layout slot components.

Before writing any code, read the existing types in `packages/core/src/types/index.ts`, `AutoForm.tsx`, `createAutoForm.tsx`, `AutoFormContext.tsx`, `ArrayField.tsx`, `DefaultSubmitButton.tsx`, and `index.ts` (public exports).

---

## Current State (What Already Exists)

### `FieldMetaBase.depend` — BEFORE phase 8

```ts
depend?: (values: Record<string, unknown>) => FieldDependencyResult
```

### `AutoFormProps.fields` — BEFORE phase 8

```ts
fields?: Record<string, Partial<FieldMeta>>
```

The `depend` function nested inside each field override receives `Record<string, unknown>`, offering no type safety.

### `AutoFormConfig` (factory) — BEFORE phase 8

```ts
type AutoFormConfig = {
  components?: ComponentRegistry
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
}
```

No `labels` support.

### `DefaultSubmitButton` — BEFORE phase 8

```ts
function DefaultSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button type='submit' disabled={isSubmitting}>
      Submit     {/* hard-coded */}
    </button>
  )
}
```

### `ArrayField` — BEFORE phase 8

All button labels (`"Add"`, `"Remove"`, `"↑"`, `"↓"`, `"Duplicate"`, `"▶"`) are hard-coded strings.

### `AutoFormContextValue` — BEFORE phase 8

```ts
type AutoFormContextValue = {
  registry: ComponentRegistry
  fieldOverrides: Record<string, Partial<FieldMeta>>
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  layout: ResolvedLayoutSlots
  classNames: FormClassNames
  disabled: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
}
```

---

## What to Build

---

### 1. `FieldOverride<TValues>` — typed `depend` wrapper

Add a new exported type to `types/index.ts`:

```ts
/**
 * A per-field override entry used in the AutoFormProps `fields` prop.
 * Unlike the base FieldMeta, the `depend` callback here is typed to the
 * specific schema's inferred value type, providing full IDE autocomplete.
 */
export type FieldOverride<TValues = Record<string, unknown>> = Omit<
  Partial<FieldMeta>,
  'depend'
> & {
  depend?: (values: TValues) => FieldDependencyResult
}
```

Do **not** change `FieldMetaBase.depend`. It must remain `(values: Record<string, unknown>) => FieldDependencyResult` because `.meta({ depend: ... })` is defined on the Zod schema before any form context exists — there is no schema type available at that call site.

---

### 2. Update `AutoFormProps.fields`

In `types/index.ts`, change the `fields` property of `AutoFormProps<TSchema>`:

```ts
// BEFORE
fields?: Record<string, Partial<FieldMeta>>

// AFTER
fields?: Record<string, FieldOverride<z.infer<TSchema>>>
```

This is the only change to `AutoFormProps`. No other properties change.

**Internal compatibility note:** `FieldOverride<TValues>` is structurally a superset of `Partial<FieldMeta>` — the only distinction is a narrower `depend` signature. When passing the `fields` prop into `applyFieldOverrides` (which expects `Record<string, Partial<FieldMeta>>`), cast it:

```ts
applyFieldOverrides(
  rawFields,
  fieldOverridesProp as Record<string, Partial<FieldMeta>>,
)
```

This is safe: at runtime, the `depend` function is called with actual typed values (which satisfy the narrower signature). The cast only widens the compile-time view inside the internals where the schema type is not available.

---

### 3. `FormLabels` type

Add to `types/index.ts`:

```ts
// ---------------------------------------------------------------------------
// FormLabels
// ---------------------------------------------------------------------------

export type FormLabels = {
  /** Submit button text — default: "Submit" */
  submit?: string
  /** Array "Add item" button — default: "Add" */
  arrayAdd?: string
  /** Array "Remove row" button — default: "Remove" */
  arrayRemove?: string
  /** Array "Move row up" button — default: "↑" */
  arrayMoveUp?: string
  /** Array "Move row down" button — default: "↓" */
  arrayMoveDown?: string
  /** Array "Duplicate row" button — default: "Duplicate" */
  arrayDuplicate?: string
  /** Array "Collapse row" button — default: "▶" */
  arrayCollapse?: string
  /** Array "Expand row" button — default: "▼" */
  arrayExpand?: string
}
```

---

### 4. Thread `labels` through `AutoFormProps`, `AutoFormConfig`, and context

#### `AutoFormProps<TSchema>` (add one property)

```ts
/** Customize hard-coded UI text (submit button, array buttons, etc.) */
labels?: FormLabels
```

#### `AutoFormConfig` (add one property)

```ts
/** Default label strings; overridden per-instance by the `labels` prop */
labels?: FormLabels
```

#### `AutoFormContextValue` (add one property)

```ts
labels: FormLabels
```

**In `AutoForm.tsx`:** destructure `labels = {}` from props, pass it into the context value. No merging needed at the `AutoForm` level (merging happens in the factory — see §5).

**In `AutoFormContext.tsx`:** add `labels: FormLabels` to the `AutoFormContextValue` type and import `FormLabels`.

---

### 5. Factory merging in `createAutoForm.tsx`

Add label merging alongside the existing `messages` merging pattern:

```ts
const mergedLabels = React.useMemo(
  () =>
    props.labels || config.labels
      ? { ...config.labels, ...props.labels }
      : undefined,
  [props.labels],
)
```

Pass `labels={mergedLabels ?? {}}` through to `<AutoForm>`.

---

### 6. Consume labels in `DefaultSubmitButton`

`DefaultSubmitButton` must read from `AutoFormContext`:

```ts
import { useAutoFormContext } from '../../context/AutoFormContext'

export function DefaultSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  const { labels } = useAutoFormContext()
  return (
    <button type='submit' disabled={isSubmitting}>
      {labels.submit ?? 'Submit'}
    </button>
  )
}
```

The `LayoutSlots.submitButton` component type (`React.ComponentType<{ isSubmitting: boolean }>`) does **not** change — consumers who have replaced the submit button entirely are not affected. The labels flow through context, not props, so there is no breaking change to the `submitButton` slot interface.

---

### 7. Consume labels in `ArrayField`

`ArrayField` already uses `useAutoFormContext()`. Destructure `labels` from it:

```ts
const { ..., labels } = useAutoFormContext()
```

Replace every hard-coded button string with a `labels.*` lookup with the original string as the fallback:

| Current hard-coded string | Labels key                                                                        | Fallback      |
| ------------------------- | --------------------------------------------------------------------------------- | ------------- |
| `"Add"`                   | `labels.arrayAdd`                                                                 | `"Add"`       |
| `"Remove"`                | `labels.arrayRemove`                                                              | `"Remove"`    |
| `"↑"`                     | `labels.arrayMoveUp`                                                              | `"↑"`         |
| `"↓"`                     | `labels.arrayMoveDown`                                                            | `"↓"`         |
| `"Duplicate"`             | `labels.arrayDuplicate`                                                           | `"Duplicate"` |
| `"▶"` (collapse toggle)   | `labels.arrayCollapse` or `labels.arrayExpand` depending on the current row state | `"▶"` / `"▼"` |

Specifically for the collapse toggle, the current `ArrayField` uses a single string for both collapsed and expanded states. Use `labels.arrayCollapse` when the row is collapsible and collapsed, and `labels.arrayExpand` when it is expanded. Default remain `"▶"` and `"▼"` respectively.

---

### 8. Export `FieldOverride` and `FormLabels` from `index.ts`

Add to the public exports in `packages/core/src/index.ts`:

```ts
export type { FieldOverride } from './types'
export type { FormLabels } from './types'
```

---

### 9. Tests

Add **8 new tests** (108–115). All in the existing `AutoForm.test.tsx`.

#### Typed `depend` (compile-time only, 1 test)

- **108**: `fields` prop `depend` callback is called with the actual form values object. Assert the depend function is invoked and returns the correct override for a specific value. (Runtime parity: same behaviour as before — this test confirms nothing regressed.)

#### `labels` prop (7 tests)

- **109**: `labels.submit` changes the submit button text (query by text → assert new text visible, old text absent).
- **110**: `labels.arrayAdd` changes the array "Add" button text.
- **111**: `labels.arrayRemove` changes the array "Remove" button text.
- **112**: `labels.arrayMoveUp` and `labels.arrayMoveDown` change the move-button texts.
- **113**: `labels.arrayDuplicate` changes the duplicate button text.
- **114**: `labels.arrayCollapse` / `labels.arrayExpand` change the collapse/expand toggle text.
- **115**: `createAutoForm({ labels: { submit: 'Go' } })` sets factory-level labels; a per-instance `labels={{ submit: 'Send' }}` **overrides** the factory label (prop wins).

---

### 10. Playground — Example 17

Add **Example 17: Typed Dependencies & Custom Labels** to `apps/playground/src/App.tsx`.

**Sub-example A — Typed `depend` in `fields` prop:**
Use a schema with a `role` enum (`'admin' | 'user'`) and a `permissions` string field. In the `fields` prop, define `depend` on `permissions` — inside the callback, `values.role` should be fully typed (autocomplete in the editor). Show the `permissions` field only when `values.role === 'admin'`.

**Sub-example B — Custom labels (i18n simulation):**
Render a Spanish-language form variant. Pass `labels={{ submit: 'Enviar', arrayAdd: 'Agregar', arrayRemove: 'Eliminar', arrayMoveUp: '⬆', arrayMoveDown: '⬇', arrayDuplicate: 'Duplicar', arrayCollapse: '▶ Cerrar', arrayExpand: '▼ Abrir' }}` to an `AutoForm` with a hobbies array field. All buttons should display in Spanish.

**Sub-example C — Factory-level labels with per-instance override:**
Create a `createAutoForm({ labels: { submit: 'Save' } })` factory. Render two instances — one without a `labels` prop (shows "Save") and one with `labels={{ submit: 'Save & Close' }}` (prop wins, shows "Save & Close").

---

### 11. README / API reference updates

Update the `AutoFormProps` table to document the new `labels` prop and the typed `fields` entry. Update the `createAutoForm()` config table for `labels`. Add a new **"Customizing UI Text (i18n)"** recipe section showing the Spanish example from the playground. Add a note under `meta.depend` clarifying that when it is defined via the `fields` prop (rather than directly in the Zod schema), the `values` argument is fully typed to the schema's inferred type.

---

## Summary of Type Changes

| Location                  | Change                                                                     |
| ------------------------- | -------------------------------------------------------------------------- |
| `types/index.ts`          | Add `FieldOverride<TValues>` export                                        |
| `types/index.ts`          | Add `FormLabels` export                                                    |
| `types/index.ts`          | `AutoFormProps.fields` → `Record<string, FieldOverride<z.infer<TSchema>>>` |
| `types/index.ts`          | `AutoFormProps` → add `labels?: FormLabels`                                |
| `types/index.ts`          | `AutoFormConfig` → add `labels?: FormLabels`                               |
| `types/index.ts`          | `AutoFormContextValue` → add `labels: FormLabels`                          |
| `index.ts`                | Export `FieldOverride`, `FormLabels`                                       |
| `AutoForm.tsx`            | Destructure & forward `labels`; cast `fields` for internal use             |
| `createAutoForm.tsx`      | Merge `labels` (factory + prop)                                            |
| `AutoFormContext.tsx`     | Import and expose `FormLabels` in context value type                       |
| `DefaultSubmitButton.tsx` | Read `labels.submit` from context                                          |
| `ArrayField.tsx`          | Read all array label keys from context                                     |

No changes to `FieldMetaBase`, `FieldConfig`, `introspect.ts`, `FieldRenderer.tsx`, `resolveComponent.ts`, `useFieldDependencies.ts`, or any introspection tests.
