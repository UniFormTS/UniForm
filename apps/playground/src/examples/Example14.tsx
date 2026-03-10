import { useRef, useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm } from '@uniform/core'
import type { AutoFormHandle } from '@uniform/core'
import { SubmittedData } from './shared'

const planSchema = z.object({
  plan: z.enum(['free', 'starter', 'pro', 'enterprise']),
  seats: z.number().min(1),
  discount: z.number().min(0).max(100),
})

export default function Example14() {
  const [data, setData] = useState<unknown>(null)
  const planRef = useRef<AutoFormHandle<z.infer<typeof planSchema>>>(null)
  return (
    <section id='ex14'>
      <h2>Example 14: Value Cascade</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Use <code>onValuesChange</code> + a <code>ref</code> to set field B when
        field A changes. Changing <strong>Plan</strong> auto-fills{' '}
        <strong>Seats</strong> and <strong>Discount</strong>.
      </p>
      <AutoForm
        ref={planRef}
        schema={planSchema}
        defaultValues={{ plan: 'free', seats: 1, discount: 0 }}
        fields={{
          plan: {
            
          }
        }}
        onValuesChange={(values) => {
          const defaults: Record<string, { seats: number; discount: number }> =
            {
              free: { seats: 1, discount: 0 },
              starter: { seats: 5, discount: 0 },
              pro: { seats: 20, discount: 10 },
              enterprise: { seats: 100, discount: 25 },
            }
          const d = defaults[values.plan]
          if (
            d &&
            (values.seats !== d.seats || values.discount !== d.discount)
          ) {
            planRef.current?.setValues({
              seats: d.seats,
              discount: d.discount,
            })
          }
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
