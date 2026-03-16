# UniForm — Phase 6 Prompt: Advanced Form Control

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phases 1–5 are complete — there are 94 passing tests (34 introspection + 60 AutoForm), a recursive field renderer, unstyled default components, a component registry with a 4-step resolution chain, conditional fields, section grouping, layout slots, CSS class name threading, a `createAutoForm()` factory, pluggable coercion, custom validation messages, deep field overrides, full integration tests, CI/CD, and documentation.

This prompt covers **Phase 6 only**: advanced form control. This is what turns UniForm from a declarative-only library into one that supports imperative workflows — giving consumers programmatic control over form state, automatic persistence across page reloads, and a richer array field experience.

Before writing any code, read the existing types in `packages/core/src/types/index.ts`, the current `AutoForm.tsx`, `AutoFormContext.tsx`, `ArrayField.tsx`, `FieldRenderer.tsx`, and `index.ts` (public exports) to make sure everything you build is consistent with what already exists.

---

## Current State (What Already Exists)

### Types (`types/index.ts`)

```ts
type AutoFormProps<TSchema extends z.ZodObject<z.ZodRawShape>> = {
  schema: TSchema
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  defaultValues?: Partial<z.infer<TSchema>>
  components?: ComponentRegistry
  fields?: Record<string, Partial<FieldMeta>>
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
}

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

### `AutoForm` Component

- Calls `introspectObjectSchema(schema)` memoized
- Merges `defaultRegistry` with user-provided `components`
- Applies field metadata overrides from the `fields` prop (deep dot-notated paths)
- Builds sensible empty defaults from introspected field types
- Uses `react-hook-form` with `zodResolver(schema)` via `useForm`
- Filters fields via `useConditionalFields()` (watches values, respects `hidden` and `condition`)
- Groups filtered fields via `useSectionGrouping()`
- Wraps everything in `AutoFormContextProvider`
- Renders sections with `SectionWrapper`, ungrouped fields as fragments, `SubmitButton` at the end

### `ArrayField` Component

- Uses RHF's `useFieldArray` with `append` and `remove`
- Renders each row with a `FieldRenderer` + a "Remove" button
- Renders an "Add" button below all rows that calls `append(getDefaultValue(field.itemConfig))`
- No reordering, duplication, min/max enforcement, or collapsing support

### `AutoFormContext`

```ts
type AutoFormContextValue = {
  registry: ComponentRegistry
  fieldOverrides: Record<string, Partial<FieldMeta>>
  fieldWrapper: React.ComponentType<FieldWrapperProps>
  layout: Required<LayoutSlots>
  classNames: FormClassNames
  disabled: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
}
```

### Public Exports (`index.ts`)

Exports all types, `AutoForm`, `FieldRenderer`, all default components, registry utilities, `createAutoForm`, coercion utilities, hooks (`useConditionalFields`, `useSectionGrouping`), and context (`useAutoFormContext`).

### Test Count

94 passing tests — 34 introspection + 60 AutoForm integration tests.

---

## What to Build

### 1. Programmatic Control via Ref

Consumers need to programmatically interact with the form from outside the `<AutoForm>` component — reset it, submit it, set values, read values, set/clear errors, and focus specific fields. This is critical for wizard/step flows, external save buttons, and integration with surrounding UI.

#### New Type: `AutoFormHandle`

Add to `packages/core/src/types/index.ts`:

```ts
type AutoFormHandle<TValues = Record<string, unknown>> = {
  /** Reset the form to defaultValues (or provided values) */
  reset: (values?: Partial<TValues>) => void
  /** Programmatically trigger form submission */
  submit: () => void
  /** Set one or more field values */
  setValues: (values: Partial<TValues>) => void
  /** Get the current form values */
  getValues: () => TValues
  /** Set errors on specific fields */
  setErrors: (errors: Record<string, string>) => void
  /** Clear all errors, or errors on specific fields */
  clearErrors: (fieldNames?: string[]) => void
  /** Focus a specific field by name (dot-notated for nested fields) */
  focus: (fieldName: string) => void
}
```

#### Update `AutoForm` to Support `ref`

Convert `AutoForm` to use `React.forwardRef` (or the newer React 19 ref prop pattern if compatible). Expose the `AutoFormHandle` via `useImperativeHandle`:

```tsx
React.useImperativeHandle(ref, () => ({
  reset: (values) => {
    if (values) {
      rhf.reset({ ...rhf.getValues(), ...values })
    } else {
      rhf.reset()
    }
  },
  submit: () => {
    void rhf.handleSubmit((values) => onSubmit(values as z.infer<TSchema>))()
  },
  setValues: (values) => {
    for (const [key, val] of Object.entries(values)) {
      rhf.setValue(key, val, { shouldValidate: true, shouldDirty: true })
    }
  },
  getValues: () => rhf.getValues() as z.infer<TSchema>,
  setErrors: (errors) => {
    for (const [key, message] of Object.entries(errors)) {
      rhf.setError(key, { type: 'manual', message })
    }
  },
  clearErrors: (fieldNames) => {
    if (fieldNames) {
      rhf.clearErrors(fieldNames)
    } else {
      rhf.clearErrors()
    }
  },
  focus: (fieldName) => {
    rhf.setFocus(fieldName)
  },
}))
```

**Important:**

- The existing `useForm` destructuring in `AutoForm` currently extracts `{ control, handleSubmit, formState }`. You'll need to capture the full `useForm` return value (commonly named `methods` or `rhf`) to access `reset`, `setValue`, `getValues`, `setError`, `clearErrors`, `setFocus`.
- The `AutoForm` generic signature must be preserved — the ref's `TValues` should be `z.infer<TSchema>`.
- The `forwardRef` should use `React.forwardRef` with the correct generic parameters so consumers get typed refs.

#### Update `createAutoForm` Factory

The factory-returned component must also forward refs. Update `createAutoForm` to use `React.forwardRef` in its returned wrapper component, passing the ref through to the inner `AutoForm`.

#### Type Export

Export `AutoFormHandle` from `packages/core/src/index.ts`.

---

### 2. Form State Persistence

Add built-in support for persisting form values to storage (e.g. `localStorage`) so users don't lose their progress on page reload. This is a common requirement for long forms.

#### New Props on `AutoFormProps`

Add to `packages/core/src/types/index.ts`:

```ts
type PersistStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}
```

Add to `AutoFormProps`:

```ts
/** When set, form values are auto-saved to storage under this key */
persistKey?: string
/** Debounce interval in ms for persistence writes (default: 300) */
persistDebounce?: number
/** Custom storage adapter (default: localStorage) */
persistStorage?: PersistStorage
```

Do **not** add these to `AutoFormConfig` (factory) — persistence is inherently per-form-instance, not a global default.

#### New Hook: `useFormPersistence`

Create `packages/core/src/hooks/useFormPersistence.ts`:

```ts
function useFormPersistence(options: {
  control: Control
  key: string | undefined
  debounceMs: number
  storage: PersistStorage
  reset: (values: Record<string, unknown>) => void
  defaultValues: Record<string, unknown>
}): {
  clearPersistedData: () => void
}
```

**Behavior:**

1. **On mount**: If `key` is defined, attempt to read `storage.getItem(key)`. If data exists, parse it and call `reset({ ...defaultValues, ...parsedValues })` to restore the form state. Wrap in try/catch — storage may be unavailable or data may be corrupt.
2. **On value change**: Use RHF's `useWatch({ control })` to subscribe to all form values. When values change, debounce and write `JSON.stringify(values)` to `storage.setItem(key, ...)`. Use a `useEffect` with a `setTimeout`/`clearTimeout` pattern for debouncing.
3. **Return `clearPersistedData`**: A function that calls `storage.removeItem(key)`. `AutoForm` should call this after a successful `onSubmit`.
4. **When `key` is `undefined`**: The hook should be a no-op — no subscriptions, no reads, no writes.
5. **Storage default**: Default to `window.localStorage` but accept any `PersistStorage` adapter (for SSR safety, testing, or `sessionStorage`).

#### Wire into `AutoForm`

1. Call `useFormPersistence` inside `AutoForm`, passing the RHF `control`, `reset`, the persistence props, and the generated default values.
2. In the `onSubmit` handler, after a successful submission call `clearPersistedData()`.
3. For the default storage, use a safe getter that checks `typeof window !== 'undefined'` before accessing `localStorage` (SSR protection).

#### Edge Cases

- If `persistKey` is not provided, persistence is completely disabled — zero overhead.
- If the stored data has fields that no longer exist in the schema, they should be silently ignored (the deep merge with `defaultValues` handles this naturally).
- If `localStorage` is full or unavailable, the write should fail silently (catch errors).
- Date values: `JSON.stringify` converts `Date` to strings. On restore, coercion will handle converting them back. Document this behavior.

---

### 3. Array Field Enhancements

The current `ArrayField` supports basic add/remove. Enhance it with reordering, duplication, min/max constraints, and collapsible rows.

#### a. Reorder Rows

Use RHF's `useFieldArray` `move(from, to)` method to support row reordering.

**Default UI**: Add "Move Up" and "Move Down" buttons next to each row:

```tsx
<button type="button" onClick={() => move(index, index - 1)} disabled={index === 0}>
  ↑
