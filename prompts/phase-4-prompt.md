# UniForm — Phase 4 Prompt: Customization & DX

## Context

You are continuing work on **UniForm**, a headless React library that accepts a Zod V4 schema and renders a fully customizable form. Phases 1–3 are complete — there are 32 passing integration tests, a recursive field renderer, default unstyled components, a component registry with a 4-step resolution chain, conditional fields, section grouping, layout slots, and CSS class name threading.

This prompt covers **Phase 4 only**: customization and developer experience. This is what turns UniForm from a well-structured internal library into a production-ready tool — giving consumers a factory API for global config, robust per-field overrides, fully typed `onSubmit`, automatic coercion, and Zod custom validation messages.

Before writing any code, read the existing types in `packages/core/src/types/index.ts`, the current `AutoForm.tsx`, `FieldRenderer.tsx`, `ScalarField.tsx`, `AutoFormContext.tsx`, and `index.ts` (public exports) to make sure everything you build is consistent with what already exists.

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
}
```

### `AutoForm` Component

- Calls `introspectObjectSchema(schema)` memoized
- Merges `defaultRegistry` with user-provided `components`
- Applies field metadata overrides from the `fields` prop (flat merge into `field.meta`)
- Builds sensible empty defaults from introspected field types
- Uses `react-hook-form` with `zodResolver(schema)`
- Filters fields via `useConditionalFields()` (watches values, respects `hidden` and `condition`)
- Groups filtered fields via `useSectionGrouping()`
- Wraps everything in `AutoFormContextProvider` with `registry`, `fieldOverrides`, `fieldWrapper`, `layout`, `classNames`, `disabled`

### `ScalarField` Coercion

Currently hardcoded in `ScalarField.tsx`:

```ts
function coerce(type: string, value: unknown): unknown {
  if (type === 'number') return parseFloat(String(value))
  if (type === 'date') {
    const d = new Date(String(value))
    return isNaN(d.getTime()) ? value : d
  }
  return value
}
```

This works but doesn't handle edge cases like empty strings for numbers (results in `NaN` which Zod catches, but the UX is suboptimal).

### Component Resolution (`resolveComponent.ts`)

4-step fallback chain:

1. `meta.component` key in merged registry
2. `field.type` key in merged registry
3. `field.type` key in `defaultRegistry`
4. Returns `null` + `console.warn`

### Validation Messages

Currently, Zod error messages are displayed directly from `fieldState.error?.message`. There is no mechanism for consumers to customize error messages at the form level or per-field level.

---

## What to Build

### 1. `createAutoForm()` Factory

The centerpiece of Phase 4. This factory function lets consumers create a pre-configured `AutoForm` component with global defaults baked in — their design system's component library, their preferred layout, their class names — so they don't have to pass the same props on every form.

#### File: `packages/core/src/factory/createAutoForm.ts`

```ts
type AutoFormConfig = {
  components?: ComponentRegistry
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
}

function createAutoForm(config: AutoFormConfig): typeof AutoForm
```

**Behavior:**

- Returns a new React component with the same signature as `AutoForm`
- The returned component merges the factory config with per-instance props, with **instance props taking priority**
- Merging rules:
  - `components`: deep merge (instance overrides specific keys, factory provides defaults)
  - `fieldWrapper`: instance overrides factory entirely (no merging)
  - `layout`: shallow merge (instance slots override factory slots)
  - `classNames`: shallow merge (instance class names override factory class names)
  - `disabled`: instance overrides factory (`||` logic — if either is `true`, form is disabled)
  - `fields`, `schema`, `onSubmit`, `defaultValues`: always come from the instance (not configurable at the factory level)

**Example usage:**

```tsx
import { createAutoForm, DefaultInput } from '@uniform/core'

// Create a design-system-specific AutoForm
const MyAutoForm = createAutoForm({
  components: {
    string: MyTextInput,
    number: MyNumberInput,
    boolean: MyToggle,
    select: MyDropdown,
  },
  fieldWrapper: MyFieldWrapper,
  layout: {
    formWrapper: MyFormLayout,
    submitButton: MySubmitButton,
  },
  classNames: {
    form: 'my-form',
    fieldWrapper: 'my-field',
    label: 'my-label',
    error: 'my-error',
  },
})

// Then use it — no need to pass components, layout, etc. every time
<MyAutoForm schema={userSchema} onSubmit={handleSubmit} />

// Can still override per-instance
<MyAutoForm
  schema={adminSchema}
  onSubmit={handleAdminSubmit}
  components={{ string: MyAdminTextInput }} // overrides just the string component
