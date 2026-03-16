import type { ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import Heading from '@theme/Heading'
import CodeBlock from '@theme/CodeBlock'

import styles from './index.module.css'

const features = [
  {
    title: 'Schema-driven',
    description:
      'Define your form once with Zod V4. UniForm introspects the schema and renders fully typed inputs, labels, validation, and coercions automatically.',
  },
  {
    title: 'Headless',
    description:
      'Zero CSS, zero opinions. Bring your own design system, Tailwind classes, or any component library — UniForm only provides structure.',
  },
  {
    title: 'Fully customizable',
    description:
      'Swap any component, slot, wrapper, or field at every level. Per-instance, per-factory, or per-field — total control with a clean API.',
  },
]

const installCode = `npm install @uniform/core react react-hook-form zod`

const liveExample = `const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

const myForm = createForm(schema)

function App() {
  const [result, setResult] = React.useState(null)
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ role: 'user', subscribe: false }}
        onSubmit={(values) => setResult(values)}
      />
      {result && (
        <pre style={{ marginTop: '1rem', background: '#f5f5f5', padding: '1rem', borderRadius: 6 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}

render(<App />)`

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      {/* Hero */}
      <header
        style={{
          padding: '4rem 2rem',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
          color: '#fff',
        }}
      >
        <Heading
          as='h1'
          style={{ fontSize: '3rem', fontWeight: 800, marginBottom: '1rem' }}
        >
          UniForm
        </Heading>
        <p
          style={{
            fontSize: '1.25rem',
            opacity: 0.9,
            maxWidth: 560,
            margin: '0 auto 2rem',
          }}
        >
          {siteConfig.tagline}
        </p>
        <Link className='button button--secondary button--lg' to='/docs/intro'>
          Get Started →
        </Link>
      </header>

      <main>
        {/* Feature grid */}
        <section
          style={{
            padding: '3rem 2rem',
            maxWidth: 960,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {features.map((f) => (
            <div
              key={f.title}
              style={{
                padding: '1.5rem',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                background: '#fafafa',
              }}
            >
              <Heading as='h3' style={{ color: '#4f46e5' }}>
                {f.title}
              </Heading>
              <p style={{ color: '#374151', lineHeight: 1.6 }}>
                {f.description}
              </p>
            </div>
          ))}
        </section>

        {/* Install */}
        <section
          style={{
            padding: '2rem',
            maxWidth: 700,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <Heading as='h2'>Install in seconds</Heading>
          <CodeBlock language='bash'>{installCode}</CodeBlock>
        </section>

        {/* Live example */}
        <section
          style={{
            padding: '2rem',
            maxWidth: 700,
            margin: '0 auto 4rem',
          }}
        >
          <Heading as='h2' style={{ textAlign: 'center' }}>
            Live Example
          </Heading>
          <p
            style={{
              color: '#6b7280',
              textAlign: 'center',
              marginBottom: '1.5rem',
            }}
          >
            Define a Zod schema, call <code>createForm</code>, render{' '}
            <code>&lt;AutoForm&gt;</code>. That&apos;s it.
          </p>
          <CodeBlock language='jsx' metastring='live noInline'>
            {liveExample}
          </CodeBlock>
        </section>
      </main>
    </Layout>
  )
}
