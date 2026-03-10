import { useRef, useState } from 'react'
import * as React from 'react'
import * as z from 'zod/v4'
import { AutoForm, createAutoForm } from '@uniform/core'
import type {
  FieldWrapperProps,
  FieldProps,
  AutoFormHandle,
  ArrayRowLayoutProps,
  SelectOption,
} from '@uniform/core'

// ---------------------------------------------------------------------------
// Submitted Data Display
// ---------------------------------------------------------------------------

function SubmittedData({ data }: { data: unknown }) {
  if (data == null) return null
  return (
    <pre
      style={{
        background: '#f5f5f5',
        padding: '1rem',
        borderRadius: 4,
        marginTop: '0.5rem',
        fontSize: '0.85rem',
        overflow: 'auto',
      }}
    >
      {JSON.stringify(
        data,
        (_k, v) => (v instanceof Date ? v.toISOString() : v),
        2,
      )}
    </pre>
  )
}

// ---------------------------------------------------------------------------
// Example 1: Flat schema — classNames + span
// ---------------------------------------------------------------------------

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').meta({ placeholder: 'Name...' }),
  email: z.email('Invalid email'),
  age: z.number().min(0).max(150).optional(),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

// ---------------------------------------------------------------------------
// Example 2: Nested schema — section grouping
// ---------------------------------------------------------------------------

const profileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  street: z.string(),
  city: z.string(),
  zip: z.string().min(5, 'ZIP must be 5 digits'),
  newsletter: z.boolean(),
  notifications: z.boolean(),
})

// ---------------------------------------------------------------------------
// Example 3: Array schema — custom layout slots
// ---------------------------------------------------------------------------

const teamSchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  members: z.array(
    z.object({
      name: z.string().min(1, 'Member name required'),
      email: z.email('Invalid email'),
    }),
  ),
  tags: z.array(z.string()),
})

// ---------------------------------------------------------------------------
// Example 4: Custom fieldWrapper
// ---------------------------------------------------------------------------

const signupSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
})

// ---------------------------------------------------------------------------
// Example 5: createAutoForm factory
// ---------------------------------------------------------------------------

const invoiceSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  amount: z.number().min(0),
  dueDate: z.date(),
  status: z.enum(['draft', 'sent', 'paid']),
  notes: z.string().optional(),
})

function BrandedInput(props: FieldProps) {
  return (
    <input
      id={props.name}
      name={props.name}
      value={String(props.value ?? '')}
      onChange={(e) => props.onChange(e.target.value)}
      onBlur={props.onBlur}
      placeholder={props.placeholder}
      disabled={props.disabled}
      required={props.required}
      aria-required={props.required}
      aria-disabled={props.disabled ?? false}
      type={
        (props.meta.inputType as string) === 'number'
          ? 'number'
          : (props.meta.inputType as string) === 'date'
            ? 'date'
            : 'text'
      }
      style={{
        border: '2px solid #4f46e5',
        borderRadius: 6,
        padding: '0.4rem 0.6rem',
        width: '100%',
        boxSizing: 'border-box',
      }}
    />
  )
}

function BrandedFieldWrapper({ children, field, error }: FieldWrapperProps) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label
        htmlFor={field.name}
        style={{
          fontWeight: 600,
          display: 'block',
          marginBottom: 2,
          color: '#4f46e5',
        }}
      >
        {field.label}
        {field.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      {children}
      {error && (
        <span role='alert' style={{ color: 'red', fontSize: '0.8rem' }}>
          {error}
        </span>
      )}
    </div>
  )
}

function BrandedSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      style={{
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.5rem 1.2rem',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
      }}
    >
      {isSubmitting ? 'Saving...' : 'Create Invoice'}
    </button>
  )
}

const BrandedAutoForm = createAutoForm({
  components: {
    string: BrandedInput,
    number: BrandedInput,
    date: BrandedInput,
  },
  fieldWrapper: BrandedFieldWrapper,
  layout: { submitButton: BrandedSubmitButton },
})

// ---------------------------------------------------------------------------
// Example 6: Custom validation messages
// ---------------------------------------------------------------------------

const registrationSchema = z.object({
  name: z.string().min(1),
  email: z.email(),
  age: z.number().min(18).max(120),
  website: z.url().optional(),
})

