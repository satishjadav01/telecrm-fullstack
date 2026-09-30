// import { Button, Card, Chip } from '@heroui/react'
// import { Play, RefreshCw } from 'lucide-react'
// import { useEffect, useState } from 'react'
// import { recordingsApi } from '../api/recordingsApi'

// const prettyBytes = (bytes) => {
//   const n = Number(bytes)
//   if (!Number.isFinite(n) || n <= 0) return '-'
//   const units = ['B', 'KB', 'MB', 'GB']
//   const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
//   const value = n / 1024 ** i
//   return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
// }

// const fmtDate = (value) => {
//   if (!value) return '-'
//   const d = new Date(value)
//   if (Number.isNaN(d.getTime())) return '-'
//   return d.toLocaleString()
// }

// function RecordingList({ items = [], isLoading, error, onRefresh }) {
//   const [activeCallId, setActiveCallId] = useState(null)
//   const [activeUrl, setActiveUrl] = useState(null)
//   const [isOpening, setIsOpening] = useState(false)
//   const [downloadingCallId, setDownloadingCallId] = useState('')

//   useEffect(() => {
//     if (!activeCallId) {
//       setActiveUrl(null)
//       return
//     }

//     let revokedUrl = null
//     let cancelled = false

//     const load = async () => {
//       setIsOpening(true)
//       try {
//         const objectUrl = await recordingsApi.createPlaybackObjectUrl(activeCallId)
//         if (cancelled) {
//           URL.revokeObjectURL(objectUrl)
//           return
//         }
//         revokedUrl = objectUrl
//         setActiveUrl(objectUrl)
//       } catch {
//         if (!cancelled) setActiveUrl(null)
//       } finally {
//         if (!cancelled) setIsOpening(false)
//       }
//     }

//     load()

//     return () => {
//       cancelled = true
//       if (revokedUrl) URL.revokeObjectURL(revokedUrl)
//     }
//   }, [activeCallId])

//   const downloadRecording = async (recording) => {
//     setDownloadingCallId(recording.callId)
//     try {
//       await recordingsApi.downloadForCall(
//         recording.callId,
//         recording.fileName || `recording-${recording.callId}.webm`,
//       )
//     } finally {
//       setDownloadingCallId('')
//     }
//   }

//   return (
//     <Card className="rounded-2xl border border-black/10 bg-white/60">
//       <Card.Header className="justify-between">
//         <div>
//           <p className="text-sm font-semibold">Recordings</p>
//           <p className="muted mt-1 text-xs">Playback uses secure streaming endpoint.</p>
//         </div>
//         <Button
//           className="border border-black/10 bg-white/75 text-black"
//           startContent={<RefreshCw size={16} />}
//           onPress={onRefresh}
//           isDisabled={isLoading}
//         >
//           Refresh
//         </Button>
//       </Card.Header>

//       <Card.Content className="space-y-3">
//         {error ? (
//           <div className="rounded-xl border border-[#cb5f31]/20 bg-[#fce8df] px-3 py-2">
//             <p className="text-sm font-medium text-[#9a3e19]">{error.message || 'Failed to load recordings'}</p>
//           </div>
//         ) : null}

//         {isLoading ? (
//           <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
//             <p className="muted text-sm">Loading recordings...</p>
//           </div>
//         ) : null}

//         {!isLoading && !items.length ? (
//           <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
//             <p className="muted text-sm">No recordings uploaded yet.</p>
//           </div>
//         ) : null}

//         {!isLoading && items.length ? (
//           <div className="space-y-2">
//             {items.map((r) => (
//               <div
//                 key={r.id || r.callId}
//                 className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
//               >
//                 <div className="min-w-0">
//                   <p className="truncate text-sm font-medium">{r.fileName || 'recording'}</p>
//                   <p className="muted mt-1 text-xs">
//                     {fmtDate(r.createdAt)} • {prettyBytes(r.fileSizeBytes)} • {r.format || r.mimeType || '-'}
//                   </p>
//                   {r.consentCaptured ? (
//                     <Chip className="mt-2 bg-[#e7f4ee] text-[#1d5f4d]" variant="flat">
//                       Consent captured
//                     </Chip>
//                   ) : null}
//                 </div>

//                 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
//                   <Button
//                     className="border border-black/10 bg-white/75 text-black"
//                     startContent={<Play size={16} />}
//                     onPress={() => setActiveCallId(r.callId)}
//                     isDisabled={isOpening && activeCallId === r.callId}
//                   >
//                     {isOpening && activeCallId === r.callId ? 'Opening...' : 'Play'}
//                   </Button>
//                   <Button
//                     className="border border-black/10 bg-white/75 text-black"
//                     onPress={() => downloadRecording(r)}
//                     isDisabled={downloadingCallId === r.callId}
//                   >
//                     {downloadingCallId === r.callId ? 'Downloading...' : 'Download'}
//                   </Button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         ) : null}

