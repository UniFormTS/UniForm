---
title: useUniForm()
sidebar_position: 6
---

# `useUniForm()`

`useUniForm(form, options)` builds the form store **above** `<AutoForm>`: the react-hook-form instance, the Zod resolver, the introspected field configs, the component registry and the persistence wiring.

Use it when the application owns the page layout. See the [Headless Mode guide](/docs/guides/headless) for the full picture.

```tsx
import { AutoForm, useUniForm, UniFormProvider } from '@uniform-ts/core'

function TicketPage() {
  const form = useUniForm(ticketForm, {
    defaultValues,
    onSubmit: (values) => save(values),
  })

  return (
    <UniFormProvider form={form}>
      <PageHeader onSave={form.submit} busy={form.isSubmitting} />
      <AutoForm form={form} />
    </UniFormProvider>
  )
}
```

## Signature

```ts
function useUniForm<TSchema extends z.$ZodObject>(
  form: { readonly schema: TSchema },
  options?: UseUniFormOptions<TSchema>,
): UniFormInstance<TSchema>
```

## Options

`UseUniFormOptions` mirrors the state-level half of `AutoFormProps`:

| Option            | Type                                                       | Description                                                                              |
| ----------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `defaultValues`   | `Partial<Values> \| () => Promise<Partial<Values>>`        | Initial values, or an async loader                                                       |
| `onSubmit`        | `(values) => void \| Promise<void>`                        | Called with validated values by `form.submit()`                                          |
| `components`      | `ComponentRegistry`                                        | Component registry for this instance                                                     |
| `fields`          | `Record<path, FieldOverride>`                              | Per-field overrides                                                                      |
| `fieldWrapper`    | `React.ComponentType<FieldWrapperProps>`                   | Wrapper around every leaf field                                                          |
| `layout`          | `LayoutSlots`                                              | Layout slot overrides                                                                    |
| `classNames`      | `FormClassNames`                                           | CSS class overrides                                                                      |
| `disabled`        | `boolean`                                                  | Disable every field                                                                      |
| `coercions`       | `CoercionMap`                                              | Coercion overrides                                                                       |
| `messages`        | `ValidationMessages`                                       | Validation message overrides                                                             |
| `labels`          | `FormLabels`                                               | UI string overrides                                                                      |
| `persistKey`      | `string`                                                   | Auto-save draft key                                                                      |
| `persistDebounce` | `number`                                                   | Debounce for persistence writes (default `300`)                                          |
| `persistStorage`  | `PersistStorage`                                           | Storage adapter (default `sessionStorage`)                                               |
| `persistVersion`  | `number`                                                   | Version stamped on the draft (default `0`) — see [Persistence](/docs/guides/persistence) |
| `persistMigrate`  | `(persisted, fromVersion) => Partial<Values> \| undefined` | Upgrade an older draft; return `undefined` to discard it                                 |
| `persistExclude`  | `DeepKeys<Values>[]`                                       | Dot paths never written to storage (passwords, card numbers, tokens)                     |
| `onValuesChange`  | `(values) => void`                                         | Called once on mount and on every value change                                           |
| `getOptionKey`    | `GetOptionKey`                                             | Form-wide option key derivation for selects; per-field `meta` wins                       |
| `isOptionEqual`   | `IsOptionEqual`                                            | Form-wide option equality for selects; per-field `meta` wins                             |

## Returns

### `UniFormInstance`

| Property             | Type                  | Description                                                            |
| -------------------- | --------------------- | ---------------------------------------------------------------------- |
| `schema`             | `TSchema`             | The schema this instance was built from                                |
| `methods`            | `FormMethods<Values>` | Typed programmatic control — same shape as the `ref` handle            |
| `control`            | `Control<Values>`     | The underlying react-hook-form control                                 |
| `submit`             | `(event?) => void`    | Validate and submit — identical to pressing the rendered submit button |
| `isSubmitting`       | `boolean`             | Whether a submission is in flight                                      |
| `isLoading`          | `boolean`             | `true` while an async `defaultValues` loader is pending                |
| `clearPersistedData` | `() => void`          | Remove the persisted draft                                             |

## Notes

- `<AutoForm form={instance}>` renders into the instance's store; it never creates a second one.
- `onSubmit` is optional on `<AutoForm>` in instance mode. When given, it **wins** over `useUniForm({ onSubmit })` for as long as that `<AutoForm>` is mounted, so the rendered button and an external one run the same handler; once it unmounts, `form.submit()` falls back to the `useUniForm` handler.
- In instance mode, `<AutoForm>` still honours `fields`, `layout`, `classNames`, `fieldWrapper`, `components`, `disabled`, `labels`, `messages` and `coercions`, merging them over the instance's configuration. Its `fields` are applied **beneath** UniForm's own `setOnChange` handlers, `setCondition` predicates and `setFieldMeta` output, exactly as on `useUniForm`.
- Store-level props — `defaultValues`, `persist*`, `onValuesChange`, `getOptionKey`, `isOptionEqual` — and the `condition` / `requiredWhen` overrides are **type errors** on `<AutoForm form={instance}>`. Set them on `useUniForm` (or on the `UniForm` definition) instead.
- Persistence belongs to the **instance**, not to a mounted `<AutoForm>` — a draft survives for as long as the component that called `useUniForm` is mounted.
- While `isLoading` is `true`, render your own placeholder (or let `<AutoForm>` render `layout.loadingFallback`).

See also: [`<UniFormProvider>`](./uniform-provider), [`useFormValue()`](./use-form-value), [`<Field>`](./field), [Headless Mode guide](/docs/guides/headless).