</button>
<button type="button" onClick={() => move(index, index + 1)} disabled={index === rows.length - 1}>
  ↓
</button>
```

Disable "Move Up" on the first row and "Move Down" on the last row.

#### b. Duplicate Row

Use RHF's `useFieldArray` `insert(index, value)` method to duplicate a row:

```tsx
<button type='button' onClick={() => insert(index + 1, rows[index])}>
  Duplicate
</button>
```

This copies the current row's values and inserts them immediately after.

#### c. Min/Max Constraints from Zod

The Zod introspection layer already walks array types. Enhance it to extract `minLength` and `maxLength` from the `ZodArray` definition.

**Update `FieldConfig`**: Add optional `minItems` and `maxItems` fields:

```ts
type FieldConfig = {
  // ...existing fields...
  minItems?: number // from z.array().min(n)
  maxItems?: number // from z.array().max(n)
}
```

**Update introspection** (`introspect.ts`): When processing a `ZodArray`, inspect `._def.minLength` and `._def.maxLength` (or the Zod V4 equivalent — check the actual Zod v4 schema structure for how `.min()` and `.max()` are stored on arrays) and populate `minItems` / `maxItems` on the `FieldConfig`.

**Update `ArrayField`**: Use these constraints to:

- Disable the "Add" button when `rows.length >= maxItems`
- Disable each row's "Remove" button when `rows.length <= minItems`
- Disable the "Duplicate" button when `rows.length >= maxItems`

#### d. Collapsible Array Rows

For complex array items (objects with multiple fields), allow rows to be collapsed to save screen space. Each row should:

1. Have a collapse/expand toggle button
2. When collapsed, show a **summary line** instead of the full form fields
3. When expanded, show the full form fields (current behavior)

**Summary text**: Derive from the first string or number field in the item's children, or fall back to `"Item {index + 1}"`. The summary should update reactively as the user types.

**State**: Track collapsed state locally in `ArrayField` with a `Set<number>` of collapsed indices. All rows start expanded by default.

**Default UI**:

```tsx
<button type="button" onClick={() => toggleCollapse(index)}>
  {isCollapsed ? '▶' : '▼'} {isCollapsed ? summary : `Item ${index + 1}`}
