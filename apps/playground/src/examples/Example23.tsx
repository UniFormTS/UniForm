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
        fields via <code>layout.objectWrapper</code> and{' '}
        <code>layout.arrayWrapper</code>. Use{' '}
        <code>classNames.objectFieldset</code> /{' '}
        <code>classNames.objectLegend</code> (and the array equivalents) to add
        CSS classes when you only need light styling on the default wrapper.
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
        B) Full component replacement via layout slots
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

      <SubmittedData data={data} />
    </section>
  )
}
