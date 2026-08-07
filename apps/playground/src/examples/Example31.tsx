import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm, FormErrorSummary } from '@uniform-ts/core'
import type { FormWrapperProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Everything the schema cannot know: which combinations demand a reason.
const REASON_REQUIRED: Record<string, Record<string, boolean>> = {
  transfer: { hardware: true, software: true, service: false },
  dispose: { hardware: true, software: false, service: false },
  view: { hardware: false, software: false, service: false },
}

// Fields the rules decide on are `.optional()` in the schema — the real rule
// lives in setRequired, so there is one rule rather than two that can drift.
const requisitionSchema = z.object({
  action: z.enum(['view', 'transfer', 'dispose']),
  sector: z.enum(['hardware', 'software', 'service']),
  orderReason: z.string().optional(),
  approver: z.string().optional(),
})

const requisitionForm = createForm(requisitionSchema)
  .setRequired(
    'orderReason',
    (values) => REASON_REQUIRED[values.action]?.[values.sector] ?? false,
  )
  .setRequired('approver', (values) => values.action === 'dispose')

function WithSummary({ children }: FormWrapperProps) {
  return (
    <div>
      <FormErrorSummary
        title='Please fix the following before saving:'
        className='uf-summary'
      />
      {children}
    </div>
  )
}

export default function Example31() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex31'>
      <h2>
        Example 31: Runtime requiredness with <code>setRequired</code>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        A lookup matrix decides whether <em>Order reason</em> is required. The
        asterisk and <code>aria-required</code> follow the current{' '}
        <code>action × sector</code> pair live, and submitting with the field
        empty is blocked — the same predicate drives both. Try{' '}
        <em>Transfer + Hardware</em>, then <em>View + Hardware</em>.
      </p>
      <AutoForm
        form={requisitionForm}
        defaultValues={{
          action: 'view',
          sector: 'hardware',
          orderReason: '',
          approver: '',
        }}
        fields={{
          orderReason: { label: 'Order reason' },
          approver: { label: 'Disposal approver' },
        }}
        layout={{ formWrapper: WithSummary }}
        labels={{ submit: 'Save requisition' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