</button>
{!isCollapsed && (
  <FieldRenderer ... />
)}
```

**Important**: The collapse toggle should only render for array items that are objects (have children). Scalar array items should always be fully visible.

#### e. Update Default Array Field Layout

Reorganize the default `ArrayField` to have a cleaner structure:

```tsx
<div>
  <label>{field.label}</label>
  {rows.map((row, index) => (
    <div key={row.id}>
      {/* Collapse toggle (only for object items) */}
      {/* Row content or summary */}
      <div>
        <button type='button'>↑</button>
        <button type='button'>↓</button>
        <button type='button'>Duplicate</button>
        <button type='button'>Remove</button>
      </div>
    </div>
  ))}
  <button type='button' disabled={atMax}>
    Add
  </button>
</div>
```

Each action button should have a descriptive `aria-label` for accessibility, e.g. `aria-label="Move item 1 up"`, `aria-label="Remove item 2"`.

---

## File Changes Summary

| File                                   | Change                                                                                                                                                                                                |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/types/index.ts`                   | Add `AutoFormHandle`, `PersistStorage`, `ArrayRowLayoutProps`, `ResolvedLayoutSlots`, persistence props to `AutoFormProps`, `minItems`/`maxItems` to `FieldConfig`, `arrayRowLayout` to `LayoutSlots` |
| `src/components/AutoForm.tsx`          | Add `forwardRef` + `useImperativeHandle`, wire persistence hook, call `clearPersistedData` on submit, add `DefaultArrayRowLayout`                                                                     |
| `src/factory/createAutoForm.ts`        | Forward ref through factory wrapper                                                                                                                                                                   |
| `src/hooks/useFormPersistence.ts`      | **NEW** — persistence hook with debounced storage sync                                                                                                                                                |
| `src/components/fields/ArrayField.tsx` | Add move/duplicate/min-max/collapse features                                                                                                                                                          |
| `src/introspection/introspect.ts`      | Extract `minLength`/`maxLength` from `ZodArray` into `FieldConfig`                                                                                                                                    |
| `src/context/AutoFormContext.tsx`      | No changes needed                                                                                                                                                                                     |
| `src/index.ts`                         | Export `AutoFormHandle`, `PersistStorage`, `useFormPersistence`                                                                                                                                       |
| `src/components/AutoForm.test.tsx`     | Add new tests (see below)                                                                                                                                                                             |
| `src/introspection/introspect.test.ts` | Add array min/max introspection tests                                                                                                                                                                 |

