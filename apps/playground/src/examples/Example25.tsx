import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const taskSchema = z.object({
  tasks: z.array(
    z.object({
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      title: z.string().min(1, 'Required'),
      notes: z.string().optional(),
    }),
  ),
})

const placeholderByPriority: Record<string, string> = {
  low: 'Optional background info',
  medium: 'Add context if needed',
  high: 'Describe urgency and impact',
  critical: 'Explain why this is critical — required for review',
}

const labelByPriority: Record<string, string> = {
  low: 'Notes',
  medium: 'Notes',
  high: 'Notes (recommended)',
  critical: 'Notes (required for critical)',
}

const taskForm = createForm(taskSchema).setOnChange(
  'tasks.priority',
  (value, ctx) => {
    const priority = String(value)
    // 'tasks.notes' is a sibling field — setFieldMeta auto-scopes it to the current row
    ctx.setFieldMeta('tasks.notes', {
      placeholder: placeholderByPriority[priority] ?? '',
      label: labelByPriority[priority] ?? 'Notes',
    })
  },
)

export default function Example25() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex25'>
      <h2>Example 25: Per-Row Field Meta</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Each row's <strong>Priority</strong> enum drives the{' '}
        <strong>Notes</strong> field's placeholder and label{' '}
        <em>only for that row</em>. Changing priority in row 0 does not affect
        row 1's notes field. This uses <code>setOnChange</code> with automatic
        per-row scoping of <code>setFieldMeta</code>.
      </p>
      <AutoForm
        form={taskForm}
        defaultValues={{
          tasks: [
            { priority: 'low', title: '', notes: '' },
            { priority: 'high', title: '', notes: '' },
            { priority: 'critical', title: '', notes: '' },
          ],
        }}
        fields={{
          tasks: { label: 'Task List' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
