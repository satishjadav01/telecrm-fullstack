import { Button, Card, Chip, Tabs, Tab } from '@heroui/react'
import { PhoneCall, StickyNote, X, History, Mic } from 'lucide-react'
import { STAGE_OPTIONS } from './LeadFormModal'
import RecordingUploadCard from '../../recordings/components/RecordingUploadCard'
import CallHistoryList from '../../calls/components/CallHistoryList'

const stageLabel = (value) => STAGE_OPTIONS.find((s) => s.value === value)?.label || value || '-'

function LeadDetailPanel({
  isOpen,
  lead,
  canEdit,
  callState,
  callResult,
  isStartingCall,
  onStartCall,
  onOpenDisposition,
  recordings, // Not used directly anymore as we use lead.calls
  recordingsLoading,
  recordingsError,
  onRefreshRecordings,
  onUploadRecording,
  canUploadRecording,
  onClose,
  onEdit,
  // New props for recording actions
  onPlayRecording,
  onDownloadRecording,
  busyRecordingAction,
}) {
  if (!isOpen) return null

  const isLoading = !lead

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/20 md:bg-black/10"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 md:inset-y-0 md:right-0 md:left-auto md:w-[420px]">
        <Card className="glass h-[85vh] w-full rounded-t-3xl md:h-full md:rounded-none md:rounded-l-3xl">
          <Card.Header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-lg font-semibold">
                {(lead?.firstName || lead?.lastName)
                  ? `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim()
                  : 'Lead details'}
              </p>
              <p className="muted mt-1 text-sm">{lead?.phonePrimary || '-'}</p>
            </div>
            <Button
              isIconOnly
              className="border border-black/10 bg-white/70"
              onPress={onClose}
            >
              <X size={16} />
            </Button>
          </Card.Header>
          <Card.Content className="space-y-4 overflow-y-auto pb-24 md:pb-6">
            {isLoading ? (
              <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
                <p className="font-medium">Loading lead details...</p>
                <p className="muted mt-1 text-sm">Fetching latest record from the backend.</p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Chip className="bg-[#e7f4ee] text-[#1d5f4d]" variant="flat">
                  {stageLabel(lead?.stage)}
                </Chip>
                {lead?.assignee?.fullName ? (
                  <Chip className="bg-white/70 text-black" variant="flat">
                    Owner: {lead.assignee.fullName}
                  </Chip>
                ) : (
                  <Chip className="bg-[#fce8df] text-[#9a3e19]" variant="flat">
                    Unassigned
                  </Chip>
                )}
              </div>
            )}
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <p className="text-sm font-semibold">Lead info</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <dt className="muted">Email</dt>
                  <dd className="text-right">{lead?.email || '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="muted">Alt phone</dt>
                  <dd className="text-right">{lead?.phoneAlternate || '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="muted">Source</dt>
                  <dd className="text-right">{lead?.source || '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="muted">City</dt>
                  <dd className="text-right">{lead?.city || '-'}</dd>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <dt className="muted">Priority</dt>
                  <dd className="text-right">{lead?.priority ?? '-'}</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <p className="text-sm font-semibold">Notes</p>
              <p className="muted mt-2 whitespace-pre-wrap text-sm">
                {lead?.notes || 'No notes yet.'}
              </p>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white/60 p-4">
              <p className="text-sm font-semibold">Actions</p>
              {callResult?.message ? (
                <div className="mt-3 rounded-xl border border-black/10 bg-white/70 p-3">
                  <p className="text-sm font-medium">{callResult.message}</p>
                  {callResult.followUpAt ? (
                    <p className="muted mt-1 text-xs">Follow-up at: {callResult.followUpAt}</p>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2">
                {!callState?.id ? (
                  <Button
                    className="border border-black/10 bg-white/75 text-black"
                    startContent={<PhoneCall size={16} />}
                    isDisabled={isLoading || isStartingCall}
                    isLoading={isStartingCall}
                    onPress={onStartCall}
                  >
                    Start call
                  </Button>
                ) : (
                  <div className="rounded-xl border border-black/10 bg-white/70 p-3">
                    <p className="text-sm font-medium">Call in progress</p>
                    <p className="muted mt-1 text-xs">Call ID: {callState.id}</p>
                    <Button
                      className="mt-3 w-full bg-[#cb5f31] text-white"
                      startContent={<StickyNote size={16} />}
                      onPress={onOpenDisposition}
                    >
                      Apply disposition
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <Tabs aria-label="Lead Timeline" className="w-full">
              <Tab
                key="calls"
                title={
                  <div className="flex items-center gap-2">
                    <History size={14} />
                    <span>Call History</span>
                  </div>
                }
              >
                <div className="mt-2 space-y-3">
                  <CallHistoryList
                    items={lead?.calls || []}
                    onPlay={onPlayRecording}
                    onDownload={onDownloadRecording}
                    busyAction={busyRecordingAction}
                  />
                </div>
              </Tab>
              <Tab
                key="recordings"
                title={
                  <div className="flex items-center gap-2">
                    <Mic size={14} />
                    <span>Recordings</span>
                  </div>
                }
              >
                <div className="mt-2 space-y-3">
                  <RecordingUploadCard
                    canUpload={canUploadRecording}
                    activeCallId={callState?.id || null}
                    onUpload={onUploadRecording}
                  />
                  {/* We can still show the old recording list if needed, but lead.calls should suffice */}
                </div>
              </Tab>
            </Tabs>
          </Card.Content>

          <div className="absolute inset-x-0 bottom-0 flex gap-2 border-t border-black/10 bg-white/60 p-3 backdrop-blur md:static md:border-t-0 md:bg-transparent md:p-4">
            <Button
              className="w-full border border-black/10 bg-white/75 text-black"
              onPress={onClose}
            >
              Close
            </Button>
            <Button
              className="w-full bg-[#cb5f31] text-white"
              onPress={onEdit}
              isDisabled={!canEdit}
            >
              Edit
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default LeadDetailPanel