//         {activeUrl ? (
//           <div className="rounded-xl border border-black/10 bg-white/70 p-3">
//             <div className="flex items-center justify-between gap-2">
//               <p className="text-sm font-medium">Now playing</p>
//               <button
//                 type="button"
//                 className="text-xs font-medium text-black/60 hover:text-black"
//                 onClick={() => {
//                   setActiveCallId(null)
//                   setActiveUrl(null)
//                 }}
//               >
//                 Close
//               </button>
//             </div>
//             <audio className="mt-2 w-full" controls preload="metadata" src={activeUrl} />
//             <p className="muted mt-2 text-xs">
//               If playback fails, ensure you are logged in and have access to this recording.
//             </p>
//           </div>
//         ) : null}
//       </Card.Content>
//     </Card>
//   )
// }

// export default RecordingList




import { Button, Card, Chip } from '@heroui/react'
import { Play, Pause, RefreshCw } from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import BenzAMRRecorder from 'benz-amr-recorder'
import { recordingsApi } from '../api/recordingsApi'

const prettyBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  const value = n / 1024 ** i
  return `${value.toFixed(value >= 10 || i === 0 ? 0 : 1)} ${units[i]}`
}

const fmtDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

const formatTime = (seconds) => {
  if (!seconds || Number.isNaN(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

function RecordingList({ items = [], isLoading, error, onRefresh }) {
  const [activeRecording, setActiveRecording] = useState(null)
  const activeCallId = activeRecording?.callId || null
  const [activeUrl, setActiveUrl] = useState(null)
  const [isOpening, setIsOpening] = useState(false)
  const [downloadingCallId, setDownloadingCallId] = useState('')

  const amrPlayerRef = useRef(null)
  const [amrPlaying, setAmrPlaying] = useState(false)
  const [amrDuration, setAmrDuration] = useState(0)
  const [amrCurrent, setAmrCurrent] = useState(0)

  const isAmr = activeRecording && (
    activeRecording.format?.toLowerCase() === 'amr' ||
    activeRecording.format?.toLowerCase() === 'erm' ||
    activeRecording.fileName?.toLowerCase().endsWith('.amr') ||
    activeRecording.fileName?.toLowerCase().endsWith('.erm')
  )

  useEffect(() => {
    if (!activeUrl || !isAmr) {
      if (amrPlayerRef.current) {
        try {
          amrPlayerRef.current.stop()
        } catch (err) {}
        amrPlayerRef.current = null
      }
      setAmrPlaying(false)
      setAmrDuration(0)
      setAmrCurrent(0)
      return
    }

    const amr = new BenzAMRRecorder()
    amrPlayerRef.current = amr

    amr.initWithUrl(activeUrl).then(() => {
      setAmrDuration(amr.getDuration())
      amr.play()
      setAmrPlaying(true)
    }).catch(err => {
      console.error("Failed to decode AMR client-side:", err)
    })

    amr.onPlay(() => setAmrPlaying(true))
    amr.onStop(() => setAmrPlaying(false))
    amr.onPause(() => setAmrPlaying(false))
    amr.onEnded(() => {
      setAmrPlaying(false)
      setAmrCurrent(0)
    })

    const timer = setInterval(() => {
      if (amr.isPlaying()) {
        setAmrCurrent(amr.getCurrentPosition())
      }
    }, 250)

    return () => {
      clearInterval(timer)
      try {
        amr.stop()
      } catch (err) {}
      amrPlayerRef.current = null
    }
  }, [activeUrl, isAmr])

  useEffect(() => {
    if (!activeCallId) {
      setActiveUrl(null)
      return
    }

    let revokedUrl = null
    let cancelled = false

    const load = async () => {
      setIsOpening(true)
      try {
        const objectUrl = await recordingsApi.createPlaybackObjectUrl(activeCallId)
        if (cancelled) {
          URL.revokeObjectURL(objectUrl)
          return
        }
        revokedUrl = objectUrl
        setActiveUrl(objectUrl)
      } catch {
        if (!cancelled) setActiveUrl(null)
      } finally {
        if (!cancelled) setIsOpening(false)
      }
    }

    load()

    return () => {
      cancelled = true
      if (revokedUrl) URL.revokeObjectURL(revokedUrl)
    }
  }, [activeCallId])

  const downloadRecording = async (recording) => {
    setDownloadingCallId(recording.callId)
    try {
      await recordingsApi.downloadForCall(
        recording.callId,
        recording.fileName || `recording-${recording.callId}.webm`,
      )
    } finally {
      setDownloadingCallId('')
    }
  }

  return (
    <Card className="rounded-2xl border border-black/10 bg-white/60">
      <Card.Header className="justify-between">
        <div>
          <p className="text-sm font-semibold">Recordings</p>
          <p className="muted mt-1 text-xs">Playback uses secure streaming endpoint.</p>
        </div>
        <Button
          className="border border-black/10 bg-white/75 text-black"
          startContent={<RefreshCw size={16} />}
          onPress={onRefresh}
          isDisabled={isLoading}
        >
          Refresh
        </Button>
      </Card.Header>

      <Card.Content className="space-y-3">
        {error ? (
          <div className="rounded-xl border border-[#cb5f31]/20 bg-[#fce8df] px-3 py-2">
            <p className="text-sm font-medium text-[#9a3e19]">{error.message || 'Failed to load recordings'}</p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
            <p className="muted text-sm">Loading recordings...</p>
          </div>
        ) : null}

        {!isLoading && !items.length ? (
          <div className="rounded-xl border border-black/10 bg-white/70 px-3 py-2">
            <p className="muted text-sm">No recordings uploaded yet.</p>
          </div>
        ) : null}

        {!isLoading && items.length ? (
          <div className="space-y-2">
            {items.map((r) => (
              <div
                key={r.id || r.callId}
                className="flex flex-col gap-2 rounded-xl border border-black/10 bg-white/70 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{r.fileName || 'recording'}</p>
                  <p className="muted mt-1 text-xs">
                    {fmtDate(r.createdAt)} • {prettyBytes(r.fileSizeBytes)} • {r.format || r.mimeType || '-'}
                  </p>
                  {r.consentCaptured ? (
                    <Chip className="mt-2 bg-[#e7f4ee] text-[#1d5f4d]" variant="flat">
                      Consent captured
                    </Chip>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button
                    className="border border-black/10 bg-white/75 text-black"
                    startContent={<Play size={16} />}
                    onPress={() => setActiveRecording(r)}
                    isDisabled={isOpening && activeCallId === r.callId}
                  >
                    {isOpening && activeCallId === r.callId ? 'Opening...' : 'Play'}
                  </Button>
                  <Button
                    className="border border-black/10 bg-white/75 text-black"
                    onPress={() => downloadRecording(r)}
                    isDisabled={downloadingCallId === r.callId}
                  >
                    {downloadingCallId === r.callId ? 'Downloading...' : 'Download'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {activeUrl ? (
          <div className="rounded-xl border border-black/10 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Now playing</p>
              <button
                type="button"
                className="text-xs font-medium text-black/60 hover:text-black"
                onClick={() => {
                  setActiveRecording(null)
                  setActiveUrl(null)
                }}
              >
                Close
              </button>
            </div>
            
            {isAmr ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-black/5 bg-black/5 p-2">
                <Button
                  isIconOnly
                  className="rounded-full bg-black text-white"
                  size="sm"
                  onPress={() => {
                    if (!amrPlayerRef.current) return
                    if (amrPlaying) {
                      amrPlayerRef.current.pause()
                    } else {
                      amrPlayerRef.current.play()
                    }
                  }}
                >
                  {amrPlaying ? <Pause size={14} /> : <Play size={14} />}
                </Button>
                
                <div className="flex-grow">
                  <div className="flex justify-between text-[10px] text-black/60 font-mono">
                    <span>{formatTime(amrCurrent)}</span>
                    <span>{formatTime(amrDuration)}</span>
                  </div>
                  <div 
                    className="relative mt-1 h-1.5 w-full cursor-pointer rounded-full bg-black/10"
                    onClick={(e) => {
                      if (!amrPlayerRef.current) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const clickX = e.clientX - rect.left
                      const percent = clickX / rect.width
                      const targetTime = amrDuration * percent
                      try {
                        amrPlayerRef.current.stop()
                        amrPlayerRef.current.play()
                      } catch (err) {}
                    }}
                  >
                    <div 
                      className="h-full rounded-full bg-black" 
                      style={{ width: `${(amrCurrent / (amrDuration || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <audio className="mt-2 w-full" controls preload="metadata" src={activeUrl} />
            )}
            
            <p className="muted mt-2 text-xs">
              If playback fails, ensure you are logged in and have access to this recording.
            </p>
          </div>
        ) : null}
      </Card.Content>
    </Card>
  )
}

export default RecordingList
