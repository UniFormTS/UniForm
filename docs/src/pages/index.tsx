import type { ReactNode } from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import Heading from '@theme/Heading'
import CodeBlock from '@theme/CodeBlock'
import styles from './index.module.css'

const features = [
  {
    icon: '🧩',
    title: 'Schema-driven',
    description:
      'Define your form once with Zod V4. UniForm introspects the schema and renders fully typed inputs, labels, validation, and coercions automatically.',
  },
  {
    icon: '🎨',
    title: 'Headless',
    description:
      'Zero CSS, zero opinions. Bring your own design system, Tailwind classes, or any component library — UniForm only provides structure.',
  },
  {
    icon: '⚙️',
    title: 'Fully customizable',
    description:
      'Swap any component, slot, wrapper, or field at every level. Per-instance, per-factory, or per-field — total control with a clean API.',
  },
]

const installCode = `npm install @uniform-ts/core react react-hook-form zod`

const liveExample = `const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.enum(['user', 'admin', 'editor']),
  subscribe: z.boolean(),
})

const myForm = createForm(schema)

function App() {
  return (
    <div style={{ fontFamily: 'system-ui', maxWidth: 480 }}>
      <AutoForm
        form={myForm}
        defaultValues={{ role: 'user', subscribe: false }}
        onSubmit={(values) => { /* your submit logic */ }}
      />
    </div>
  )
}

render(<App />)`

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      {/* Hero */}
      <header className={styles.heroBanner}>
        <div className={styles.heroBadge}>
          Zero styles · Total control · Zod V4
        </div>
        <Heading as='h1' className={styles.heroTitle}>
          UniForm
        </Heading>
        <p className={styles.heroSubtitle}>{siteConfig.tagline}</p>
        <div className={styles.heroButtons}>
          <Link className='button button--primary button--lg' to='/docs/intro'>
            Get Started →
          </Link>
          <Link
            className='button button--secondary button--lg'
            href='https://github.com/UniFormTS/UniForm'
          >
            GitHub
          </Link>
        </div>
      </header>

      <main>
        {/* Feature grid */}
        <section className={styles.featuresGrid}>
          {features.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <Heading as='h3' className={styles.featureTitle}>
                {f.title}
              </Heading>
              <p className={styles.featureDescription}>{f.description}</p>
            </div>
          ))}
        </section>

        {/* Install */}
        <section className={styles.installSection}>
          <Heading as='h2'>Install in seconds</Heading>
          <CodeBlock language='bash'>{installCode}</CodeBlock>
        </section>

        {/* Live example */}
        <section className={styles.liveExampleSection}>
          <Heading as='h2' className={styles.liveExampleTitle}>
            Example
          </Heading>
          <p className={styles.liveExampleSubtitle}>
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
