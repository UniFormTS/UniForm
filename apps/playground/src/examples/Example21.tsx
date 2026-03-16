import { useState } from 'react'
import * as z from 'zod/v4'
import { AutoForm, createForm } from '@uniform/core'
import { SubmittedData } from './shared'

const profileSchema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.email('Invalid email'),
  bio: z.string().optional(),
  role: z.enum(['viewer', 'editor', 'admin']),
})

type Profile = z.infer<typeof profileSchema>

const profileForm = createForm(profileSchema)

/** Simulates fetching the current user's profile from an API */
async function fetchUserProfile(): Promise<Partial<Profile>> {
  await new Promise((r) => setTimeout(r, 1500))
  return {
    firstName: 'Alice',
    lastName: 'Wonderland',
    email: 'alice@example.com',
    bio: 'Curious by nature.',
    role: 'editor',
  }
}

/** A custom loading skeleton that matches the form's visual weight */
function ProfileSkeleton() {
  const barStyle = (width: string): React.CSSProperties => ({
    height: 14,
    borderRadius: 4,
    background: '#e0e0e0',
    width,
    marginBottom: 6,
    animation: 'pulse 1.4s ease-in-out infinite',
  })
  const fieldStyle: React.CSSProperties = {
    marginBottom: 18,
  }

  return (
    <>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>
      <div aria-label='Loading profile…'>
        {[120, 180, 220, 100, 80].map((w, i) => (
          <div key={i} style={fieldStyle}>
            <div style={barStyle(`${w}px`)} />
            <div
              style={{
                height: 36,
                borderRadius: 4,
                background: '#efefef',
                animation: 'pulse 1.4s ease-in-out infinite',
              }}
            />
          </div>
        ))}
      </div>
    </>
  )
}

export default function Example21() {
  const [data, setData] = useState<Profile | null>(null)
  const [key, setKey] = useState(0)

  return (
    <section id='ex21'>
      <h2>Example 21: Async Default Values</h2>
      <p style={{ color: '#666', fontSize: '0.9rem' }}>
        Pass an <code>async</code> function as <code>defaultValues</code>. The
        form shows a <code>loadingFallback</code> while the promise is in
        flight, then resets with the loaded values. Click "Reload" to replay the
        loading state.
      </p>

      <button
        onClick={() => setKey((k) => k + 1)}
        style={{ marginBottom: '1rem' }}
      >
        ↺ Reload (replay loading)
      </button>

      {/*
        The `key` prop forces AutoForm to remount so the async loader re-runs.
        In a real app you typically mount once per route/page.
      */}
      <AutoForm
        key={key}
        form={profileForm}
        defaultValues={fetchUserProfile}
        layout={{ loadingFallback: <ProfileSkeleton /> }}
        fields={{
          firstName: { label: 'First Name' },
          lastName: { label: 'Last Name' },
          bio: { label: 'Bio', description: 'Tell us about yourself' },
          role: { label: 'Role' },
        }}
        onSubmit={(values) => setData(values)}
      />
      <SubmittedData data={data} />
    </section>
  )
}
