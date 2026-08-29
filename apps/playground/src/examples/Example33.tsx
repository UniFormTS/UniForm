import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'
import type { SelectOption } from '@uniform-ts/core'
import { SubmittedData } from './shared'

// Cascading data — country -> region -> city.
const REGIONS: Record<string, string[]> = {
  de: ['Bavaria', 'Hesse'],
  fr: ['Brittany', 'Normandy'],
}
const CITIES: Record<string, string[]> = {
  Bavaria: ['Munich', 'Nuremberg'],
  Hesse: ['Frankfurt', 'Kassel'],
  Brittany: ['Rennes', 'Brest'],
  Normandy: ['Rouen', 'Caen'],
}

const toOptions = (values: string[]): SelectOption[] =>
  values.map((v) => ({ label: v, value: v }))

const addressSchema = z.object({
  country: z.enum(['de', 'fr']),
  region: z.string(),
  city: z.string(),
})

// Each edge is declared once; UniForm walks the transitive closure in order.
const addressForm = createForm(addressSchema).setDependencies({
  region: {
    dependsOn: 'country',
    resolve: ({ ctx, value }) => {
      const regions = REGIONS[String(value)] ?? []
      ctx.setFieldMeta('region', { options: toOptions(regions) })
      ctx.setValue('region', regions[0] ?? '')
    },
  },
  city: {
    dependsOn: 'region',
    resolve: ({ ctx }) => {
      const region = ctx.getValues().region
      const cities = CITIES[region] ?? []
      ctx.setFieldMeta('city', { options: toOptions(cities) })
      ctx.setValue('city', cities[0] ?? '')
    },
  },
})

export default function Example33() {
  const [data, setData] = useState<unknown>(null)
  return (
    <section id='ex33'>
      <h2>
        Example 33: Declarative dependency graph (<code>setDependencies</code>)
      </h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Changing <em>Country</em> re-resolves <em>Region</em> and then{' '}
        <em>City</em> — transitively, in dependency order, from one declaration
        per edge. The same cascade runs for a programmatic <code>setValue</code>
        , not just a UI edit. Cycles are rejected at registration time.
      </p>
      <AutoForm
        form={addressForm}
        defaultValues={{ country: 'de', region: 'Bavaria', city: 'Munich' }}
        fields={{
          region: { component: 'select', options: toOptions(REGIONS.de) },
          city: { component: 'select', options: toOptions(CITIES.Bavaria) },
        }}
        labels={{ submit: 'Save address' }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