/>
```

**Implementation approach:**

- Do NOT duplicate the `AutoForm` implementation. Instead, create a wrapper component (or modify `AutoForm` to accept a `config` parameter internally).
- The cleanest approach: `createAutoForm` returns a component that merges the factory config with instance props and passes the result to `AutoForm`.
- Export `AutoFormConfig` type.

---

### 2. Enhanced Per-Field Overrides via `fields` Prop

The `fields` prop already exists and partially works — it merges overrides into `field.meta`. But it's limited: overrides only apply to **top-level** fields and only affect `meta`.

Enhance the `fields` prop to support:

#### a. Deep Path Overrides

Support dot-notated paths for nested field overrides:

```tsx
<AutoForm
  schema={schema}
  onSubmit={fn}
  fields={{
    'address.street': { placeholder: 'Enter street address' },
    'address.city': { label: 'City / Town' },
    'contacts.0': { label: 'Primary Contact' }, // array item override
  }}
/>
```

**Implementation:** The existing `applyFieldOverrides` function in `AutoForm.tsx` currently does a flat lookup by `field.name`. Enhance it to:

1. Match against the full dot-notated `field.name` for nested fields
2. Recurse into `children` (for object fields) and `itemConfig` (for array fields) to apply overrides at all depths
3. Keep the existing flat behavior as a special case (top-level fields)

#### b. Component Override Per Field

The `fields` prop already supports `component` (since it's part of `FieldMeta`), which works through the existing resolution chain. Verify this works end-to-end and add a test for it:

```tsx
fields={{
  bio: { component: 'textarea' },
  role: { component: 'radio-group' },
}}
```

No code changes needed — just verify and test this existing capability.

---

### 3. Improved Coercion Handling

Replace the hardcoded `coerce` function in `ScalarField.tsx` with a more robust, extensible coercion system.

#### File: `packages/core/src/coercion/coerce.ts`

```ts
type CoercionMap = Record<string, (value: unknown) => unknown>

const defaultCoercionMap: CoercionMap = {
  number: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const num = Number(value)
    return isNaN(num) ? value : num
  },
  date: (value: unknown) => {
    if (value === '' || value === null || value === undefined) return undefined
    const d = new Date(String(value))
    return isNaN(d.getTime()) ? value : d
  },
  boolean: (value: unknown) => Boolean(value),
  string: (value: unknown) => (value == null ? '' : String(value)),
}

function coerceValue(
  type: string,
  value: unknown,
  customCoercions?: CoercionMap,
): unknown {
  const coercionFn = customCoercions?.[type] ?? defaultCoercionMap[type]
  if (!coercionFn) return value
  return coercionFn(value)
}
```

**Key improvements over the current implementation:**

- **Empty strings for numbers**: Returns `undefined` instead of `NaN`, so Zod's `required` validation triggers cleanly instead of showing a confusing "expected number, received nan" error
- **Empty strings for dates**: Same pattern — `undefined` instead of an invalid date
- **Boolean coercion**: Explicit `Boolean()` coercion, currently not needed (checkbox handles it) but good for completeness
- **String coercion**: Normalizes `null`/`undefined` to `''`
- **Extensible**: `customCoercions` param allows the factory or consumers to override coercion logic per type

#### Wire Coercion into the System

1. Update `ScalarField.tsx` to import and use `coerceValue` instead of the local `coerce` function
2. Add `coercions` as an optional field on `AutoFormConfig` (factory) and `AutoFormProps`
3. Pass `coercions` through `AutoFormContext` so `ScalarField` can access custom coercions
4. The merge order for coercions: instance `coercions` → factory `coercions` → `defaultCoercionMap`

#### Update Types

Add to `AutoFormProps`:

```ts
coercions?: Record<string, (value: unknown) => unknown>
```

Add to `AutoFormConfig`:

```ts
coercions?: Record<string, (value: unknown) => unknown>
```

Add to `AutoFormContextValue`:

```ts
coercions?: Record<string, (value: unknown) => unknown>
```

---

### 4. Custom Validation Messages

Add support for consumers to provide custom validation messages that override Zod's defaults. This is important for i18n and for providing user-friendly error text.

#### Approach: `messages` Prop

Add a `messages` prop to `AutoFormProps` that maps field names (or Zod error codes) to custom error strings:

```ts
type ValidationMessages = {
  required?: string // overrides "Required" for all required fields
  [fieldName: string]: string | Record<string, string> | undefined
}
```

**Usage:**

```tsx
<AutoForm
  schema={schema}
  onSubmit={fn}
  messages={{
    required: 'This field is required', // global override
    email: {
      required: 'Email is required', // per-field, per-code
      invalid_string: 'Invalid email format', // per-field, per-code
    },
    age: 'Please enter a valid age', // per-field catch-all
  }}
