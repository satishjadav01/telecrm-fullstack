import { Card } from '@heroui/react'
import { CalendarClock, PhoneCall, Settings2, Upload, UsersRound, HelpCircle } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import { flowSteps } from '../../../data/mockFlowData'
const icons = [Settings2, Upload, UsersRound, PhoneCall, CalendarClock, HelpCircle]
function HelpPage() {
  return (
    <div className="space-y-6 overflow-hidden">
      <PageHeader
        title="Help & Resources"
        description="A plain-language guide to the main parts of Tele CRM and what to do on each screen."
      />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="tele-card flex flex-col items-center justify-center p-5 text-center sm:p-8">
          <div className="mb-4 rounded-xl bg-tele-light p-4 text-tele-primary">
            <HelpCircle size={32} />
          </div>
          <h3 className="text-xl font-bold text-tele-dark">Need Assistance?</h3>
          <p className="mt-2 text-sm text-gray-500">
            Our support team is available 24/7 to help you with any technical issues or questions.
          </p>
        </div>
        <div className="tele-card p-0 md:col-span-2 flex flex-col">
          <div className="p-6 border-b border-tele-border">
            <h2 className="text-xl font-bold text-tele-dark">How the app fits together</h2>
            <p className="text-sm text-gray-500 mt-1">A simple walk-through of the daily workflow.</p>
          </div>
          <div className="p-6 grid gap-4 sm:grid-cols-2 bg-gray-50/30">
            {flowSteps.map((step, index) => {
              const Icon = icons[index] || Settings2
              return (
                <div
                  key={step.title}
                  className="flex flex-col gap-3 rounded-card border border-tele-border bg-white p-4 transition-all hover:border-tele-primary hover:shadow-md sm:flex-row sm:gap-4 sm:p-5"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tele-light text-tele-primary">
                    <Icon size={20} />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-tele-dark">
                      {index + 1}. {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{step.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="tele-card overflow-hidden">
        <div className="bg-tele-primary p-6 sm:p-8 text-white">
          <h2 className="text-2xl font-bold">Getting Started</h2>
          <p className="mt-2 text-white/80">A short guide to the first actions most users should take.</p>
        </div>
        <div className="p-6 sm:p-8 bg-white">
          <div className="grid gap-8 md:grid-cols-3">
            <div>
              <h4 className="font-bold text-tele-primary mb-2">1. Configure the workspace</h4>
              <p className="text-sm text-gray-600">Set up lead stages, team access, and company settings in Admin Setup.</p>
            </div>
            <div>
              <h4 className="font-bold text-tele-primary mb-2">2. Import leads</h4>
              <p className="text-sm text-gray-600">Upload a CSV or Excel file to add people you want the team to contact.</p>
            </div>
            <div>
              <h4 className="font-bold text-tele-primary mb-2">3. Start working the queue</h4>
              <p className="text-sm text-gray-600">Agents can open calls, update outcomes, and schedule follow-ups from the work views.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default HelpPage
