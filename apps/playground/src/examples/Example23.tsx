import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { ObjectWrapperProps, ArrayWrapperProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Schema: a top-level object field (address) + an array field (phones)
const schema = z.object({
  name: z.string().min(1, 'Required'),
  address: z.object({
    street: z.string().min(1, 'Required'),
    city: z.string().min(1, 'Required'),
  }),
  phones: z
    .array(
      z.object({
        label: z.string().min(1, 'Required'),
        number: z.string().min(1, 'Required'),
      }),
    )
    .min(1)
    .max(5),
})

const contactForm = createForm(schema)

// ---------------------------------------------------------------------------
// Custom wrappers — replace <fieldset>/<legend> with styled <div> elements
// ---------------------------------------------------------------------------

function CardObjectWrapper({
  children,
  label,
  className,
  labelClassName,
}: ObjectWrapperProps) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid #c7d2fe',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '0.75rem',
        background: '#f5f3ff',
      }}
    >
      {label && (
        <p
          className={labelClassName}
          style={{
            margin: '0 0 0.75rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#4338ca',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

function AccordionArrayWrapper({
  children,
  label,
  className,
  labelClassName,
}: ArrayWrapperProps) {
  return (
    <div
      className={className}
      style={{
        border: '1px solid #d1fae5',
        borderRadius: 8,
        padding: '1rem',
        marginBottom: '0.75rem',
        background: '#f0fdf4',
      }}
    >
      {label && (
        <p
          className={labelClassName}
          style={{
            margin: '0 0 0.75rem',
            fontWeight: 600,
            fontSize: '0.85rem',
            color: '#065f46',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label}
        </p>
      )}
      {children}
    </div>
  )
}

export default function Example23() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex23'>
      <h2>Example 23: Object &amp; Array Wrapper Customization</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Replace the default <code>&lt;fieldset&gt;</code> /{' '}
        <code>&lt;legend&gt;</code> wrappers around nested objects and array
        fields. Three approaches, from lightest to most powerful:
      </p>

      <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
        A) classNames only (default fieldset/legend, just styled)
      </h3>
      <AutoForm
        form={contactForm}
        defaultValues={{
          name: '',
          address: { street: '', city: '' },
          phones: [{ label: 'Mobile', number: '' }],
        }}
        fields={{
          address: { label: 'Address' },
          phones: { label: 'Phone numbers' },
        }}
        classNames={{
          objectFieldset: 'obj-fieldset',
          objectLegend: 'obj-legend',
          arrayFieldset: 'arr-fieldset',
          arrayLegend: 'arr-legend',
        }}
        onSubmit={(values) => setData(values)}
      />

      <h3
        style={{
          fontSize: '1rem',
          marginTop: '1.5rem',
          marginBottom: '0.5rem',
        }}
      >
        B) Global slot replacement via <code>layout.objectWrapper</code> /{' '}
        <code>layout.arrayWrapper</code>
      </h3>
      <AutoForm
        form={contactForm}
        defaultValues={{
          name: '',
          address: { street: '', city: '' },
          phones: [{ label: 'Mobile', number: '' }],
        }}
        fields={{
          address: { label: 'Address' },
          phones: { label: 'Phone numbers' },
        }}
        layout={{
          objectWrapper: CardObjectWrapper,
          arrayWrapper: AccordionArrayWrapper,
        }}
        onSubmit={(values) => setData(values)}
      />

      <h3
        style={{
          fontSize: '1rem',
          marginTop: '1.5rem',
          marginBottom: '0.5rem',
        }}
      >
        C) Per-field override via <code>fields[name].wrapper</code> (overrides
        global slot for that field only)
      </h3>
      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        Here the global slot uses <code>CardObjectWrapper</code> for all
        objects, but <code>phones</code> overrides it with{' '}
        <code>AccordionArrayWrapper</code> directly on the field.
      </p>
      <AutoForm
        form={contactForm}
        defaultValues={{
          name: '',
          address: { street: '', city: '' },
          phones: [{ label: 'Mobile', number: '' }],
        }}
        fields={{
          address: { label: 'Address' },
          phones: { label: 'Phone numbers', wrapper: AccordionArrayWrapper },
        }}
        layout={{
          objectWrapper: CardObjectWrapper,
        }}
        onSubmit={(values) => setData(values)}
      />

      <SubmittedData data={data} />
    </section>
  )
}
