import { Button, Card, Chip, Input } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'

const DISPOSITIONS = [
  { value: 'no_answer', label: 'No answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'interested', label: 'Interested' },
  { value: 'not_interested', label: 'Not interested' },
  { value: 'callback', label: 'Callback' },
  { value: 'converted', label: 'Converted' },
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

function DispositionModal({
  isOpen,
  call,
  canSubmit,
  isSaving,
  error,
  onClose,
  onSubmit,
}) {
  const [disposition, setDisposition] = useState('no_answer')
  const [notes, setNotes] = useState('')
  const [followUpRequired, setFollowUpRequired] = useState(false)
  const [followUpAt, setFollowUpAt] = useState('')
  const [followUpReason, setFollowUpReason] = useState('')
  const [followUpPriority, setFollowUpPriority] = useState(3)
  const [touched, setTouched] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setDisposition('no_answer')
    setNotes('')
    setFollowUpRequired(false)
    setFollowUpAt('')
    setFollowUpReason('')
    setFollowUpPriority(3)
    setTouched(false)
  }, [isOpen, call?.id])

  useEffect(() => {
    // Callback implies follow-up required by default.
    if (disposition === 'callback') {
      setFollowUpRequired(true)
      if (!followUpAt) {
        // Suggest +30 minutes.
        const d = new Date(Date.now() + 30 * 60 * 1000)
        setFollowUpAt(toLocalDateTimeInput(d))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disposition])

  const serverFieldErrors = useMemo(() => normalizeServerIssues(error?.details), [error?.details])

  const fieldErrors = useMemo(() => {
    const next = {}
    if (!touched) return next

    if (!disposition) next.disposition = 'Disposition is required'

    if (followUpRequired && !followUpAt) {
      next.followUpAt = 'Follow-up date/time is required'
    }

    const p = Number(followUpPriority)
    if (Number.isNaN(p) || p < 1 || p > 5) {
      next.followUpPriority = 'Priority must be between 1 and 5'
    }

    return next
  }, [touched, disposition, followUpRequired, followUpAt, followUpPriority])

  const topError = error?.message ? error.message : null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!canSubmit) return
    setTouched(true)
    if (Object.keys(fieldErrors).length) return

    const payload = {
      disposition,
      notes: notes ? notes.trim() : undefined,
      // Let backend compute endedAt if omitted.
      followUpRequired,
      followUpAt: followUpRequired ? new Date(followUpAt).toISOString() : undefined,
      followUpReason: followUpReason ? followUpReason.trim() : undefined,
      followUpPriority: Number(followUpPriority) || undefined,
    }

    await onSubmit?.(payload)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-1.5 sm:p-3 md:items-center md:px-3 md:py-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />

      <Card className="glass relative flex max-h-[calc(100dvh-1rem)] w-full max-w-xl flex-col overflow-hidden rounded-[2rem] sm:max-h-[calc(100dvh-1.5rem)]">
        <Card.Header className="px-4 pb-3 pt-4 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="min-w-0">
            <Chip className="bg-[#e8f4ef] text-[#1f5f50]" variant="flat">
              Call Disposition
            </Chip>
            <p className="mt-2 text-xl font-semibold">Complete the call</p>
            <p className="muted mt-1 text-sm">
              Choose outcome, add notes, and schedule follow-up when needed.
            </p>
            {call?.id ? (
              <p className="muted mt-1 text-xs">Call ID: {call.id}</p>
            ) : null}
          </div>
        </Card.Header>

        <Card.Content className="overflow-y-auto px-4 pb-3 pt-0 sm:px-6 sm:pb-6">
          {topError ? (
            <div className="mb-4 rounded-2xl border border-[#cb5f31]/20 bg-[#fce8df] px-4 py-3">
              <p className="text-sm font-medium text-[#9a3e19]">{topError}</p>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black">Disposition</span>
              <select
                className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                value={disposition}
                disabled={!canSubmit}
                onChange={(e) => setDisposition(e.target.value)}
              >
                {DISPOSITIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {fieldErrors.disposition ? (
                <span className="mt-1 block text-xs font-medium text-[#9a3e19]">
                  {fieldErrors.disposition}
                </span>
              ) : null}
            </label>

            <label className="block">
              <span className="mb-1 block text-sm font-medium text-black">Notes</span>
              <textarea
                className="min-h-24 w-full resize-y rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                value={notes}
                disabled={!canSubmit}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key points, objections, next steps..."
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium text-black">Follow-up required</span>
                <select
                  className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                  value={followUpRequired ? 'yes' : 'no'}
                  disabled={!canSubmit}
                  onChange={(e) => setFollowUpRequired(e.target.value === 'yes')}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>

              <Input
                label="Follow-up priority (1-5)"
                type="number"
                min={1}
                max={5}
                value={String(followUpPriority)}
                onChange={(e) => setFollowUpPriority(Number(e.target.value))}
                isDisabled={!canSubmit}
                isInvalid={Boolean(fieldErrors.followUpPriority || serverFieldErrors.followUpPriority)}
                errorMessage={fieldErrors.followUpPriority || serverFieldErrors.followUpPriority}
              />
            </div>

            {followUpRequired ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-black">Follow-up at</span>
                  <input
                    className="w-full rounded-2xl border border-black/10 bg-white/70 px-3 py-2 text-sm outline-none focus:border-black/20"
                    type="datetime-local"
                    value={followUpAt}
                    disabled={!canSubmit}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                  />
                  {(fieldErrors.followUpAt || serverFieldErrors.followUpAt) ? (
                    <span className="mt-1 block text-xs font-medium text-[#9a3e19]">
                      {fieldErrors.followUpAt || serverFieldErrors.followUpAt}
                    </span>
                  ) : null}
                </label>

                <Input
                  label="Follow-up reason"
                  value={followUpReason}
                  onChange={(e) => setFollowUpReason(e.target.value)}
                  isDisabled={!canSubmit}
                  placeholder="Callback, send details, manager call..."
                />
              </div>
            ) : null}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                className="w-full border border-black/10 bg-white/75 text-black sm:w-auto"
                type="button"
                onPress={onClose}
              >
                Cancel
              </Button>
              <Button
                className="w-full bg-[#cb5f31] text-white sm:w-auto"
                type="submit"
                isDisabled={!canSubmit}
                isLoading={isSaving}
              >
                Save disposition
              </Button>
            </div>
          </form>
        </Card.Content>
      </Card>
    </div>
  )
}

export default DispositionModal
