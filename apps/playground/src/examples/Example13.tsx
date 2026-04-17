import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { ArrayRowLayoutProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const rowLayoutSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1, 'Title required'),
        priority: z.enum(['low', 'medium', 'high']),
        note: z.string().optional(),
      }),
    )
    .min(1)
    .max(8)
    .meta({ movable: true, duplicable: true }),
})

const rowLayoutForm = createForm(rowLayoutSchema)

rowLayoutForm.setCondition('tasks.note', (row) => row.priority === 'high')

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

export default function Example13() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex13'>
      <h2>Example 13: Custom Array Row Layout</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Provide a <code>layout.arrayRowLayout</code> component to fully control
        where buttons appear within each array row. The component receives{' '}
        <code>children</code> (the form fields), <code>buttons</code>{' '}
        (individual button elements), <code>index</code>, and{' '}
        <code>rowCount</code>.
      </p>
      <AutoForm
        form={rowLayoutForm}
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
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
