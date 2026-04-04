import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type {
  ArrayButtonProps,
  ArrayCollapseButtonProps,
  ArrayFieldLayoutProps,
} from '@uniform-ts/core'
import { SubmittedData } from './shared'

const lineItemSchema = z.object({
  description: z.string().min(1, 'Required'),
  qty: z.number().min(1),
  unitPrice: z.number().min(0),
})

const invoiceSchema = z.object({
  client: z.string().min(1, 'Required'),
  lineItems: z.array(lineItemSchema).min(1, 'Add at least one item'),
})

const invoiceForm = createForm(invoiceSchema)

// --- Custom button components ---

function DangerBtn({ children, ...props }: ArrayButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '3px 10px',
        fontSize: 12,
        borderRadius: 4,
        border: '1px solid #fca5a5',
        background: '#fef2f2',
        color: '#dc2626',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function GhostBtn({ children, ...props }: ArrayButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '3px 10px',
        fontSize: 12,
        borderRadius: 4,
        border: '1px solid var(--ifm-color-emphasis-300, #d1d5db)',
        background: 'transparent',
        cursor: props.disabled ? 'not-allowed' : 'pointer',
        opacity: props.disabled ? 0.5 : 1,
      }}
    >
      {children}
    </button>
  )
}

function CollapseBtn({
  isCollapsed,
  children,
  ...props
}: ArrayCollapseButtonProps) {
  return (
    <button
      {...props}
      style={{
        padding: '2px 8px',
        fontSize: 11,
        borderRadius: 4,
        border: '1px solid #c7d2fe',
        background: isCollapsed ? '#ede9fe' : '#eef2ff',
        color: '#4338ca',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  )
}

// --- Add button above rows ---
function AddFirstLayout({ rows, addButton, rowCount }: ArrayFieldLayoutProps) {
  return (
    <div>
      <div style={{ marginBottom: rowCount > 0 ? '0.5rem' : 0 }}>
        {addButton}
      </div>
      {rows}
    </div>
  )
}

export default function Example22() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex22'>
      <h2>Example 22: Array Button &amp; Field Layout Customization</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Custom button components via <code>layout.arrayButtons</code> and a
        custom field layout via <code>layout.arrayFieldLayout</code> that places
        the Add button above the rows instead of below.
      </p>
      <AutoForm
        form={invoiceForm}
        defaultValues={{
          lineItems: [{ description: '', qty: 1, unitPrice: 0 }],
        }}
        fields={{
          client: { label: 'Client Name' },
          lineItems: {
            label: 'Line Items',
            movable: true,
            duplicable: true,
            collapsible: true,
          },
        }}
        layout={{
          arrayFieldLayout: AddFirstLayout,
          arrayButtons: {
            base: GhostBtn,
            remove: DangerBtn,
            collapse: CollapseBtn,
          },
        }}
        labels={{
          arrayAdd: '+ Add line',
          arrayRemove: 'Remove',
          arrayMoveUp: '↑',
          arrayMoveDown: '↓',
          arrayDuplicate: 'Duplicate',
          submit: 'Save Invoice',
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
