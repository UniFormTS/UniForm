import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Composite identity — neither field alone identifies a row.
type ReportId = { dataset: string; version: number }

const reports: { label: string; value: ReportId }[] = [
  { label: 'Sales — v2', value: { dataset: 'sales', version: 2 } },
  { label: 'Sales — v1', value: { dataset: 'sales', version: 1 } },
  { label: 'Returns — v1', value: { dataset: 'returns', version: 1 } },
]

const reportKey = (option: { value: unknown }) => {
  const id = option.value as ReportId
  return `${id.dataset}@${id.version}`
}

const reportSchema = z.object({
  title: z.string().min(1, 'Required'),
  source: z.object({ dataset: z.string(), version: z.number() }),
})

const reportForm = createForm(reportSchema)

export default function Example34() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex34'>
      <h2>Example 34: Rich option identity</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Option values are objects (<code>{'{ dataset, version }'}</code>).{' '}
        <code>getOptionKey</code> supplies the identity used for React keys and
        the DOM <code>value</code>; the <em>raw object</em> is what round-trips
        through <code>onChange</code> and lands in the submitted payload — the
        key is never conflated with the value.
      </p>
      <AutoForm
        form={reportForm}
        defaultValues={{
          title: '',
          source: { dataset: 'sales', version: 2 },
        }}
        fields={{
          source: {
            label: 'Source report',
            component: 'select',
            options: reports as never,
            getOptionKey: reportKey,
            isOptionEqual: (a, b) =>
              reportKey({ value: a }) === reportKey({ value: b }),
          },
        }}
        labels={{ submit: 'Create report' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