---

## Integration Tests

Add the following tests to the existing `AutoForm.test.tsx`. Keep the existing 60 tests intact — add these as new numbered tests continuing the sequence.

### Programmatic Control via Ref

#### 61. `ref.reset()` resets the form to default values

Render `<AutoForm>` with a ref. Fill a field. Call `ref.current.reset()`. Assert the field is back to its default value.

#### 62. `ref.submit()` triggers form submission programmatically

Render with a ref and fill all required fields. Call `ref.current.submit()` without clicking the submit button. Assert `onSubmit` is called with the correct values.

#### 63. `ref.setValues()` sets field values

Render with a ref. Call `ref.current.setValues({ name: 'Test' })`. Assert the name input displays `"Test"`.

#### 64. `ref.getValues()` returns current form values

Render with a ref. Fill a field with `"hello"`. Call `ref.current.getValues()`. Assert the return value includes the filled field.

#### 65. `ref.setErrors()` displays errors on fields

Render with a ref. Call `ref.current.setErrors({ name: 'Custom error' })`. Assert the error message `"Custom error"` is visible.

#### 66. `ref.clearErrors()` clears all errors

Render with a ref. Call `ref.current.setErrors({ name: 'Err' })`. Then call `ref.current.clearErrors()`. Assert no errors are visible.

#### 67. `ref.clearErrors(['name'])` clears only the specified field's error

Set errors on two fields. Call `ref.current.clearErrors(['name'])`. Assert the name error is cleared but the other remains.

#### 68. `ref.focus()` focuses the specified field

Render with a ref. Call `ref.current.focus('email')`. Assert the email input is the active element.

#### 69. Ref works with `createAutoForm` factory

Create a factory component. Render it with a ref. Call `ref.current.getValues()`. Assert it returns form values.

### Form State Persistence

#### 70. Form values are persisted to storage on change