// ---------------------------------------------------------------------------
// Example 7: Deep field overrides
// ---------------------------------------------------------------------------

const orderSchema = z.object({
  orderId: z.string().min(1),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(5),
  }),
  items: z.array(z.object({ name: z.string(), qty: z.number() })),
})

// ---------------------------------------------------------------------------
// Example 8: Kitchen Sink
// ---------------------------------------------------------------------------

const kitchenSinkSchema = z.object({
  fullName: z.string().min(1),
  email: z.email(),
  age: z.number().min(0).max(150),
  role: z.enum(['user', 'admin', 'editor']),
  bio: z.string().optional(),
  address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    zip: z.string().min(5),
  }),
  tags: z.array(z.object({ value: z.string().min(1) })),
  hasNotes: z.boolean(),
  notes: z.string().optional(),
})

const KitchenSinkAutoForm = createAutoForm({
  components: {
    string: BrandedInput,
    number: BrandedInput,
  },
  fieldWrapper: BrandedFieldWrapper,
  layout: { submitButton: BrandedSubmitButton },
  classNames: { form: 'demo-form' },
})

// ---------------------------------------------------------------------------
// Example 9: Disabled form
// ---------------------------------------------------------------------------

const disabledSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'user']),
  active: z.boolean(),
})

// ---------------------------------------------------------------------------
// Example 10: Programmatic Control via Ref
// ---------------------------------------------------------------------------

const refSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
})

// ---------------------------------------------------------------------------
// Example 11: Form State Persistence
// ---------------------------------------------------------------------------

const persistSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']),
})

// ---------------------------------------------------------------------------
// Example 12: Enhanced Array Fields (min/max, reorder, collapse)
// ---------------------------------------------------------------------------

const enhancedArraySchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  members: z
    .array(
      z.object({
        name: z.string().min(1, 'Name required'),
        role: z.string().min(1, 'Role required'),
      }),
    )
    .min(1)
    .max(5)
    .meta({
      movable: true,
      duplicable: true,
      collapsible: true,
    }),
  tags: z.array(z.string()).max(3),
})

// ---------------------------------------------------------------------------
// Example 13: Custom Array Row Layout
// ---------------------------------------------------------------------------

const rowLayoutSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1, 'Title required'),
        priority: z.enum(['low', 'medium', 'high']),
      }),
    )
    .min(1)
    .max(8)
    .meta({ movable: true, duplicable: true }),
})

// ---------------------------------------------------------------------------
// Example 16: Per-field Custom Components
// ---------------------------------------------------------------------------

// Approach A — direct React component passed as meta.component in the Zod schema
function StarRating(props: FieldProps) {
  const rating = Number(props.value ?? 0)
  return (
    <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
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
          {star <= rating ? '\u2605' : '\u2606'}
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

  const removeItem = (item: string) => {
    props.onChange(selected.filter((s) => s !== item))
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Selected tags */}
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

      {/* Text input */}
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

      {/* Dropdown */}
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

// Schema A — direct components in Zod meta.
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

// Approach B — component registered in factory, referenced by string key
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
      {presets.map((color) => (
        <button
          key={color}
          type='button'
          onClick={() => props.onChange(color)}
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

// Factory with 'colorpicker' registered as a custom component key
const BrandAutoForm = createAutoForm({
  components: {
    colorpicker: ColorPicker,
  },
  fieldWrapper: BrandedFieldWrapper,
  layout: { submitButton: BrandedSubmitButton },
})

// ---------------------------------------------------------------------------
// Example 14: Value Cascade with onValuesChange
// ---------------------------------------------------------------------------

const planSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  seats: z.number().min(1),
  discount: z.number().min(0).max(100),
})

// ---------------------------------------------------------------------------
// Example 15: Field Dependencies with depend
// ---------------------------------------------------------------------------

const shippingSchema = z.object({
  country: z.enum(['us', 'ca', 'gb']),
  region: z.enum([
    'ca',
    'ny',
    'tx', // US states
    'on',
    'qc',
    'bc', // Canadian provinces
    'eng',
    'sct',
    'wls', // UK regions
  ]),
  expressAvailable: z.boolean(),
  shippingMethod: z.enum(['standard', 'express']),
})

function CustomRowLayout({
  children,
  buttons,
  index,
  rowCount,
}: ArrayRowLayoutProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.5rem',
        padding: '0.5rem',
        marginBottom: '0.5rem',
        background: index % 2 === 0 ? '#f9fafb' : '#fff',
        borderRadius: 6,
        border: '1px solid #e5e7eb',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          minWidth: 28,
        }}
      >
        {buttons.moveUp}
        {buttons.moveDown}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 2 }}>
          #{index + 1} of {rowCount}
        </div>
        {children}
      </div>
      <div
        style={{ display: 'flex', gap: '0.25rem', alignItems: 'flex-start' }}
      >
        {buttons.duplicate}
        {buttons.remove}
      </div>
    </div>
  )
}