/>
```

**Implementation:**

This should work as a **post-processing step** on the errors from react-hook-form, not by modifying Zod schemas. The `FieldRenderer` (or a new utility used inside it) should:

1. Read the error from RHF's `formState.errors` for the current field (this already happens)
2. Look up the field name in `messages`:
   - If the value is a `string`, use it as the error message regardless of the error code
   - If the value is a `Record<string, string>`, look up the Zod error code (e.g. `'too_small'`, `'invalid_type'`, `'invalid_string'`). The error code is available on the RHF `FieldError` as `error.type`
3. Fall back to `messages.required` if the error type is `'too_small'` with `minimum: 1` (the common Zod required pattern) or if Zod reports the field as required
4. Fall back to the original Zod error message if no custom message matches

**Wire it through:**

1. Add `messages?: ValidationMessages` to `AutoFormProps`
2. Add `messages` to `AutoFormContextValue`
3. Pass through context in `AutoForm`
4. Create a utility `resolveErrorMessage(fieldName: string, error: FieldError | undefined, messages?: ValidationMessages): string | undefined` in a new file `packages/core/src/utils/resolveErrorMessage.ts`
5. Use this utility in `FieldRenderer` when extracting the error message to pass to the field wrapper

Add `messages` to `AutoFormConfig` as well, with the same merge pattern: instance messages shallow-merge over factory messages.

---

### 5. `onSubmit` Typing Verification

`onSubmit` already receives `z.infer<TSchema>` at the type level. Verify the runtime behavior is correct:

- The `handleSubmit` callback in `AutoForm` currently casts: `(values) => onSubmit(values as z.infer<TSchema>)`. Since `zodResolver` validates and parses the data before calling the success handler, this cast is safe — the values are genuinely the inferred type.
- **However**: verify that coerced values (numbers, dates) pass through correctly after the coercion improvements. Add a test that submits a form with a number field and a date field and asserts the `onSubmit` callback receives actual `number` and `Date` values (not strings).

No code changes expected — just verification via tests.

---

## File Changes Summary

| File                                    | Change                                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `src/factory/createAutoForm.ts`         | **NEW** — factory function                                                                   |
| `src/coercion/coerce.ts`                | **NEW** — coercion utilities                                                                 |
| `src/utils/resolveErrorMessage.ts`      | **NEW** — error message resolution                                                           |
| `src/types/index.ts`                    | Add `coercions` to `AutoFormProps`, add `AutoFormConfig` type, add `ValidationMessages` type |
| `src/components/AutoForm.tsx`           | Support `coercions` and `messages` props, pass through context                               |
| `src/components/fields/ScalarField.tsx` | Use `coerceValue` from coercion module                                                       |
| `src/components/FieldRenderer.tsx`      | Use `resolveErrorMessage` for error text                                                     |
| `src/context/AutoFormContext.tsx`       | Add `coercions` and `messages` to context value                                              |
| `src/index.ts`                          | Export `createAutoForm`, `AutoFormConfig`, `ValidationMessages`, coercion utilities          |
| `src/components/AutoForm.test.tsx`      | Add new tests (see below)                                                                    |

---

## Integration Tests

Add the following tests to the existing `AutoForm.test.tsx`. Keep the existing 32 tests intact — add these as new numbered tests continuing the sequence.

### 33. `createAutoForm` returns a working component with factory defaults

Create an `AutoForm` via `createAutoForm({ classNames: { form: 'factory-form' } })`. Render it with a simple schema. Assert the `<form>` has `className="factory-form"`.

### 34. `createAutoForm` factory components are used by default

Create with `createAutoForm({ components: { string: CustomInput } })`. Render a form with a string field. Assert `CustomInput` is rendered, not `DefaultInput`.

### 35. Instance props override factory defaults

Create with `createAutoForm({ classNames: { form: 'factory' } })`. Render with `classNames={{ form: 'instance' }}`. Assert the `<form>` has `className="instance"`.

### 36. Instance components merge with factory components

Create with `createAutoForm({ components: { string: FactoryInput } })`. Render with `components={{ number: InstanceNumberInput }}`. Assert string fields use `FactoryInput` and number fields use `InstanceNumberInput`.

### 37. Factory `disabled` OR instance `disabled` disables the form

Create with `createAutoForm({ disabled: true })`. Render without `disabled` prop. Assert all inputs are disabled.

### 38. Deep field overrides apply to nested fields

Define a schema with a nested object (`address: z.object({ street: z.string() })`). Pass `fields={{ 'address.street': { placeholder: 'Enter street' } }}`. Assert the nested input has `placeholder="Enter street"`.

### 39. Empty string number coercion returns `undefined` not `NaN`

Render a form with a required number field. Leave it empty and submit. Assert the validation error is a clean "Required" message (not "Expected number, received nan").

### 40. Number field coerces string to number on submit

Fill a number field with `"42"` and submit. Assert `onSubmit` receives `42` as a `number`, not the string `"42"`.

### 41. Date field coerces string to Date on submit

Fill a date field with a valid ISO date string and submit. Assert `onSubmit` receives a `Date` instance.

### 42. Custom coercion function is used

Pass `coercions={{ number: (v) => (v === '' ? null : Number(v)) }}`. Fill a number field with an empty string. Assert the value passed to validation is `null`, not `undefined`.

### 43. Per-field string message overrides error text

Pass `messages={{ name: 'Please enter your name' }}`. Submit with the field empty. Assert the error text is `"Please enter your name"`.

### 44. Per-field per-code message overrides specific errors

Pass `messages={{ email: { invalid_string: 'Bad email format' } }}`. Submit with an invalid email. Assert the error text is `"Bad email format"`.

### 45. Global `required` message overrides default required error

Pass `messages={{ required: 'This is mandatory' }}`. Submit with a required field empty. Assert the error text is `"This is mandatory"`.

### 46. Zod custom error messages from `.min()` / `.max()` pass through

Define `z.string().min(3, 'At least 3 characters')`. Submit with `"ab"`. Assert the error text is `"At least 3 characters"` (Zod's custom message takes priority when no `messages` override exists).

### 47. `createAutoForm` with `messages` merges with instance `messages`

Create with `createAutoForm({ messages: { required: 'Factory required' } })`. Render with `messages={{ name: 'Name needed' }}`. Assert a required name field shows `"Name needed"` and a required age field shows `"Factory required"`.

### 48. Field override `component` key works through resolution chain

Register a `textarea` component in `components`. Set `fields={{ bio: { component: 'textarea' } }}`. Assert the `textarea` component renders for the `bio` field.

---

## Definition of Done for Phase 4

- [ ] `createAutoForm()` factory returns a working component that merges global and instance config
- [ ] Factory `components` merge with instance `components` (instance keys override)
- [ ] Factory `layout`, `classNames`, `messages` shallow-merge with instance values
- [ ] Factory `disabled` uses OR logic with instance `disabled`
- [ ] `fields` prop supports dot-notated paths for nested field overrides
- [ ] Nested overrides apply recursively through object children and array item configs
- [ ] Coercion is extracted into a dedicated module with sane defaults for empty values
- [ ] Number fields: empty string → `undefined` (not `NaN`)
- [ ] Date fields: empty string → `undefined` (not invalid Date)
- [ ] Custom `coercions` prop allows per-type override at form and factory level
- [ ] `messages` prop supports global `required` override, per-field string, and per-field per-code messages
- [ ] Zod's own custom messages (from `.min()`, `.max()`, etc.) still display when no `messages` override exists
- [ ] `onSubmit` receives correctly typed and coerced values (numbers as `number`, dates as `Date`)
- [ ] All 32 existing tests still pass (no regressions)
- [ ] All 16 new tests (33–48) pass
- [ ] `createAutoForm`, `AutoFormConfig`, `ValidationMessages`, and coercion utilities are exported publicly
- [ ] No TypeScript errors in strict mode
- [ ] ESLint passes with no errors

---

## Notes & Constraints

- Do not break any existing functionality. The 32 Phase 1–3 tests must remain green.
- Do not add CSS or any styling opinions. This is a headless library.
- Do not implement union field rendering — that is out of scope.
- Do not add new dependencies.
- Keep the factory implementation thin — it should be a wrapper around `AutoForm`, not a parallel implementation.
- The `messages` system should be a convenience layer, not a replacement for Zod's validation. Zod remains the source of truth for what's valid — `messages` only controls how errors are displayed.
- Prefer composition and merging over complex inheritance patterns.
- Keep all default components accessible — maintain existing `aria-*` attributes, `role="alert"`, and label associations.
