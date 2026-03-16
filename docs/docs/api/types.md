---
title: TypeScript API
sidebar_position: 4
---

# TypeScript API

All public types are re-exported from `@uniform/core`.

```ts
import type {
  AutoFormProps,
  AutoFormHandle,
  UniForm,
  UniFormContext,
  FieldOverride,
  LayoutSlots,
  ResolvedLayoutSlots,
  ComponentRegistry,
  FieldComponent,
  FieldComponentProps,
  FormClassNames,
  ValidationMessages,
  FormLabels,
  CoercionMap,
  PersistStorage,
} from '@uniform/core'
```

---

## `AutoFormProps<TSchema>`

The full set of props accepted by `<AutoForm>`.

```ts
type AutoFormProps<TSchema extends z.ZodObject<any>> = {
  form: UniForm<TSchema>
  onSubmit: (values: z.infer<TSchema>) => void | Promise<void>
  defaultValues?:
    | Partial<z.infer<TSchema>>
    | (() => Promise<Partial<z.infer<TSchema>>>)
  components?: ComponentRegistry
  fields?: Record<string, Partial<FieldOverride>>
  fieldWrapper?: React.ComponentType<FieldWrapperProps>
  layout?: LayoutSlots
  classNames?: FormClassNames
  disabled?: boolean
  coercions?: CoercionMap
  messages?: ValidationMessages
  ref?: React.Ref<AutoFormHandle<TSchema>>
  persistKey?: string
  persistDebounce?: number
  persistStorage?: PersistStorage
  onValuesChange?: (values: z.infer<TSchema>) => void
  labels?: FormLabels
}
```

---

## `AutoFormHandle<TSchema>`

The object exposed via `React.useRef<AutoFormHandle>`. Extends React Hook Form's `UseFormReturn`.

```ts
type AutoFormHandle<TSchema extends z.ZodObject<any>> = UseFormReturn<
  z.infer<TSchema>
> & {
  isSubmitting: boolean
}
```

**Methods inherited from `UseFormReturn`:** `setValue`, `getValue`, `getValues`, `setError`, `clearErrors`, `reset`, `trigger`, `watch`, `control`, `formState`, …

---

## `UniForm<TSchema>`

The object returned by `createForm()`.

```ts
type UniForm<TSchema extends z.ZodObject<any>> = {
  schema: TSchema
  setOnChange: (
    field: FieldPath<z.infer<TSchema>>,
    handler: (value: any, ctx: UniFormContext<TSchema>) => void | Promise<void>,
  ) => void
  setCondition: (
    field: FieldPath<z.infer<TSchema>>,
    predicate: (values: z.infer<TSchema>) => boolean,
  ) => void
}
```

---

## `UniFormContext<TSchema>`

Passed as the second argument to every `setOnChange` handler.

```ts
type UniFormContext<TSchema extends z.ZodObject<any>> = {
  value: unknown
  setValue: UseFormSetValue<z.infer<TSchema>>
  getValues: UseFormGetValues<z.infer<TSchema>>
  formMethods: UseFormReturn<z.infer<TSchema>>
}
```

---

## `FieldOverride`

Per-field metadata override. All properties are optional.

```ts
type FieldOverride = {
  label?: string
  description?: string
  placeholder?: string
  order?: number
  span?: number // 1–12 column span in 12-col grid
  section?: string // Group into a named section
  hidden?: boolean // Hard-hide (never renders, never validates)
  disabled?: boolean
  component?: string // Registry key override (e.g. "textarea")
  options?: Array<{ label: string; value: string }>
}
```

---

## `LayoutSlots`

Slots for replacing structural chrome components.

```ts
type LayoutSlots = {
  formWrapper?: React.ComponentType<FormWrapperProps>
  sectionWrapper?: React.ComponentType<SectionWrapperProps>
  submitButton?: React.ComponentType<SubmitButtonProps>
  arrayRowLayout?: React.ComponentType<ArrayRowLayoutProps>
  loadingFallback?: React.ReactNode
}
```

---

## `ComponentRegistry`

Maps field-type keys to React components (`FieldComponent = React.ComponentType<FieldProps>`).

```ts
type ComponentRegistry = {
  string?: FieldComponent
  number?: FieldComponent
  boolean?: FieldComponent
  date?: FieldComponent
  enum?: FieldComponent
  array?: FieldComponent
  object?: FieldComponent
  [key: string]: FieldComponent | undefined
}
```

---

## `FieldProps`

The props passed to every custom field component. UniForm calls your component with these.

```ts
type FieldProps = {
  name: string
  value: unknown
  onChange: (value: unknown) => void
  onBlur: () => void
  ref: RefCallBack
  label: string
  placeholder?: string
  description?: string
  error?: string
  required: boolean
  disabled?: boolean
  options?: SelectOption[]
  meta: FieldMeta
}

type FieldComponent = React.ComponentType<FieldProps>
```

---

## `FormMethods`

All programmatic form control methods, available on both `AutoFormHandle` (ref) and inside `setOnChange` handlers via `UniFormContext`.

```ts
type FormMethods<TValues> = {
  setValue: (
    name: FieldPath<TValues>,
    value: FieldPathValue<TValues, FieldPath<TValues>>,
  ) => void
  setValues: (values: Partial<TValues>) => void
  getValues: () => TValues
  resetField: (name: FieldPath<TValues>) => void
  reset: (values?: Partial<TValues>) => void
  setError: (name: FieldPath<TValues>, message: string) => void
  setErrors: (errors: Partial<Record<FieldPath<TValues>, string>>) => void
  clearErrors: (names?: FieldPath<TValues> | FieldPath<TValues>[]) => void
  submit: () => void
  focus: (fieldName: FieldPath<TValues>) => void
  watch: (() => TValues) &
    (<K extends FieldPath<TValues>>(name: K) => FieldPathValue<TValues, K>)
}
```

---

## `FormClassNames`

CSS class overrides for structural elements.

```ts
type FormClassNames = {
  form?: string
  fieldWrapper?: string
  label?: string
  error?: string
  description?: string
  section?: string
  sectionTitle?: string
}
```

---

## `ValidationMessages`

Override or internationalise Zod error messages.

```ts
type ValidationMessages = {
  required?: string
  minLength?: (min: number) => string
  maxLength?: (max: number) => string
  min?: (min: number) => string
  max?: (max: number) => string
  email?: string
  url?: string
  pattern?: string
  custom?: (message: string) => string
}
```

---

## `FormLabels`

Override hard-coded UI strings.

```ts
type FormLabels = {
  submit?: string
  addItem?: string
  removeItem?: string
  moveUp?: string
  moveDown?: string
  duplicate?: string
}
```

---

## `PersistStorage`

Interface for custom storage adapters.

```ts
type PersistStorage = {
  getItem: (key: string) => string | null | Promise<string | null>
  setItem: (key: string, value: string) => void | Promise<void>
  removeItem: (key: string) => void | Promise<void>
}
```

The default implementation uses `window.sessionStorage`. Pass `persistStorage={localStorage}` to use local storage.

---

## `CoercionMap`

Per-type value coercion functions applied before React Hook Form processes the value.

```ts
type CoercionMap = {
  number?: (value: unknown) => number | undefined
  boolean?: (value: unknown) => boolean
  date?: (value: unknown) => Date | undefined
  [key: string]: ((value: unknown) => unknown) | undefined
}
```
