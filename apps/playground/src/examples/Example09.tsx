import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform-ts/core'

const disabledSchema = z.object({
  name: z.string(),
  email: z.string(),
  role: z.enum(['admin', 'user']),
  active: z.boolean(),
})

const disabledForm = createForm(disabledSchema)

export default function Example09() {
  return (
    <section id='ex9'>
      <h2>Example 9: Disabled Form</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        All fields disabled via the <code>disabled</code> prop. The submit
        button is also non-interactive.
      </p>
      <AutoForm
        form={disabledForm}
        disabled
        defaultValues={{
          name: 'Jane Doe',
          email: 'jane@example.com',
          role: 'admin',
          active: true,
        }}
        onSubmit={() => {}}
      />
    </section>
  )
}
