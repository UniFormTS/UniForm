import { useState } from 'react'
import * as z from 'zod/v4'
import {
  AutoForm,
  createForm,
  useFieldError,
  useFieldErrors,
} from '@uniform-ts/core'
import type { ArrayRowLayoutProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Cross-row rules live in superRefine and are anchored to the row, not a leaf.
const orderSchema = z
  .object({
    customer: z.string().min(1, 'Required'),
    lines: z
      .array(
        z.object({
          sku: z.string().min(3, 'At least 3 characters'),
          qty: z.number().min(1),
        }),
      )
      .min(1),
  })
  .superRefine((value, ctx) => {
    const seen = new Map<string, number>()
    value.lines.forEach((line, index) => {
      const previous = seen.get(line.sku)
      if (line.sku && previous !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: ['lines', index],
          message: `Duplicate of line ${previous + 1}`,
        })
      }
      seen.set(line.sku, index)
    })

    const total = value.lines.reduce((sum, line) => sum + (line.qty || 0), 0)
    if (total > 20) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: `Order total of ${total} units exceeds the 20-unit limit`,
      })
    }
  })

const orderForm = createForm(orderSchema as unknown as z.ZodObject)

// A row banner for the issue anchored at `lines.{index}` — there is no leaf to
// render it on, so the row layout renders it itself.
function RowWithBanner({ children, buttons, index }: ArrayRowLayoutProps) {
  const rowError = useFieldError(`lines.${index}`)
  return (
    <div
      style={{
        border: `1px solid ${rowError ? '#dc2626' : '#e2e8f0'}`,
        borderRadius: 6,
        padding: '0.5rem',
        marginBottom: '0.5rem',
      }}
    >
      {rowError && (
        <p role='alert' style={{ color: '#dc2626', margin: '0 0 0.25rem' }}>
          {rowError}
        </p>
      )}
      {children}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {buttons.remove}
      </div>
    </div>
  )
}

function OrderBanner() {
  const rootError = useFieldError('')
  const all = useFieldErrors('')
  if (!rootError && !all.length) return null
  return (
    <div
      style={{
        border: '1px solid #f59e0b',
        background: '#fffbeb',
        borderRadius: 6,
        padding: '0.5rem 0.75rem',
        marginBottom: '0.75rem',
      }}
    >
      {rootError && <strong>{rootError}</strong>}
      <p style={{ margin: '0.25rem 0 0', fontSize: 13, color: '#92400e' }}>
        {all.length} issue{all.length === 1 ? '' : 's'} in total
      </p>
    </div>
  )
}

export default function Example32() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex32'>
      <h2>
        Example 32: Cross-field and array-index errors (
        <code>useFieldError</code>)
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>superRefine</code> anchors a duplicate-SKU issue at{' '}
        <code>lines.{'{index}'}</code> and an over-limit issue at the form root.
        Neither has a leaf field to render it, so the row layout reads{' '}
        <code>useFieldError(`lines.${'{index}'}`)</code> and the banner reads{' '}
        <code>useFieldError('')</code>. No rule is duplicated for display.
      </p>
      <AutoForm
        form={orderForm}
        defaultValues={{
          customer: 'ACME',
          lines: [
            { sku: 'ABC-1', qty: 12 },
            { sku: 'ABC-1', qty: 12 },
          ],
        }}
        fields={{ lines: { label: 'Order lines' } }}
        layout={{
          formWrapper: ({ children }) => (
            <div>
              <OrderBanner />
              {children}
            </div>
          ),
          arrayRowLayout: RowWithBanner,
        }}
        labels={{ submit: 'Place order' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
