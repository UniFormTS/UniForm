---
title: <AutoForm> Props
sidebar_position: 1
---

# `<AutoForm>` Props

`<AutoForm>` introspects the provided Zod schema, renders the appropriate field component for each field type, validates on submit using `zodResolver`, and calls `onSubmit` with fully typed, validated values.

```tsx
import { AutoForm, createForm } from '@uniform/core'

const myForm = createForm(schema)

<AutoForm form={myForm} onSubmit={(values) => console.log(values)} />
```

## Props Reference

| Prop              | Type                                                                      | Required | Description                                                                                                    |
| ----------------- | ------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------- |
| `form`            | `UniForm<TSchema>`                                                        | Yes      | A `UniForm` / `createForm` instance carrying the schema and setOnChange handlers                               |
| `onSubmit`        | `(values: z.infer<TSchema>) => void \| Promise<void>`                     | Yes      | Called with fully typed, validated values on successful submit                                                 |
| `defaultValues`   | `Partial<z.infer<TSchema>>` or `() => Promise<Partial<z.infer<TSchema>>>` | No       | Pre-fill form fields. Pass an async function to load from an API. Defaults to `{}`                             |
| `components`      | `ComponentRegistry`                                                       | No       | Override field type → component mapping. Defaults to `defaultRegistry`                                         |
| `fields`          | `Record<string, Partial<FieldOverride>>`                                  | No       | Per-field metadata overrides (supports dot-notated paths for nested fields). Defaults to `{}`                  |
| `fieldWrapper`    | `React.ComponentType<FieldWrapperProps>`                                  | No       | Wrap each scalar field in a custom container. Defaults to `DefaultFieldWrapper`                                |
| `layout`          | `LayoutSlots`                                                             | No       | Replace form wrapper, section wrapper, submit button, array row layout, or `loadingFallback`. Defaults to `{}` |
| `classNames`      | `FormClassNames`                                                          | No       | CSS class names for form, field wrappers, labels, errors, descriptions. Defaults to `{}`                       |
| `disabled`        | `boolean`                                                                 | No       | Disable all form fields and the submit button. Defaults to `false`                                             |
| `coercions`       | `CoercionMap`                                                             | No       | Custom per-type value coercion functions. Defaults to `defaultCoercionMap`                                     |
| `messages`        | `ValidationMessages`                                                      | No       | Custom validation error messages                                                                               |
| `ref`             | `React.Ref<AutoFormHandle>`                                               | No       | Imperative handle for programmatic control                                                                     |
| `persistKey`      | `string`                                                                  | No       | When set, form values auto-save to storage under this key                                                      |
| `persistDebounce` | `number`                                                                  | No       | Debounce interval in ms for persistence writes. Defaults to `300`                                              |
| `persistStorage`  | `PersistStorage`                                                          | No       | Custom storage adapter (must implement `getItem`/`setItem`/`removeItem`). Defaults to `sessionStorage`         |
| `onValuesChange`  | `(values: z.infer<TSchema>) => void`                                      | No       | Called on every field change with the full current form values                                                 |
| `labels`          | `FormLabels`                                                              | No       | Override hard-coded UI text (submit button, array buttons) for i18n. Defaults to `{}`                          |

## Live Example

The form below demonstrates `fields` (labels, sections, descriptions, span), section grouping, and typed submit:

```jsx live noInline
const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  age: z.number().min(0).max(150).optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
  newsletter: z.boolean(),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 500 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ role: 'viewer', newsletter: false }}
        fields={{
          firstName: { label: 'First Name', span: 6, section: 'Personal' },
          lastName: { label: 'Last Name', span: 6, section: 'Personal' },
          email: {
            section: 'Contact',
            description: 'We will never share your email',
          },
          age: { section: 'Contact' },
          role: { section: 'Preferences' },
          newsletter: {
            label: 'Subscribe to newsletter',
            section: 'Preferences',
          },
        }}
        onSubmit={(values) => setResult(values)}
      />
      {result && (
        <pre
          style={{
            marginTop: '1rem',
            background: 'var(--ifm-color-emphasis-200)',
            padding: '1rem',
            borderRadius: 6,
          }}
        >
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

render(<App />)
```