function CardFieldWrapper({ children, field, error }: FieldWrapperProps) {
  return (
    <div
      style={{
        border: '1px solid #ddd',
        borderRadius: 8,
        padding: '0.75rem 1rem',
        marginBottom: '0.75rem',
        background: error ? '#fff5f5' : '#fafafa',
      }}
    >
      <label
        htmlFor={field.name}
        style={{ fontWeight: 600, display: 'block', marginBottom: 4 }}
      >
        {field.label}
        {field.required && <span style={{ color: 'red' }}> *</span>}
      </label>
      {children}
      {field.meta.description && (
        <p style={{ fontSize: '0.8rem', color: '#666', margin: '4px 0 0' }}>
          {String(field.meta.description)}
        </p>
      )}
      {error && (
        <span role='alert' style={{ color: 'red', fontSize: '0.8rem' }}>
          {error}
        </span>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Custom layout slot components for Example 3
// ---------------------------------------------------------------------------

function StyledFormWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#f8f9fa',
        padding: '1.5rem',
        borderRadius: 12,
        border: '1px solid #e0e0e0',
      }}
    >
      {children}
    </div>
  )
}

function StyledSectionWrapper({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  return (
    <div
      style={{
        background: '#fff',
        padding: '1rem',
        borderRadius: 8,
        marginBottom: '1rem',
        border: '1px solid #e8e8e8',
      }}
    >
      <h3 style={{ margin: '0 0 0.75rem', color: '#333' }}>{title}</h3>
      {children}
    </div>
  )
}

function StyledSubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type='submit'
      disabled={isSubmitting}
      style={{
        background: '#4f46e5',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '0.6rem 1.5rem',
        fontSize: '1rem',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
        opacity: isSubmitting ? 0.6 : 1,
      }}
    >
      {isSubmitting ? 'Saving...' : 'Save Team'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------

const examples = [
  { id: 'ex1', label: '1. classNames + span' },
  { id: 'ex2', label: '2. Section Grouping' },
  { id: 'ex3', label: '3. Custom Layout Slots' },
  { id: 'ex4', label: '4. Custom fieldWrapper' },
  { id: 'ex5', label: '5. createAutoForm Factory' },
  { id: 'ex6', label: '6. Validation Messages' },
  { id: 'ex7', label: '7. Deep Field Overrides' },
  { id: 'ex8', label: '8. Kitchen Sink' },
  { id: 'ex9', label: '9. Disabled Form' },
  { id: 'ex10', label: '10. Ref Control' },
  { id: 'ex11', label: '11. Persistence' },
  { id: 'ex12', label: '12. Enhanced Arrays' },
  { id: 'ex13', label: '13. Array Row Layout' },
  { id: 'ex14', label: '14. Value Cascade' },
  { id: 'ex15', label: '15. Field Dependencies' },
  { id: 'ex16', label: '16. Per-field Custom Components' },
]

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [data1, setData1] = useState<unknown>(null)
  const [data2, setData2] = useState<unknown>(null)
  const [data3, setData3] = useState<unknown>(null)
  const [data4, setData4] = useState<unknown>(null)
  const [data5, setData5] = useState<unknown>(null)
  const [data6, setData6] = useState<unknown>(null)
  const [data7, setData7] = useState<unknown>(null)
  const [data8, setData8] = useState<unknown>(null)
  const [data10, setData10] = useState<unknown>(null)
  const [data11, setData11] = useState<unknown>(null)
  const [data12, setData12] = useState<unknown>(null)
  const [data13, setData13] = useState<unknown>(null)
  const [data14, setData14] = useState<unknown>(null)
  const [data15, setData15] = useState<unknown>(null)
  const [data16a, setData16a] = useState<unknown>(null)
  const [data16b, setData16b] = useState<unknown>(null)

  const formRef = useRef<AutoFormHandle<z.infer<typeof refSchema>>>(null)
  const planRef = useRef<AutoFormHandle<z.infer<typeof planSchema>>>(null)

  return (
    <main
      style={{
        fontFamily: 'system-ui',
        padding: '2rem',
        maxWidth: 700,
        margin: '0 auto',
      }}
    >
      <h1>UniForm Playground</h1>

      {/* Navigation */}
      <nav
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '2rem',
          padding: '1rem',
          background: '#f8f9fa',
          borderRadius: 8,
          border: '1px solid #e0e0e0',
        }}
      >
        {examples.map((ex) => (
          <a
            key={ex.id}
            href={`#${ex.id}`}
            style={{
              fontSize: '0.85rem',
              color: '#4f46e5',
              textDecoration: 'none',
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              background: '#fff',
              border: '1px solid #e0e0e0',
            }}
          >
            {ex.label}
          </a>
        ))}
      </nav>

      {/* -----------------------------------------------------------
          Example 1: classNames + span
      ----------------------------------------------------------- */}
      <section id='ex1'>
        <h2>Example 1: classNames + span</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Uses <code>classNames</code> to apply CSS classes and{' '}
          <code>span</code> for grid column hints.
        </p>
        <style>{`
          .demo-form {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 0.75rem;
          }
          .demo-form > * {
            grid-column: span var(--field-span, 12);
          }
          .demo-field { padding: 0.5rem; background: #f5f5f5; border-radius: 4px; }
          .demo-label { font-weight: 600; display: block; margin-bottom: 2px; }
          .demo-error { color: red; font-size: 0.8rem; }
          .demo-desc { color: #888; font-size: 0.8rem; }
        `}</style>
        <AutoForm
          schema={contactSchema}
          defaultValues={{ role: 'user', subscribe: false }}
          classNames={{
            form: 'demo-form',
            fieldWrapper: 'demo-field',
            label: 'demo-label',
            error: 'demo-error',
            description: 'demo-desc',
          }}
          fields={{
            name: { span: 6 },
            email: { span: 6 },
            age: { span: 4 },
            role: { span: 4 },
            subscribe: { span: 4 },
          }}
          onSubmit={(values) => setData1(values)}
        />
        <SubmittedData data={data1} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 2: Section grouping
      ----------------------------------------------------------- */}
      <section id='ex2'>
        <h2>Example 2: Section Grouping</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Fields grouped into sections via <code>meta.section</code>. Each
          section renders inside a <code>layout.sectionWrapper</code>.
        </p>
        <AutoForm
          schema={profileSchema}
          defaultValues={{
            newsletter: false,
            notifications: true,
          }}
          fields={{
            username: { section: 'Account', order: 1 },
            street: { section: 'Address', order: 2 },
            city: { section: 'Address', order: 3 },
            zip: { section: 'Address', order: 4 },
            newsletter: { section: 'Preferences', order: 5 },
            notifications: { section: 'Preferences', order: 6 },
          }}
          onSubmit={(values) => setData2(values)}
        />
        <SubmittedData data={data2} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 3: Custom layout slots
      ----------------------------------------------------------- */}
      <section id='ex3'>
        <h2>Example 3: Custom Layout Slots</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Custom <code>formWrapper</code>, <code>sectionWrapper</code>, and{' '}
          <code>submitButton</code> via the <code>layout</code> prop.
        </p>
        <AutoForm
          schema={teamSchema}
          defaultValues={{
            members: [{ name: '', email: '' }],
            tags: [],
          }}
          fields={{
            teamName: { section: 'Team Info' },
            members: { section: 'Members' },
            tags: { section: 'Tags' },
          }}
          layout={{
            formWrapper: StyledFormWrapper,
            sectionWrapper: StyledSectionWrapper,
            submitButton: StyledSubmitButton,
          }}
          onSubmit={(values) => setData3(values)}
        />
        <SubmittedData data={data3} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 4: Custom fieldWrapper
      ----------------------------------------------------------- */}
      <section id='ex4'>
        <h2>Example 4: Custom fieldWrapper</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          A custom <code>fieldWrapper</code> renders each field in a card-style
          container with error highlighting.
        </p>
        <AutoForm
          schema={signupSchema}
          fieldWrapper={CardFieldWrapper}
          fields={{
            username: { description: 'Choose a unique username' },
            password: { description: 'Minimum 8 characters' },
          }}
          onSubmit={(values) => setData4(values)}
        />
        <SubmittedData data={data4} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 5: createAutoForm factory
      ----------------------------------------------------------- */}
      <section id='ex5'>
        <h2>Example 5: createAutoForm Factory</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          A pre-configured <code>AutoForm</code> with branded input components,
          a custom field wrapper, and a styled submit button — all baked in via{' '}
          <code>createAutoForm()</code>.
        </p>
        <BrandedAutoForm
          schema={invoiceSchema}
          defaultValues={{ status: 'draft' }}
          onSubmit={(values) => setData5(values)}
        />
        <SubmittedData data={data5} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 6: Custom validation messages
      ----------------------------------------------------------- */}
      <section id='ex6'>
        <h2>Example 6: Custom Validation Messages</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Custom error messages at three levels: global <code>required</code>{' '}
          override, per-field catch-all, and per-field per-error-code.
        </p>
        <AutoForm
          schema={registrationSchema}
          onSubmit={(values) => setData6(values)}
          messages={{
            required: 'This field is required',
            email: {
              invalid_format: 'Please enter a valid email address',
            },
            age: 'Please enter a valid age (18–120)',
          }}
        />
        <SubmittedData data={data6} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 7: Deep field overrides
      ----------------------------------------------------------- */}
      <section id='ex7'>
        <h2>Example 7: Deep Field Overrides</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Dot-notated <code>fields</code> overrides that target nested object
          and array item fields.
        </p>
        <AutoForm
          schema={orderSchema}
          defaultValues={{ items: [{ name: '', qty: 0 }] }}
          fields={{
            orderId: { label: 'Order #', placeholder: 'ORD-0001' },
            'address.street': {
              placeholder: '123 Main St',
              description: 'Include apartment number',
            },
            'address.city': { placeholder: 'City / Town' },
            'address.zip': { placeholder: '00000', span: 6 },
          }}
          onSubmit={(values) => setData7(values)}
        />
        <SubmittedData data={data7} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 8: Kitchen Sink
      ----------------------------------------------------------- */}
      <section id='ex8'>
        <h2>Example 8: Kitchen Sink</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Everything combined: <code>createAutoForm</code> factory, sections,
          conditional fields, deep overrides, custom messages, grid layout,
          nested objects, and arrays.
        </p>
        <KitchenSinkAutoForm
          schema={kitchenSinkSchema}
          defaultValues={{
            role: 'user',
            hasNotes: false,
            tags: [{ value: '' }],
          }}
          fields={{
            fullName: { section: 'Personal', order: 1, span: 6 },
            email: { section: 'Personal', order: 2, span: 6 },
            age: { section: 'Personal', order: 3, span: 6 },
            role: { section: 'Personal', order: 4, span: 6 },
            bio: { section: 'Personal', order: 5 },
            'address.street': { placeholder: '123 Main St' },
            'address.city': { placeholder: 'City / Town' },
            'address.zip': { placeholder: '00000', span: 6 },
            hasNotes: { order: 90 },
            notes: {
              order: 91,
              condition: (vals: Record<string, unknown>) =>
                vals['hasNotes'] === true,
            },
          }}
          messages={{
            required: 'This field is required',
            email: {
              invalid_format: 'Please enter a valid email',
            },
          }}
          onSubmit={(values) => setData8(values)}
        />
        <SubmittedData data={data8} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 9: Disabled Form
      ----------------------------------------------------------- */}
      <section id='ex9'>
        <h2>Example 9: Disabled Form</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          All fields disabled via the <code>disabled</code> prop. The submit
          button is also non-interactive.
        </p>
        <AutoForm
          schema={disabledSchema}
          disabled
          defaultValues={{
            name: 'Jane Doe',
            email: 'jane@example.com',
            role: 'admin',
            active: true,
          }}
          onSubmit={() => {}}
        />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 10: Programmatic Control via Ref
      ----------------------------------------------------------- */}
      <section id='ex10'>
        <h2>Example 10: Programmatic Control via Ref</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Use <code>ref</code> to control the form externally — reset, submit,
          set values, set/clear errors, and focus fields.
        </p>
        <AutoForm
          ref={formRef}
          schema={refSchema}
          defaultValues={{ name: '', email: '' }}
          onSubmit={(values) => setData10(values)}
        />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            marginTop: '0.75rem',
          }}
        >
          <button onClick={() => formRef.current?.reset()}>Reset</button>
          <button onClick={() => formRef.current?.submit()}>
            Submit (external)
          </button>
          <button
            onClick={() =>
              formRef.current?.setValues({
                name: 'Alice',
                email: 'alice@example.com',
              })
            }
          >
            Pre-fill Values
          </button>
          <button
            onClick={() =>
              alert(JSON.stringify(formRef.current?.getValues(), null, 2))
            }
          >
            Get Values
          </button>
          <button
            onClick={() =>
              formRef.current?.setErrors({
                name: 'Name is taken',
                email: 'Email already registered',
              })
            }
          >
            Set Errors
          </button>
          <button onClick={() => formRef.current?.clearErrors()}>
            Clear Errors
          </button>
          <button onClick={() => formRef.current?.focus('email')}>
            Focus Email
          </button>
        </div>
        <SubmittedData data={data10} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 11: Form State Persistence
      ----------------------------------------------------------- */}
      <section id='ex11'>
        <h2>Example 11: Form State Persistence</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Form values auto-save to <code>localStorage</code> under the given{' '}
          <code>persistKey</code>. Reload the page to see values restored.
          Submitting clears the persisted data.
        </p>
        <AutoForm
          schema={persistSchema}
          defaultValues={{ priority: 'medium' }}
          persistKey='playground-persist-demo'
          persistDebounce={500}
          onSubmit={(values) => setData11(values)}
        />
        <SubmittedData data={data11} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 12: Enhanced Array Fields
      ----------------------------------------------------------- */}
      <section id='ex12'>
        <h2>Example 12: Enhanced Array Fields</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Array fields with <strong>move up/down</strong>,{' '}
          <strong>duplicate</strong>, <strong>collapsible rows</strong> (for
          objects), and <code>min(1)/max(5)</code> constraints from Zod. These
          features are opt-in via <code>movable</code>, <code>duplicable</code>,
          and <code>collapsible</code> meta flags. Array buttons can be styled
          via <code>classNames</code>.
        </p>
        <style>{`
          .arr-btn {
            border: 1px solid #d1d5db;
            border-radius: 4px;
            padding: 0.25rem 0.6rem;
            cursor: pointer;
            font-size: 0.8rem;
            margin: 0.15rem;
          }
          .arr-btn:disabled {
            opacity: 0.4;
            cursor: not-allowed;
          }
          .arr-add {
            background: #4f46e5;
            color: #fff;
            border-color: #4f46e5;
          }
          .arr-remove {
            background: #fee2e2;
            color: #dc2626;
            border-color: #fca5a5;
          }
          .arr-move {
            background: #f0fdf4;
            color: #16a34a;
            border-color: #86efac;
          }
          .arr-dup {
            background: #eff6ff;
            color: #2563eb;
            border-color: #93c5fd;
          }
          .arr-collapse {
            background: #faf5ff;
            color: #7c3aed;
            border-color: #c4b5fd;
          }
        `}</style>
        <AutoForm
          schema={enhancedArraySchema}
          defaultValues={{
            teamName: '',
            members: [{ name: '', role: '' }],
            tags: [],
          }}
          classNames={{
            arrayAdd: 'arr-btn arr-add',
            arrayRemove: 'arr-btn arr-remove',
            arrayMove: 'arr-btn arr-move',
            arrayDuplicate: 'arr-btn arr-dup',
            arrayCollapse: 'arr-btn arr-collapse',
          }}
          onSubmit={(values) => setData12(values)}
        />
        <SubmittedData data={data12} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 13: Custom Array Row Layout
      ----------------------------------------------------------- */}
      <section id='ex13'>
        <h2>Example 13: Custom Array Row Layout</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Provide a <code>layout.arrayRowLayout</code> component to fully
          control where buttons appear within each array row. The component
          receives <code>children</code> (the form fields), <code>buttons</code>{' '}
          (individual button elements), <code>index</code>, and{' '}
          <code>rowCount</code>.
        </p>
        <AutoForm
          schema={rowLayoutSchema}
          defaultValues={{
            tasks: [
              { title: 'Build feature', priority: 'high' },
              { title: 'Write tests', priority: 'medium' },
            ],
          }}
          classNames={{
            arrayAdd: 'arr-btn arr-add',
            arrayRemove: 'arr-btn arr-remove',
            arrayMove: 'arr-btn arr-move',
            arrayDuplicate: 'arr-btn arr-dup',
          }}
          layout={{ arrayRowLayout: CustomRowLayout }}
          onSubmit={(values) => setData13(values)}
        />
        <SubmittedData data={data13} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 14: Value Cascade with onValuesChange
      ----------------------------------------------------------- */}
      <section id='ex14'>
        <h2>Example 14: Value Cascade</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Use <code>onValuesChange</code> + a <code>ref</code> to set field B
          when field A changes. Changing <strong>Plan</strong> auto-fills{' '}
          <strong>Seats</strong> and <strong>Discount</strong>.
        </p>
        <AutoForm
          ref={planRef}
          schema={planSchema}
          defaultValues={{ plan: 'free', seats: 1, discount: 0 }}
          onValuesChange={(values) => {
            const defaults: Record<
              string,
              { seats: number; discount: number }
            > = {
              free: { seats: 1, discount: 0 },
              starter: { seats: 5, discount: 0 },
              pro: { seats: 20, discount: 10 },
              enterprise: { seats: 100, discount: 25 },
            }
            const d = defaults[values.plan]
            if (
              d &&
              (values.seats !== d.seats || values.discount !== d.discount)
            ) {
              planRef.current?.setValues({
                seats: d.seats,
                discount: d.discount,
              })
            }
          }}
          onSubmit={(values) => setData14(values)}
        />
        <SubmittedData data={data14} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 15: Field Dependencies with depend
      ----------------------------------------------------------- */}
      <section id='ex15'>
        <h2>Example 15: Field Dependencies</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Use <code>meta.depend</code> to reactively update a field's{' '}
          <strong>options</strong>, <strong>value</strong>,{' '}
          <strong>visibility</strong>, <strong>disabled state</strong>, or{' '}
          <strong>label</strong> based on other field values — without any
          imperative code.
        </p>
        <AutoForm
          schema={shippingSchema}
          defaultValues={{
            country: 'us',
            region: 'ca',
            expressAvailable: true,
            shippingMethod: 'standard',
          }}
          fields={{
            region: {
              depend: (values) => {
                const optionsByCountry: Record<
                  string,
                  { label: string; value: string }[]
                > = {
                  us: [
                    { label: 'California', value: 'ca' },
                    { label: 'New York', value: 'ny' },
                    { label: 'Texas', value: 'tx' },
                  ],
                  ca: [
                    { label: 'Ontario', value: 'on' },
                    { label: 'Quebec', value: 'qc' },
                    { label: 'British Columbia', value: 'bc' },
                  ],
                  gb: [
                    { label: 'England', value: 'eng' },
                    { label: 'Scotland', value: 'sct' },
                    { label: 'Wales', value: 'wls' },
                  ],
                }
                const country = String(values['country'])
                const opts = optionsByCountry[country] ?? []
                const currentRegion = String(values['region'])
                const isCurrentValid = opts.some(
                  (o) => o.value === currentRegion,
                )
                return {
                  label:
                    country === 'us'
                      ? 'State'
                      : country === 'ca'
                        ? 'Province'
                        : 'Region',
                  options: opts,
                  // Auto-reset to first option when the current value isn't
                  // valid for the newly selected country
                  value: isCurrentValid ? undefined : opts[0]?.value,
                }
              },
            },
            shippingMethod: {
              depend: (values) => ({
                disabled: values['expressAvailable'] !== true,
                description: values['expressAvailable']
                  ? 'Choose your delivery speed'
                  : 'Express shipping is not available for this order',
                value:
                  values['expressAvailable'] !== true ? 'standard' : undefined,
              }),
            },
          }}
          onSubmit={(values) => setData15(values)}
        />
        <SubmittedData data={data15} />
      </section>

      <hr style={{ margin: '2rem 0' }} />

      {/* -----------------------------------------------------------
          Example 16: Per-field Custom Components
      ----------------------------------------------------------- */}
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
    </main>
  )
}
