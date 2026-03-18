import { useState } from 'react'
import * as z from 'zod/v4'
import { createAutoForm, createForm } from '@uniform-ts/core'
import { BrandedInput, BrandedFieldWrapper, SubmittedData } from './shared'

const invoiceSchema = z.object({
  client: z.string().min(1, 'Client is required'),
  amount: z.number().min(0),
  dueDate: z.date(),
  status: z.enum(['draft', 'sent', 'paid']),
  notes: z.string().optional(),
})

const invoiceForm = createForm(invoiceSchema)

function CreateInvoiceButton({ isSubmitting }: { isSubmitting: boolean }) {
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
  layout: { submitButton: CreateInvoiceButton },
})

export default function Example05() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex5'>
      <h2>Example 5: createAutoForm Factory</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        A pre-configured <code>AutoForm</code> with branded input components, a
        custom field wrapper, and a styled submit button — all baked in via{' '}
        <code>createAutoForm()</code>.
      </p>
      <BrandedAutoForm
        form={invoiceForm}
        defaultValues={{ status: 'draft' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
