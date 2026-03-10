import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createAutoForm } from '@uniform/core'
import type { FieldProps, SelectOption } from '@uniform/core'
import {
  BrandedFieldWrapper,
  BrandedSubmitButton,
  SubmittedData,
} from './shared'

// ---------------------------------------------------------------------------
// Approach A — direct React component in Zod meta
// ---------------------------------------------------------------------------

function StarRating(props: FieldProps) {
  const rating = Number(props.value ?? 0)
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star, index) => (
        <button
          key={star}
          ref={index === 0 ? props.ref : undefined}
          type='button'
          onClick={() => props.onChange(star)}
          disabled={props.disabled}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          style={{
            background: 'none',
            border: 'none',
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            fontSize: '1.8rem',
            color: star <= rating ? '#f59e0b' : '#d1d5db',
            padding: 0,
            lineHeight: 1,
          }}
        >
          {star <= rating ? '★' : '☆'}
        </button>
      ))}
      {props.error && (
        <span
          role='alert'
          style={{ color: 'red', fontSize: '0.8rem', marginLeft: '0.5rem' }}
        >
          {props.error}
        </span>
      )}
    </div>
  )
}

// Multi-value autocomplete — stores an array of strings via z.array(z.string())
function MultiAutocomplete(props: FieldProps) {
  const selected = Array.isArray(props.value) ? (props.value as string[]) : []
  const options = (props.meta.options as SelectOption[] | undefined) ?? []
  const [inputText, setInputText] = useState('')
  const [open, setOpen] = useState(false)

  const filtered = options.filter(
    (o) =>
      !selected.includes(String(o.value)) &&
      o.label.toLowerCase().includes(inputText.toLowerCase()),
  )

  const addItem = (item: string) => {
    const trimmed = item.trim()
    if (trimmed && !selected.includes(trimmed)) {
      props.onChange([...selected, trimmed])
    }
    setInputText('')
    setOpen(false)
  }

  const removeItem = (item: string) =>
    props.onChange(selected.filter((s) => s !== item))

  return (
    <div style={{ position: 'relative' }}>
      {selected.length > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.25rem',
            marginBottom: '0.4rem',
          }}
        >
          {selected.map((item) => (
            <span
              key={item}
              style={{
                background: '#0ea5e9',
                color: '#fff',
                borderRadius: 12,
                padding: '0.15rem 0.55rem',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
            >
              {item}
              <button
                type='button'
                onClick={() => removeItem(item)}
                disabled={props.disabled}
                aria-label={`Remove ${item}`}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#fff',
                  cursor: props.disabled ? 'not-allowed' : 'pointer',
                  padding: 0,
                  lineHeight: 1,
                  fontSize: '1rem',
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={props.name}
        type='text'
        value={inputText}
        onChange={(e) => {
          setInputText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        ref={props.ref}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputText) {
            e.preventDefault()
            addItem(inputText)
          }
          if (e.key === 'Escape') setOpen(false)
          if (e.key === 'Backspace' && !inputText && selected.length > 0) {
            props.onChange(selected.slice(0, -1))
          }
        }}
        placeholder={
          selected.length === 0
            ? (props.placeholder ?? 'Type or pick a suggestion…')
            : 'Add more…'
        }
        disabled={props.disabled}
        style={{
          border: '2px solid #0ea5e9',
          borderRadius: 8,
          padding: '0.4rem 0.8rem',
          width: '100%',
          boxSizing: 'border-box',
          background: props.disabled ? '#f5f5f5' : '#f0f9ff',
        }}
      />
      {open && filtered.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #0ea5e9',
            borderRadius: 6,
            margin: 0,
            padding: '0.25rem 0',
            listStyle: 'none',
            zIndex: 10,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {filtered.map((o) => (
            <li
              key={o.value}
              onMouseDown={() => addItem(String(o.value))}
              style={{
                padding: '0.4rem 0.8rem',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background = '#e0f2fe')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background = '')
              }
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
      {props.error && (
        <span
          role='alert'
          style={{
            color: 'red',
            fontSize: '0.8rem',
            display: 'block',
            marginTop: '0.25rem',
          }}
        >
          {props.error}
        </span>
      )}
    </div>
  )
}

// 'languages' is z.array(z.string()) but rendered by MultiAutocomplete
// (meta.component bypasses the default ArrayField routing).
const techStackSchema = z.object({
  projectName: z.string().min(1, 'Project name is required'),
  languages: z
    .array(z.string())
    .min(1, 'Pick at least one language')
    .meta({
      label: 'Languages',
      placeholder: 'e.g. TypeScript…',
      component: MultiAutocomplete,
      options: [
        { label: 'TypeScript', value: 'TypeScript' },
        { label: 'JavaScript', value: 'JavaScript' },
        { label: 'Python', value: 'Python' },
        { label: 'Rust', value: 'Rust' },
        { label: 'Go', value: 'Go' },
        { label: 'Java', value: 'Java' },
        { label: 'C#', value: 'C#' },
        { label: 'Swift', value: 'Swift' },
        { label: 'Kotlin', value: 'Kotlin' },
      ],
    }),
  difficulty: z
    .number()
    .min(1, 'Difficulty is required')
    .max(5)
    .meta({ label: 'Difficulty (1–5)', component: StarRating }),
  notes: z.string().optional().meta({ label: 'Notes' }),
})

// ---------------------------------------------------------------------------
// Approach B — component registered in factory, referenced by string key
// ---------------------------------------------------------------------------

function ColorPicker(props: FieldProps) {
  const presets = [
    '#ef4444',
    '#f97316',
    '#eab308',
    '#22c55e',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
  ]
  const current = String(props.value ?? '#3b82f6')
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
      }}
    >
      {presets.map((color, index) => (
        <button
          key={color}
          type='button'
          onClick={() => props.onChange(color)}
          ref={index === 0 ? props.ref : undefined}
          disabled={props.disabled}
          aria-label={color}
          style={{
            width: 28,
            height: 28,
            borderRadius: '50%',
            background: color,
            border:
              current === color ? '3px solid #111' : '2px solid transparent',
            cursor: props.disabled ? 'not-allowed' : 'pointer',
            boxSizing: 'border-box',
          }}
        />
      ))}
      <span
        style={{
          fontFamily: 'monospace',
          fontSize: '0.85rem',
          padding: '0.2rem 0.5rem',
          background: '#f5f5f5',
          borderRadius: 4,
        }}
      >
        {current}
      </span>
    </div>
  )
}

const brandSchema = z.object({
  brandName: z.string().min(1, 'Brand name is required'),
  tagline: z.string().optional(),
  primaryColor: z
    .string()
    .min(1, 'Color is required')
    .meta({ label: 'Primary Color', component: 'colorpicker' }),
  accentColor: z
    .string()
    .min(1, 'Color is required')
    .meta({ label: 'Accent Color', component: 'colorpicker' }),
})

const BrandAutoForm = createAutoForm({
  components: { colorpicker: ColorPicker },
  fieldWrapper: BrandedFieldWrapper,
  layout: { submitButton: BrandedSubmitButton },
})

// ---------------------------------------------------------------------------
// Example 16
// ---------------------------------------------------------------------------

export default function Example16() {
  const [data16a, setData16a] = useState<unknown>(null)
  const [data16b, setData16b] = useState<unknown>(null)
  return (
    <section id='ex16'>
      <h2>Example 16: Per-field Custom Components</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Two ways to use a fully custom component for a specific field:
      </p>

      <h3 style={{ marginBottom: '0.25rem' }}>
        A) Direct component in Zod meta — multi-value autocomplete
      </h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>
        The <strong>Languages</strong> field is{' '}
        <code>z.array(z.string()).min(1)</code> but rendered by a{' '}
        <code>MultiAutocomplete</code> component set directly via{' '}
        <code>meta.component</code>. The default <code>ArrayField</code>{' '}
        row-based UI is bypassed entirely — the custom component owns the full
        array value. Pick from the dropdown or press <kbd>Enter</kbd> to add a
        custom entry; press <kbd>Backspace</kbd> to remove the last tag. The{' '}
        <strong>Difficulty</strong> field uses a star picker the same way.
      </p>
      <AutoForm
        schema={techStackSchema}
        defaultValues={{ languages: [], difficulty: 0 }}
        onSubmit={(values) => setData16a(values)}
      />
      <SubmittedData data={data16a} />

      <h3 style={{ marginTop: '1.5rem', marginBottom: '0.25rem' }}>
        B) Custom component registered in factory, used via string key
      </h3>
      <p style={{ color: '#666', fontSize: '0.9rem', marginTop: 0 }}>
        Register a component under a custom key in{' '}
        <code>
          createAutoForm(&#123; components: &#123; colorpicker: ColorPicker
          &#125; &#125;)
        </code>
        , then reference it with{' '}
        <code>meta.component: &apos;colorpicker&apos;</code> in the schema or{' '}
        <code>fields</code> prop.
      </p>
      <BrandAutoForm
        schema={brandSchema}
        defaultValues={{ primaryColor: '#3b82f6', accentColor: '#8b5cf6' }}
        onSubmit={(values) => setData16b(values)}
      />
      <SubmittedData data={data16b} />
    </section>
  )
}
