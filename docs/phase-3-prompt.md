# UniForm — Phase 3 Prompt: Layout & Styling Hooks

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phase 1 (Zod introspection) and Phase 2 (rendering engine) are complete — there are 16 passing integration tests, a recursive field renderer, default unstyled components, a component registry, and conditional field logic.

This prompt covers **Phase 3 only**: layout and styling hooks. This is what turns UniForm from a functional form generator into a truly customizable headless library — giving consumers full control over how fields are wrapped, grouped, styled, and laid out.

Before writing any code, read the existing types in `packages/core/src/types/index.ts`, the current `AutoForm.tsx`, `FieldRenderer.tsx`, `DefaultFieldWrapper.tsx`, and `AutoFormContext.tsx` to understand what already exists. Many of the types you need are already defined but not yet fully wired into the rendering pipeline.

---

## Current State (What Already Exists)

These types and plumbing are already in place but are **not yet fully utilized**:

### Types (`types/index.ts`)

```ts
type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
}

type LayoutSlots = {
  formWrapper?: React.ComponentType<{ children: React.ReactNode }>
  sectionWrapper?: React.ComponentType<{
    children: React.ReactNode
    title: string
  }>
  submitButton?: React.ComponentType<{ isSubmitting: boolean }>
}

type FormClassNames = {
  form?: string
  fieldWrapper?: string
  label?: string
  description?: string
  error?: string
}

type FieldMeta = {
  // ...other fields...
  section?: string // Groups fields into named sections
  order?: number // Controls field render order
  span?: number // Grid column span (for future grid layouts)
  hidden?: boolean // Statically hides the field
  condition?: FieldCondition // Dynamically hides the field
}
```

### Current Behavior

- **`fieldWrapper` prop**: `AutoForm` accepts an optional `fieldWrapper` prop and falls back to `DefaultFieldWrapper`. It's passed via context and used in `FieldRenderer` — but `DefaultFieldWrapper` ignores `classNames`.
- **`layout` slots**: `AutoForm` resolves `layout.formWrapper`, `layout.sectionWrapper`, and `layout.submitButton` with no-op defaults. `FormWrapper` and `SubmitButton` are rendered, but `sectionWrapper` is never used — fields are rendered as a flat list.
- **`classNames` prop**: Passed via context but never consumed by any component.
- **`useConditionalFields`**: Already filters by `hidden` and `condition`, and sorts by `order`. This is complete.
- **`section` meta**: Introspected from Zod `.meta()` but fields are never grouped by their `section` value.

---

## What to Build

### 1. Thread `classNames` Through Default Components

The `classNames` prop already reaches `AutoFormContext`. Now make the default components actually consume it.

**`DefaultFieldWrapper`** — read `classNames` from context and apply them:

```tsx
export function DefaultFieldWrapper({
  children,
  field,
  error,
}: FieldWrapperProps) {
  const { classNames } = useAutoFormContext()

  return (
    <div className={classNames.fieldWrapper}>
      <label htmlFor={field.name} className={classNames.label}>
        {field.label}
        {field.required && ' *'}
      </label>
      {children}
      {field.meta.description && (
        <p className={classNames.description}>
          {String(field.meta.description)}
        </p>
      )}
      {error && (
        <span role='alert' className={classNames.error}>
          {error}
        </span>
      )}
    </div>
  )
}
```

**`AutoForm`** — apply `classNames.form` to the `<form>` element:

```tsx
<form
  noValidate
  className={classNames.form}
  onSubmit={...}
>
```

This is a small change — but it's the minimum needed to let consumers style the form with CSS classes (Tailwind, CSS modules, etc.) without writing custom components.

---

### 2. Section Grouping

Fields with the same `meta.section` value should be grouped together and wrapped in the `sectionWrapper` layout slot. Fields without a `section` value should render ungrouped (before the sections, or as their own implicit group).

#### New Hook: `useSectionGrouping`

Create `packages/core/src/hooks/useSectionGrouping.ts`:

```ts
type SectionGroup = {
  title: string | null // null for the ungrouped/default section
  fields: FieldConfig[]
}

function useSectionGrouping(fields: FieldConfig[]): SectionGroup[]
```

**Behavior:**

- Return an array of `SectionGroup` objects
- Fields without a `section` meta value go into a group with `title: null`
- Fields with the same `section` string go into the same group
- Groups should appear in the order their first field appears in the input array (which is already sorted by `useConditionalFields`)
- The ungrouped section (if any) should come first
- This hook should be pure — just a `useMemo` over the input, no subscriptions

#### Wire Section Grouping into `AutoForm`

Replace the current flat field rendering in `AutoForm`:

