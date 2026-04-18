import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm, useArrayField } from '@uniform-ts/core'
import type { FormWrapperProps, ArrayFieldLayoutProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
})

const invoiceSchema = z.object({
  client: z.string().min(1, 'Required'),
  lineItems: z.array(lineItemSchema).min(1).max(5),
})

const invoiceForm = createForm(invoiceSchema)

// Toolbar rendered above the form body — uses useArrayField to drive the Add button
function InvoiceToolbar() {
  const { append, canAdd, rowCount } = useArrayField('lineItems')
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.5rem 0.75rem',
        marginBottom: '1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
      }}
    >
      <span style={{ fontSize: '0.85rem', color: '#475569' }}>
        {rowCount} / 5 line items
      </span>
      <button
        type='button'
        disabled={!canAdd}
        onClick={() => append({ description: '', qty: 1, unitPrice: 0 })}
        style={{
          padding: '4px 12px',
          fontSize: 13,
          borderRadius: 4,
          border: '1px solid #6366f1',
          background: canAdd ? '#6366f1' : '#e2e8f0',
          color: canAdd ? '#fff' : '#94a3b8',
          cursor: canAdd ? 'pointer' : 'not-allowed',
        }}
      >
        + Add Line Item
      </button>
    </div>
  )
}

// FormWrapper that renders the toolbar before the field content
function FormWithToolbar({ children }: FormWrapperProps) {
  return (
    <div>
      <InvoiceToolbar />
      {children}
    </div>
  )
}

// Suppress the default add button rendered inside the array layout
function RowsOnly({ rows }: ArrayFieldLayoutProps) {
  return <>{rows}</>
}

export default function Example24() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex24'>
      <h2>
        Example 24: External Array Buttons via <code>useArrayField</code>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        The "Add Line Item" button lives in a toolbar <em>above</em> the array
        fieldset, rendered via a custom <code>formWrapper</code> that calls{' '}
        <code>useArrayField</code>. The built-in add button inside the array is
        suppressed with a custom <code>arrayFieldLayout</code>.
      </p>
      <AutoForm
        form={invoiceForm}
        defaultValues={{
          client: '',
          lineItems: [{ description: '', qty: 1, unitPrice: 0 }],
        }}
        fields={{
          client: { label: 'Client Name' },
          lineItems: { label: 'Line Items' },
        }}
        layout={{
          formWrapper: FormWithToolbar,
          arrayFieldLayout: RowsOnly,
        }}
        labels={{ submit: 'Save Invoice' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
