import { Button, Card, Chip } from '@heroui/react'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'

const STAGE_OPTIONS = [
  { value: 'new', label: 'New' },
  { value: 'attempted', label: 'Attempted' },
  { value: 'connected', label: 'Connected' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'converted', label: 'Converted' },
  { value: 'dropped', label: 'Dropped' },
]

const ASSIGNMENT_MODES = [
  { value: 'none', label: 'Unassigned' },
  { value: 'manual', label: 'Manual' },
  { value: 'round_robin', label: 'Round robin' },
]

const normalizeServerIssues = (details) => {
  if (!Array.isArray(details)) return {}

  const byField = {}
  for (const issue of details) {
    const path = Array.isArray(issue.path) ? issue.path : []
    const last = path[path.length - 1]
    if (!last) continue
    if (!byField[last]) byField[last] = issue.message || 'Invalid value'
  }
  return byField
}

const isNonEmpty = (v) => typeof v === 'string' && v.trim().length > 0

function LeadFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialLead,
  assignees = [],
  canEdit,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [firstName, setFirstName] = useState(() => initialLead?.firstName || '')
  const [lastName, setLastName] = useState(() => initialLead?.lastName || '')
  const [phonePrimary, setPhonePrimary] = useState(() => initialLead?.phonePrimary || '')
  const [phoneAlternate, setPhoneAlternate] = useState(() => initialLead?.phoneAlternate || '')
  const [email, setEmail] = useState(() => initialLead?.email || '')
  const [source, setSource] = useState(() => initialLead?.source || '')
  const [city, setCity] = useState(() => initialLead?.city || '')
  const [stage, setStage] = useState(() => initialLead?.stage || 'new')
  const [priority, setPriority] = useState(() => Number(initialLead?.priority || 3))
  const [notes, setNotes] = useState(() => initialLead?.notes || '')
  const [assignmentMode, setAssignmentMode] = useState('none')
  const [assignedTo, setAssignedTo] = useState(() => initialLead?.assignee?.id || '')
  const [touched, setTouched] = useState(false)

  const serverFieldErrors = useMemo(() => normalizeServerIssues(error?.details), [error?.details])
  const agentAssignees = useMemo(
    () => assignees.filter((u) => (u?.role?.code || '').toLowerCase() === 'agent'),
    [assignees],
  )

  const fieldErrors = useMemo(() => {
    const next = {}
    if (!touched) return next

    if (!isNonEmpty(phonePrimary) || phonePrimary.trim().length < 5) {
      next.phonePrimary = 'Primary phone is required (min 5 chars)'
    }

    if (assignmentMode === 'manual' && !isNonEmpty(assignedTo)) {
      next.assignedTo = 'Assigned user is required for manual assignment'
    }

    if (priority < 1 || priority > 5) {
      next.priority = 'Priority must be between 1 and 5'
    }

    return next
  }, [touched, phonePrimary, assignmentMode, assignedTo, priority])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payloadBase = {
      firstName: isNonEmpty(firstName) ? firstName.trim() : undefined,
      lastName: isNonEmpty(lastName) ? lastName.trim() : undefined,
      phonePrimary: phonePrimary.trim(),
      phoneAlternate: isNonEmpty(phoneAlternate) ? phoneAlternate.trim() : undefined,
      email: isNonEmpty(email) ? email.trim() : undefined,
      source: isNonEmpty(source) ? source.trim() : undefined,
      city: isNonEmpty(city) ? city.trim() : undefined,
      stage,
      priority: Number(priority),
      notes: isNonEmpty(notes) ? notes.trim() : undefined,
    }

    const assignmentPayload =
      assignmentMode === 'none'
        ? { assignmentMode: 'none' }
        : assignmentMode === 'round_robin'
          ? { assignmentMode: 'round_robin' }
          : { assignmentMode: 'manual', assignedTo }

    await onSubmit?.({ ...payloadBase, ...assignmentPayload })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-1.5 sm:p-3 md:items-center md:px-3 md:py-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] sm:max-h-[calc(100dvh-1.5rem)] bg-white shadow-xl">
        <div className="flex items-start justify-between px-6 pb-3 pt-6 border-b border-tele-border">
          <div className="min-w-0 flex-1">
            <Chip className="bg-tele-light text-tele-primary mb-2" variant="flat">
              {mode === 'create' ? 'Create Lead' : 'Edit Lead'}
            </Chip>
            <p className="text-xl font-bold text-tele-dark">
              {mode === 'create' ? 'Add a new lead' : 'Update lead details'}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Create a contact and assign its workflow.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close"
            className="ml-4 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition-all hover:bg-gray-200 hover:text-gray-700"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-6 bg-gray-50/50">
          {topError ? (
            <div className="mb-6 rounded-card border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
              <p className="text-sm font-medium text-red-700">{topError}</p>
            </div>
          ) : null}
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="rounded-card border border-tele-border bg-white p-5 shadow-sm space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-bold text-tele-dark">Contact details</p>
                <p className="text-xs text-gray-500">
                  Enter the lead’s name and contact details.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">First name</span>
                  <input
                    type="text"
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    placeholder="Rahul"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Last name</span>
                  <input
                    type="text"
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={`mb-1.5 block text-sm font-medium ${fieldErrors.phonePrimary || serverFieldErrors.phonePrimary ? 'text-red-600' : 'text-tele-dark'}`}>Primary phone</span>
                  <input
                    type="text"
                    className={`w-full rounded-input border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none transition-all ${fieldErrors.phonePrimary || serverFieldErrors.phonePrimary ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-tele-border focus:border-tele-primary focus:ring-1 focus:ring-tele-primary'}`}
                    placeholder="9876543210"
                    value={phonePrimary}
                    onChange={(e) => setPhonePrimary(e.target.value)}
                    disabled={!canEdit}
                  />
                  {fieldErrors.phonePrimary || serverFieldErrors.phonePrimary ? (
                    <span className="mt-1 block text-xs font-medium text-red-600">
                      {fieldErrors.phonePrimary || serverFieldErrors.phonePrimary}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Alternate phone</span>
                  <input
                    type="text"
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    placeholder="Optional alternate number"
                    value={phoneAlternate}
                    onChange={(e) => setPhoneAlternate(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={`mb-1.5 block text-sm font-medium ${serverFieldErrors.email ? 'text-red-600' : 'text-tele-dark'}`}>Email</span>
                  <input
                    type="email"
                    className={`w-full rounded-input border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none transition-all ${serverFieldErrors.email ? 'border-red-300 ring-1 ring-red-300 bg-red-50' : 'border-tele-border focus:border-tele-primary focus:ring-1 focus:ring-tele-primary'}`}
                    placeholder="lead@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={!canEdit}
                  />
                  {serverFieldErrors.email ? (
                    <span className="mt-1 block text-xs font-medium text-red-600">
                      {serverFieldErrors.email}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Lead source</span>
                  <input
                    type="text"
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    placeholder="Facebook Ads"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>
              </div>
            </div>
            
            <div className="rounded-card border border-tele-border bg-white p-5 shadow-sm space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-bold text-tele-dark">Lead status</p>
                <p className="text-xs text-gray-500">
                  Track stage and priority.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">City</span>
                  <input
                    type="text"
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    placeholder="Mumbai"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!canEdit}
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Stage</span>
                  <select
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    value={stage}
                    disabled={!canEdit}
                    onChange={(e) => setStage(e.target.value)}
                  >
                    {STAGE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Priority (1-5)</span>
                  <input
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    type="number"
                    min="1"
                    max="5"
                    value={priority}
                    disabled={!canEdit}
                    onChange={(e) => setPriority(Number(e.target.value))}
                  />
                  {fieldErrors.priority ? (
                    <span className="mt-1 block text-xs font-medium text-red-600">
                      {fieldErrors.priority}
                    </span>
                  ) : null}
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-tele-dark">Assignment mode</span>
                  <select
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                    value={assignmentMode}
                    disabled={!canEdit}
                    onChange={(e) => setAssignmentMode(e.target.value)}
                  >
                    {ASSIGNMENT_MODES.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            
            {assignmentMode === 'manual' ? (
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-tele-dark">Who should own this lead?</span>
                <select
                  className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                  value={assignedTo}
                  disabled={!canEdit}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">{agentAssignees.length ? 'Select agent' : 'No active agents available'}</option>
                  {agentAssignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.fullName} ({u.role?.code || 'role'})
                    </option>
                  ))}
                </select>
                {fieldErrors.assignedTo ? (
                  <span className="mt-1 block text-xs font-medium text-red-600">
                    {fieldErrors.assignedTo}
                  </span>
                ) : null}
              </label>
            ) : null}
            
            <div className="rounded-card border border-tele-border bg-white p-5 shadow-sm space-y-5">
              <div className="space-y-1">
                <p className="text-sm font-bold text-tele-dark">Notes</p>
                <p className="text-xs text-gray-500">
                  Add context for seamless follow-ups.
                </p>
              </div>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-tele-dark">Internal notes</span>
                <textarea
                  className="min-h-24 w-full resize-y rounded-input border border-tele-border bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                  value={notes}
                  disabled={!canEdit}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add context for the next caller..."
                />
              </label>
            </div>
            
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end pt-2 border-t border-tele-border">
              <Button
                className="w-full rounded-btn border border-tele-border bg-white text-gray-700 font-medium hover:bg-gray-50 sm:w-auto transition-colors"
                type="button"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="w-full rounded-btn bg-tele-primary text-white font-medium hover:bg-tele-secondary transition-colors sm:w-auto"
                type="submit"
                isDisabled={!canEdit}
                isLoading={isSaving}
              >
                {mode === 'create' ? 'Create lead' : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LeadFormModal
export { STAGE_OPTIONS }
