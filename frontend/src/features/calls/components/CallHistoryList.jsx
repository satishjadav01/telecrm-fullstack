import { Button, Chip } from '@heroui/react'
import { Download, PlayCircle } from 'lucide-react'
import { CallDirectionChip } from '../../../components/common/CallDirectionChip'

const DISPOSITION_LABELS = {
  converted: 'Converted',
  interested: 'Interested',
  callback: 'Callback',
  no_answer: 'No Answer',
  busy: 'Busy',
  not_interested: 'Not Interested',
  in_progress: 'In Progress',
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-IN', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (value) => {
  const secs = Number(value)
  if (!Number.isFinite(secs) || secs <= 0) return '-'
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${String(rem).padStart(2, '0')}s`
}

function CallHistoryList({ items = [], onPlay, onDownload, busyAction }) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-black/10 bg-white/60 p-4 text-center">
        <p className="text-sm font-medium">No call history</p>
        <p className="muted mt-1 text-xs text-black/50">Calls will appear here once made or received.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((call) => {
        const canPlay = Boolean(call.recording)
        const isPlaying = busyAction === `play:${call.id}`
        const isDownloading = busyAction === `download:${call.id}`
        const disposition = call.disposition || 'in_progress'

        return (
          <div
            key={call.id}
            className="group relative rounded-2xl border border-black/10 bg-white/70 p-3 transition hover:bg-white"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">
                    {DISPOSITION_LABELS[disposition] || disposition}
                  </span>
                  <CallDirectionChip direction={call.direction} size="sm" />
                </div>
                <p className="muted mt-1 text-xs">
                  {formatDateTime(call.createdAt)} • {formatDuration(call.durationSeconds)}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
                {canPlay && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => onPlay?.(call.id)}
                    isDisabled={isPlaying || isDownloading}
                  >
                    <PlayCircle size={16} />
                  </Button>
                )}
                {canPlay && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    onPress={() => onDownload?.(call)}
                    isDisabled={isDownloading || isPlaying}
                  >
                    <Download size={16} />
                  </Button>
                )}
              </div>
            </div>
            {call.notes && (
              <p className="mt-2 text-xs text-black/70 italic border-l-2 border-black/5 pl-2">
                "{call.notes}"
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
               <p className="text-[10px] muted uppercase tracking-wider font-medium">
                  By {call.agent?.fullName || 'Agent'}
               </p>
               {call.phoneDevice?.label && (
                 <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/5 text-black/60 font-medium">
                   {call.phoneDevice.label}
                 </span>
               )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default CallHistoryList