Render with `persistKey="test-form"` and a mock storage adapter. Type in a field. Wait for the debounce. Assert `storage.setItem` was called with `"test-form"` and the serialized form values.

#### 71. Persisted values are restored on mount

Pre-populate mock storage with `"test-form"` → `{ name: "Saved" }`. Render with `persistKey="test-form"`. Assert the name field displays `"Saved"`.

#### 72. Persisted data is cleared after successful submit

Render with `persistKey="test-form"` and a mock storage adapter. Fill and submit. Assert `storage.removeItem` was called with `"test-form"`.

#### 73. Invalid stored data is handled gracefully

Set `storage.getItem` to return invalid JSON (`"not json"`). Render with `persistKey="test-form"`. Assert the form renders with default values (no crash).

#### 74. `persistDebounce` controls write frequency

Render with `persistKey="test"`, `persistDebounce={500}`, and a mock storage. Type rapidly in a field. Assert `setItem` is not called after each keystroke but is called once after 500ms of inactivity.

#### 75. No persistence when `persistKey` is not provided

Render without `persistKey` and with a mock storage. Type in a field. Assert `storage.setItem` is never called.

### Array Field Enhancements

#### 76. "Move Up" reorders array rows

Render a form with an array field. Add two rows and fill them with different values. Click "Move Up" (↑) on the second row. Assert the rows are now in reversed order.

#### 77. "Move Down" reorders array rows

Render a form with an array field containing two filled rows. Click "Move Down" (↓) on the first row. Assert the rows swap positions.

#### 78. "Move Up" is disabled on the first row

Render with an array field. Assert the "Move Up" button on the first row is disabled.

#### 79. "Move Down" is disabled on the last row

Render with an array field. Assert the "Move Down" button on the last row is disabled.

#### 80. "Duplicate" copies a row's values

Render with an array field. Fill the first row. Click "Duplicate". Assert a new row appears with the same values as the first row.

#### 81. "Add" is disabled when at `maxItems`

Define `z.array(…).max(2)`. Add two rows. Assert the "Add" button is disabled.

#### 82. "Remove" is disabled when at `minItems`

Define `z.array(…).min(1)`. Render with one row. Assert the "Remove" button is disabled.

#### 83. Collapsible rows — toggle collapse hides/shows fields

Render an array of objects. Assert all fields are visible (expanded). Click the collapse toggle on the first row. Assert the row's fields are hidden and a summary is shown.

#### 84. Collapsible rows — summary shows first string field value

Render an array of objects with a `name` field. Fill the first row's name as `"Alice"`. Collapse the row. Assert the summary text contains `"Alice"`.

#### 85. Scalar array items are not collapsible

Render an array of strings (scalar items). Assert no collapse toggle is rendered.

#### 86. Array `minItems`/`maxItems` are extracted by introspection

Define `z.array(z.string()).min(1).max(5)`. Introspect. Assert the `FieldConfig` has `minItems: 1` and `maxItems: 5`.

#### 87–91. Array button classNames

Tests 87–91 cover `classNames.arrayAdd`, `arrayRemove`, `arrayMove`, `arrayDuplicate`, and `arrayCollapse` applying the correct CSS class to each button.

#### 92–95. Custom `layout.arrayRowLayout`

92. Default `arrayRowLayout` renders the remove button normally.
93. Custom `arrayRowLayout` receives `buttons` and `children` props — verify buttons render inside custom wrapper elements.
94. Custom `arrayRowLayout` receives `index` and `rowCount` — verify they reflect row positions.
95. Custom `arrayRowLayout` receives move buttons when `movable` is set — verify reordering still works through the custom layout.

### Introspection Tests

Add to `packages/core/src/introspection/introspect.test.ts`:

#### 35. Array `.min()` extracts `minItems`

Define `z.array(z.string()).min(2)`. Introspect. Assert `minItems === 2`.

#### 36. Array `.max()` extracts `maxItems`

Define `z.array(z.string()).max(10)`. Introspect. Assert `maxItems === 10`.