```tsx
// Before (flat):
{
  visibleFields.map((field) => (
    <FieldRenderer key={field.name} field={field} control={control} />
  ))
}
```

With section-aware rendering:

```tsx
const sections = useSectionGrouping(visibleFields)
const SectionWrapper = resolvedLayout.sectionWrapper

// ...

{
  sections.map((section) => {
    const renderedFields = section.fields.map((field) => (
      <FieldRenderer key={field.name} field={field} control={control} />
    ))

    if (section.title === null) {
      // Ungrouped fields — render without a section wrapper
      return <React.Fragment key='__ungrouped'>{renderedFields}</React.Fragment>
    }

    return (
      <SectionWrapper key={section.title} title={section.title}>
        {renderedFields}
      </SectionWrapper>
    )
  })
}
```

#### Update `DefaultSectionWrapper`

The existing `DefaultSectionWrapper` is a no-op `<div>`. Replace it with a semantic implementation:

```tsx
function DefaultSectionWrapper({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <fieldset>
      <legend>{title}</legend>
      {children}
    </fieldset>
  )
}
```

---

### 3. Custom `fieldWrapper` Render Prop

The `fieldWrapper` prop is already wired end-to-end. But verify and ensure these edge cases are handled:

- When a consumer provides a custom `fieldWrapper`, it should receive `FieldWrapperProps` (`children`, `field`, `error`) and have full control over rendering. The default `className` logic from `DefaultFieldWrapper` should _not_ apply — the custom wrapper is fully in charge.
- `object` and `array` fields must **not** be wrapped in the `fieldWrapper`. This is already the case in `FieldRenderer` — verify it remains correct after all changes.
- If a consumer's `fieldWrapper` needs access to `classNames`, they can call `useAutoFormContext()` themselves — we don't need to pass it as a prop.

No code changes should be needed for this item if the existing implementation is correct — just verify it in tests.

---

### 4. Layout Slot Props — Full Wiring

Verify and ensure the three layout slots work correctly:

**`layout.formWrapper`** — wraps the entire form content (fields + submit button) inside the `<form>` tag. Already wired in `AutoForm`. Verify it receives and renders `children`.

**`layout.sectionWrapper`** — wraps each section group. Being wired in task #2 above.

**`layout.submitButton`** — renders the submit action. Already wired in `AutoForm`, receives `isSubmitting`. Verify it works when replaced with a custom component.

**All layout slots must have sensible defaults** so that `<AutoForm schema={s} onSubmit={fn} />` works with zero configuration. The defaults are already defined — just make sure the section wrapper default is upgraded from the no-op `<div>` to the semantic `<fieldset>` implementation.

---

### 5. `span` Support in `FieldWrapperProps` (Prepare for Grid Layouts)

Update `FieldWrapperProps` to include `span`:

```ts
type FieldWrapperProps = {
  children: React.ReactNode
  field: FieldConfig
  error?: string
  span?: number // NEW — from field.meta.span
}
```

Pass `field.meta.span` through in `FieldRenderer` when rendering the wrapper:

```tsx
<FieldWrapper field={effectiveField} error={error} span={field.meta.span}>
  {rendered}
</FieldWrapper>
```

The `DefaultFieldWrapper` should set a CSS custom property when `span` is provided, so consumers can use it in a grid layout:

```tsx
<div
  className={classNames.fieldWrapper}
  style={span ? { '--field-span': span } as React.CSSProperties : undefined}
>
```

This does **not** implement a full grid layout system — it just passes the `span` value through so consumers can use it with CSS Grid. For example:

```css
.form-grid {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
}
.form-grid > div {
  grid-column: span var(--field-span, 12);
}
```

---

### 6. Export New Hook

Add `useSectionGrouping` to the public exports in `packages/core/src/index.ts`.

---

## File Changes Summary

