import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm, useArrayField } from '@uniform-ts/core'
import type { FormWrapperProps } from '@uniform-ts/core'
import { SubmittedData } from './shared'

const crewSchema = z.object({
  project: z.string().min(1, 'Required'),
  crew: z
    .array(
      z.object({
        name: z.string().min(1, 'Required'),
        role: z.enum(['lead', 'engineer', 'designer']),
      }),
    )
    .min(1)
    .max(4),
})

const crewForm = createForm(crewSchema)

const btn = (enabled: boolean) => ({
  padding: '4px 10px',
  fontSize: 13,
  borderRadius: 4,
  border: '1px solid #cbd5e1',
  background: enabled ? '#fff' : '#f1f5f9',
  color: enabled ? '#0f172a' : '#94a3b8',
  cursor: enabled ? 'pointer' : 'not-allowed',
})

// Every operation here drives the *rendered* rows — the hook delegates to the
// field array that ArrayField owns, so the DOM updates immediately.
function CrewToolbar() {
  const { append, remove, insert, move, rowCount, canAdd, atMin } =
    useArrayField('crew')

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap',
        padding: '0.5rem 0.75rem',
        marginBottom: '1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 6,
      }}
    >
      <strong style={{ fontSize: '0.85rem', color: '#475569' }}>
        {rowCount} / 4 crew members
      </strong>
      <button
        type='button'
        disabled={!canAdd}
        style={btn(canAdd)}
        onClick={() => append({ name: '', role: 'engineer' })}
      >
        Append
      </button>
      <button
        type='button'
        disabled={!canAdd}
        style={btn(canAdd)}
        onClick={() => insert(0, { name: '', role: 'lead' })}
      >
        Insert at top
      </button>
      <button
        type='button'
        disabled={atMin}
        style={btn(!atMin)}
        onClick={() => remove(rowCount - 1)}
      >
        Remove last
      </button>
      <button
        type='button'
        disabled={rowCount < 2}
        style={btn(rowCount >= 2)}
        onClick={() => move(0, 1)}
      >
        Move first down
      </button>
    </div>
  )
}

function FormWithToolbar({ children }: FormWrapperProps) {
  return (
    <div>
      <CrewToolbar />
      {children}
    </div>
  )
}

export default function Example27() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex27'>
      <h2>
        Example 27: Full external array control with <code>useArrayField</code>
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        <code>append</code>, <code>insert</code>, <code>remove</code> and{' '}
        <code>move</code> are all driven from a toolbar outside the array
        fieldset. The hook delegates to the field array that renders the rows,
        so each click updates the visible list.
      </p>
      <AutoForm
        form={crewForm}
        defaultValues={{
          project: '',
          crew: [{ name: 'Ada', role: 'lead' }],
        }}
        fields={{ crew: { label: 'Crew', movable: true } }}
        layout={{ formWrapper: FormWithToolbar }}
        labels={{ submit: 'Save Crew' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