#### 37. Array with both `.min()` and `.max()` extracts both

Define `z.array(z.object({ name: z.string() })).min(1).max(3)`. Introspect. Assert `minItems === 1` and `maxItems === 3`.

#### 38. Array without constraints has no `minItems`/`maxItems`

Define `z.array(z.string())`. Introspect. Assert `minItems` and `maxItems` are both `undefined`.

---

## Definition of Done for Phase 6

- [ ] `AutoForm` accepts a `ref` prop and exposes `AutoFormHandle` methods via `useImperativeHandle`
- [ ] `ref.reset()`, `ref.submit()`, `ref.setValues()`, `ref.getValues()`, `ref.setErrors()`, `ref.clearErrors()`, `ref.focus()` all work correctly
- [ ] `createAutoForm` factory forwards refs to the inner `AutoForm`
- [ ] `persistKey` prop enables automatic form value persistence to storage
- [ ] Persisted values are restored on mount and cleared on successful submit
- [ ] `persistDebounce` controls write frequency (default 300ms)
- [ ] `persistStorage` allows pluggable storage adapters
- [ ] Persistence is a no-op when `persistKey` is not provided
- [ ] Invalid stored data is handled gracefully (no crash)
- [ ] Array fields support "Move Up" / "Move Down" row reordering
- [ ] Array fields support "Duplicate" to copy a row
- [ ] Array fields respect `minItems` / `maxItems` from Zod `.min()` / `.max()`
- [ ] "Add" is disabled at `maxItems`, "Remove" is disabled at `minItems`
- [ ] Object array rows can be collapsed/expanded with a summary line
- [ ] Scalar array items are not collapsible
- [ ] Array move, duplicate, and collapse buttons are opt-in via `movable`, `duplicable`, `collapsible` meta flags
- [ ] Array buttons can be styled via `classNames.arrayAdd`, `arrayRemove`, `arrayMove`, `arrayDuplicate`, `arrayCollapse`
- [ ] Custom array row layout via `layout.arrayRowLayout` — receives `children`, `buttons`, `index`, `rowCount`; default component preserves current behavior
- [ ] `ArrayRowLayoutProps` type is exported publicly
- [ ] `meta.depend` — reactive per-field override of `options`, `hidden`, `disabled`, `label`, `placeholder`, `description` via `(values) => FieldDependencyResult`
- [ ] `onValuesChange` prop fires on every field change with full typed form values; used with `ref.setValues()` for value cascade
- [ ] `FieldDependencyResult`, `useFieldDependencies` are exported publicly
- [ ] Introspection extracts `minItems` / `maxItems` from `ZodArray`
- [ ] All 94 existing tests still pass (no regressions)
- [ ] All 44 new AutoForm tests (61–104) pass
- [ ] All 4 new introspection tests (35–38) pass
- [ ] `AutoFormHandle`, `PersistStorage`, `ArrayRowLayoutProps`, `FieldDependencyResult`, `useFieldDependencies`, and `useFormPersistence` are exported publicly
- [ ] No TypeScript errors in strict mode

---

## Notes & Constraints

- Do not break any existing functionality. The 94 Phase 1–5 tests must remain green.
- Do not add CSS or any styling opinions. This is a headless library — keep all new UI unstyled.
- Do not add new dependencies. Everything should be built with React, react-hook-form, and Zod primitives.
- The `forwardRef` implementation must preserve the existing generic `TSchema` parameter on `AutoForm`.
- Persistence must be opt-in (zero overhead when `persistKey` is not set) and SSR-safe (don't access `window` at the module level).
- Array reorder/duplicate buttons should have accessible `aria-label` attributes.
- Keep the collapse state local to `ArrayField` — it should not be persisted or exposed externally.
- Use `useWatch` (not `watch`) for the persistence subscription to avoid unnecessary re-renders.
- The `move` and `insert` methods are already available from `useFieldArray` — you do not need to implement them manually.
- Keep all default components accessible — maintain existing `aria-*` attributes, `role="alert"`, and label associations.
