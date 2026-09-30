import { Button, Input } from '@heroui/react'
import { useMemo, useState } from 'react'

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

const toLocalDateTimeInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function FollowUpFormModal({
  isOpen,
  mode = 'create', // 'create' | 'edit'
  initialFollowUp,
  defaultLeadId,
  canEdit,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [leadId, setLeadId] = useState(() => initialFollowUp?.leadId || initialFollowUp?.lead?.id || defaultLeadId || '')
  const [dueAt, setDueAt] = useState(() =>
    toLocalDateTimeInput(initialFollowUp?.dueAt) || toLocalDateTimeInput(new Date(Date.now() + 60 * 60 * 1000)),
  )
  const [reminderAt, setReminderAt] = useState(() => toLocalDateTimeInput(initialFollowUp?.reminderAt))
  const [reason, setReason] = useState(() => initialFollowUp?.reason || '')
  const [priority, setPriority] = useState(() => Number(initialFollowUp?.priority || 3))
  const [note, setNote] = useState(() => initialFollowUp?.note || '')
  const [status, setStatus] = useState(() => initialFollowUp?.status || 'pending')
  const [touched, setTouched] = useState(false)

  const serverFieldErrors = useMemo(() => normalizeServerIssues(error?.details), [error?.details])

  const fieldErrors = useMemo(() => {
    const next = {}
    if (!touched) return next

    if (mode === 'create' && !leadId) next.leadId = 'Lead ID is required'
    if (!dueAt) next.dueAt = 'Due date/time is required'
    const p = Number(priority)
    if (Number.isNaN(p) || p < 1 || p > 5) next.priority = 'Priority must be between 1 and 5'

    return next
  }, [touched, leadId, dueAt, priority, mode])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canEdit) return
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload =
      mode === 'create'
        ? {
          leadId,
          dueAt: new Date(dueAt).toISOString(),
          reminderAt: reminderAt ? new Date(reminderAt).toISOString() : undefined,
          reason: reason ? reason.trim() : undefined,
          priority: Number(priority) || undefined,
          note: note ? note.trim() : undefined,
        }
        : {
          dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          reminderAt: reminderAt === '' ? null : new Date(reminderAt).toISOString(),
          reason: reason ? reason.trim() : undefined,
          priority: Number(priority) || undefined,
          note: note ? note.trim() : undefined,
          status: status || undefined,
          completedAt: status === 'completed' ? new Date().toISOString() : undefined,
        }

    await onSubmit?.(payload)
  }

  if (!isOpen) return null

  const inputClasses = "w-full px-3 py-2.5 border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-sm bg-white hover:border-gray-300"

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 tracking-tight">
              {mode === 'create' ? 'Schedule Follow-up' : 'Edit Follow-up'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Set the next action, due date, and assign priority.
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto px-6 py-5 flex-1">
          {topError && (
            <div className="mb-6 p-4 rounded-xl border border-red-100 bg-red-50 text-red-600 text-sm font-medium flex items-start gap-3">
              <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>{topError}</p>
            </div>
          )}

          <form id="followup-form" className="space-y-8" onSubmit={handleSubmit}>
            
            {/* Section: Timing */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Timing</h3>
              
              {mode === 'create' && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Lead ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    className={`${inputClasses} ${fieldErrors.leadId || serverFieldErrors.leadId ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    placeholder="Paste lead UUID"
                    value={leadId}
                    onChange={(e) => setLeadId(e.target.value)}
                    disabled={!canEdit}
                  />
                  {(fieldErrors.leadId || serverFieldErrors.leadId) && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.leadId || serverFieldErrors.leadId}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Due Date & Time <span className="text-red-500">*</span></label>
                  <input
                    type="datetime-local"
                    className={`${inputClasses} ${fieldErrors.dueAt || serverFieldErrors.dueAt ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    value={dueAt}
                    onChange={(e) => setDueAt(e.target.value)}
                    disabled={!canEdit}
                  />
                  {(fieldErrors.dueAt || serverFieldErrors.dueAt) && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.dueAt || serverFieldErrors.dueAt}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Reminder (Optional)</label>
                  <input
                    type="datetime-local"
                    className={inputClasses}
                    value={reminderAt}
                    onChange={(e) => setReminderAt(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
              </div>
            </section>

            <hr className="border-gray-100" />

            {/* Section: Details */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Reason</label>
                  <input
                    type="text"
                    className={inputClasses}
                    placeholder="e.g. Call back, send quote..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    disabled={!canEdit}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">Priority (1-5)</label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    className={`${inputClasses} ${fieldErrors.priority || serverFieldErrors.priority ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    disabled={!canEdit}
                  />
                  {(fieldErrors.priority || serverFieldErrors.priority) && (
                    <p className="text-xs text-red-500 mt-1">{fieldErrors.priority || serverFieldErrors.priority}</p>
                  )}
                </div>
              </div>

              {mode === 'edit' && (
                <div className="space-y-1.5 pt-2">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    className={inputClasses}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    disabled={!canEdit}
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              )}
            </section>

            <hr className="border-gray-100" />

            {/* Section: Notes */}
            <section className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Notes</h3>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 hidden">Internal Note</label>
                <textarea
                  className={`${inputClasses} min-h-[100px] resize-y leading-relaxed`}
                  placeholder="Add any helpful context or instructions here..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={!canEdit}
                />
              </div>
            </section>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
          <Button 
            variant="flat" 
            className="font-medium bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50"
            onPress={onClose}
          >
            Cancel
          </Button>
          <Button 
            color="primary" 
            type="submit" 
            form="followup-form"
            isLoading={isSaving} 
            isDisabled={!canEdit}
            className="font-medium shadow-sm"
          >
            {mode === 'create' ? 'Create Follow-up' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default FollowUpFormModal
