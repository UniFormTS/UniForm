import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, UniForm } from '@uniform/core'
import { SubmittedData } from './shared'

const enhancedArraySchema = z.object({
  teamName: z.string().min(1, 'Team name is required'),
  members: z
    .array(
      z.object({
        name: z.string().min(1, 'Name required'),
        role: z.string().min(1, 'Role required'),
      }),
    )
    .min(1)
    .max(5)
    .meta({ movable: true, duplicable: true, collapsible: true }),
  tags: z.array(z.string()).max(3),
})

const enhancedArrayForm = new UniForm(enhancedArraySchema).onChange(
  'members',
  (value, form) => form.setValue('teamName', 5)
)

export default function Example12() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex12'>
      <h2>Example 12: Enhanced Array Fields</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Array fields with <strong>move up/down</strong>,{' '}
        <strong>duplicate</strong>, <strong>collapsible rows</strong> (for
        objects), and <code>min(1)/max(5)</code> constraints from Zod. These
        features are opt-in via <code>movable</code>, <code>duplicable</code>,
        and <code>collapsible</code> meta flags.
      </p>
      <style>{`
        .arr-btn {
          border: 1px solid #d1d5db;
          border-radius: 4px;
          padding: 0.25rem 0.6rem;
          cursor: pointer;
          font-size: 0.8rem;
          margin: 0.15rem;
        }
        .arr-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .arr-add    { background: #4f46e5; color: #fff; border-color: #4f46e5; }
        .arr-remove { background: #fee2e2; color: #dc2626; border-color: #fca5a5; }
        .arr-move   { background: #f0fdf4; color: #16a34a; border-color: #86efac; }
        .arr-dup    { background: #eff6ff; color: #2563eb; border-color: #93c5fd; }
        .arr-collapse { background: #faf5ff; color: #7c3aed; border-color: #c4b5fd; }
      `}</style>
      <AutoForm
        form={enhancedArrayForm}
        defaultValues={{
          teamName: '',
          members: [{ name: '', role: '' }],
          tags: [],
        }}
        classNames={{
          arrayAdd: 'arr-btn arr-add',
          arrayRemove: 'arr-btn arr-remove',
          arrayMove: 'arr-btn arr-move',
          arrayDuplicate: 'arr-btn arr-dup',
          arrayCollapse: 'arr-btn arr-collapse',
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