| File                                              | Change                                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/hooks/useSectionGrouping.ts`                 | **NEW** — section grouping hook                                                                    |
| `src/components/AutoForm.tsx`                     | Add `classNames.form` to `<form>`, use `useSectionGrouping`, render sections with `SectionWrapper` |
| `src/components/defaults/DefaultFieldWrapper.tsx` | Consume `classNames` from context, support `span` CSS custom property                              |
| `src/components/FieldRenderer.tsx`                | Pass `span` prop to `fieldWrapper`                                                                 |
| `src/types/index.ts`                              | Add `span` to `FieldWrapperProps`                                                                  |
| `src/index.ts`                                    | Export `useSectionGrouping`                                                                        |
| `src/components/AutoForm.test.tsx`                | Add new tests (see below)                                                                          |

---

## Integration Tests

Add the following tests to the existing `AutoForm.test.tsx`. Keep the existing 16 tests intact — add these as new numbered tests continuing the sequence.

### 17. `classNames.form` applies to the form element

Render `<AutoForm>` with `classNames={{ form: 'my-form' }}`. Assert the `<form>` element has `className="my-form"`.

### 18. `classNames.fieldWrapper` applies to the field wrapper div

Render with `classNames={{ fieldWrapper: 'field-wrap' }}`. Assert each field wrapper `<div>` has the class.

### 19. `classNames.label` applies to labels

Render with `classNames={{ label: 'my-label' }}`. Assert the `<label>` elements have the class.

### 20. `classNames.error` applies to error messages

Submit an invalid form. Assert the error `<span role="alert">` has the expected `className`.

### 21. `classNames.description` applies to description text

Define a field with `meta.description`. Assert the `<p>` element has the class from `classNames.description`.

### 22. Section grouping renders fields in section wrappers

Define a schema where some fields have `meta.section: 'Personal'` and others have `meta.section: 'Address'`. Assert that:

- Two `<fieldset>` wrappers are rendered (one per section)
- Each `<fieldset>` has a `<legend>` with the section title
- Fields are inside the correct section

### 23. Ungrouped fields render without a section wrapper

Define a schema with some sectioned and some unsectioned fields. Assert that unsectioned fields are **not** wrapped in a `<fieldset>`.

### 24. Custom `sectionWrapper` receives the correct `title` prop

Pass a custom `layout.sectionWrapper` component. Assert it's called with the correct `title` for each section.

### 25. Custom `formWrapper` wraps the form content

Pass a custom `layout.formWrapper` that renders a `<div data-testid="form-wrapper">`. Assert the fields and submit button are inside it.

### 26. Custom `submitButton` replaces the default

Pass a custom `layout.submitButton` that renders `<button>Go</button>`. Assert `Go` appears and the default `Submit` does not.

### 27. Custom `fieldWrapper` replaces the default wrapper

Pass a custom `fieldWrapper` that renders `<section data-testid="custom-wrapper">{children}</section>`. Assert scalar fields are wrapped in `<section>` elements.

### 28. Custom `fieldWrapper` does not wrap object/array fields

Render a schema with an object and array field while using a custom `fieldWrapper`. Assert the custom wrapper is **not** rendered around object or array fields.

### 29. `span` meta value is available as a CSS custom property

Define a field with `meta.span: 6`. Assert the field wrapper `<div>` has `style` containing `--field-span: 6`.

### 30. Fields without `span` have no inline style on the wrapper

Define a field without `meta.span`. Assert the wrapper `<div>` has no `style` attribute.

### 31. Section ordering follows field order

Define fields with `meta.order` values that interleave across sections. Assert sections appear in the order of their first field (after sorting by `order`), and fields within each section maintain their sorted order.

### 32. Empty sections are not rendered

Define a schema where all fields in one section have `meta.hidden: true`. Assert that section's wrapper is not rendered at all.

---

## Definition of Done for Phase 3

- [ ] `classNames` prop threads CSS class names through `<form>`, `DefaultFieldWrapper` labels, descriptions, and errors
- [ ] Fields with the same `meta.section` are grouped together
- [ ] Each section group is wrapped in `layout.sectionWrapper` (defaults to `<fieldset>` with `<legend>`)
- [ ] Ungrouped fields (no `section` meta) render before sections, without a section wrapper
- [ ] Custom `fieldWrapper` completely replaces the default — receives `FieldWrapperProps` including `span`
- [ ] Custom `layout.formWrapper` wraps all form content
- [ ] Custom `layout.sectionWrapper` replaces the default section wrapper
- [ ] Custom `layout.submitButton` replaces the default submit button
- [ ] `meta.span` passes through as a CSS custom property `--field-span` on the field wrapper
- [ ] All 16 existing Phase 2 tests still pass (no regressions)
- [ ] All 16 new Phase 3 tests (17–32) pass
- [ ] `useSectionGrouping` hook is exported publicly
- [ ] No TypeScript errors in strict mode
- [ ] ESLint passes with no errors

---

## Notes & Constraints

- Do not break any existing functionality. The 16 Phase 2 tests must remain green.
- Do not add CSS or any styling opinions. This is a headless library — only pass through class names and CSS custom properties.
- Do not implement a full grid layout system. Only pass `span` through so consumers can implement their own grid.
- Do not implement `createAutoForm()` factory — that is Phase 4.
- Do not add new dependencies.
- Keep all default components accessible — maintain existing `aria-*` attributes, `role="alert"`, and label associations.
