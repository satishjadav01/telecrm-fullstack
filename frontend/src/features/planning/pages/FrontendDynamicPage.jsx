import { Card, Chip } from '@heroui/react'
import PageHeader from '../../../components/common/PageHeader'
import { dynamicPlanSteps } from '../../../data/dynamicPlanData'

function FrontendDynamicPage() {
  return (
    <section className="space-y-4">
      <PageHeader
        badge="Roadmap"
        title="Frontend implementation plan"
        description="A guided checklist for replacing mock screens with real API-driven screens."
        ctaLabel="Start at step 1"
      />

      <div className="space-y-4">
        {dynamicPlanSteps.map((step) => (
          <Card key={step.id} className="glass rounded-3xl">
            <Card.Header className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide muted">Phase {step.id}</p>
                <h2 className="text-xl font-semibold md:text-2xl">{step.title}</h2>
                <p className="muted mt-1 text-sm">{step.goal}</p>
              </div>
              <Chip className="bg-[#f2e3d8] text-[#713720]" variant="flat">
                Pending
              </Chip>
            </Card.Header>

            <Card.Content className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white/55 p-4">
                <p className="mb-2 text-sm font-semibold">Backend Endpoints</p>
                <ul className="space-y-2 text-sm muted">
                  {step.backend.map((endpoint) => (
                    <li key={endpoint} className="rounded-lg bg-white/70 px-3 py-2 font-mono text-[12px] md:text-sm">
                      {endpoint}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/55 p-4">
                <p className="mb-2 text-sm font-semibold">Frontend Tasks</p>
                <ol className="space-y-2 text-sm muted">
                  {step.frontend.map((task, index) => (
                    <li key={task} className="rounded-lg bg-white/70 px-3 py-2">
                      {index + 1}. {task}
                    </li>
                  ))}
                </ol>
              </div>
            </Card.Content>
          </Card>
        ))}
      </div>
    </section>
  )
}

export default FrontendDynamicPage
