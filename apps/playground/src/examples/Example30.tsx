import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm, Field } from '@uniform-ts/core'
import type { ArrayContainerProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const orderSchema = z.object({
  customer: z.string().min(1, 'Required'),
  lines: z
    .array(
      z.object({
        sku: z.string().min(3, 'At least 3 characters'),
        qty: z.number().min(1),
        note: z.string().optional(),
      }),
    )
    .min(1)
    .max(6),
})

const orderForm = createForm(orderSchema)

const cell: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: '1px solid #e2e8f0',
  verticalAlign: 'top',
}

/**
 * Owns the layout entirely — but every cell is still a UniForm field, so
 * registration, coercion, per-row validation and errors keep working.
 */
function LinesTable({
  rows,
  rowCount,
  canAdd,
  atMin,
  append,
  remove,
  move,
  label,
}: ArrayContainerProps) {
  return (
    <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
      <legend style={{ fontWeight: 600 }}>{label}</legend>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'start', fontSize: 12, color: '#475569' }}>
            <th style={cell}>#</th>
            <th style={cell}>SKU</th>
            <th style={cell}>Qty</th>
            <th style={cell}>Note</th>
            <th style={cell} />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={String(row.id)}>
              <td style={cell}>{index + 1}</td>
              {/* Relative paths resolve against the array's own path */}
              <td style={cell}>
                <Field name={`${index}.sku`} />
              </td>
              <td style={{ ...cell, width: 90 }}>
                <Field name={`${index}.qty`} />
              </td>
              <td style={cell}>
                <Field name={`${index}.note`} />
              </td>
              <td style={{ ...cell, whiteSpace: 'nowrap' }}>
                <button
                  type='button'
                  disabled={index === 0}
                  onClick={() => move(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type='button'
                  disabled={atMin}
                  onClick={() => remove(index)}
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type='button'
        disabled={!canAdd}
        onClick={() => append({ sku: '', qty: 1, note: '' })}
        style={{ margin: '0.5rem' }}
      >
        + Add line ({rowCount}/6)
      </button>
    </fieldset>
  )
}

export default function Example30() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex30'>
      <h2>
        Example 30: Own the layout, keep the plumbing (
        <code>&lt;Field&gt;</code>)
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        A custom component replaces the array field and renders a table. Each
        cell delegates to a relative <code>&lt;Field&gt;</code>, so UniForm
        still owns registration, the component registry and per-row validation.
        Type a one-character SKU and submit to see the error land on the right
        row.
      </p>
      <AutoForm
        form={orderForm}
        components={{ linesTable: LinesTable }}
        fields={{ lines: { component: 'linesTable', label: 'Order lines' } }}
        defaultValues={{
          customer: '',
          lines: [{ sku: 'ABC-1', qty: 2, note: '' }],
        }}
        labels={{ submit: 'Place order' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
