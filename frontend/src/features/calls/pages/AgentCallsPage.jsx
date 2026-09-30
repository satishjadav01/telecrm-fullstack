import { Button, Card, Chip } from '@heroui/react'
import { PhoneCall, RefreshCw, Calendar as CalendarIcon, CheckCircle, Upload } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PageHeader from '../../../components/common/PageHeader'
import { useToast } from '../../../components/common/ToastProvider'
import { useAuth } from '../../auth/context/AuthContext'
import { callsApi } from '../api/callsApi'
import DispositionModal from '../components/DispositionModal'
import { recordingsApi } from '../../recordings/api/recordingsApi'
import { followupsApi } from '../../followups/api/followupsApi'
import { CallDirectionChip } from '../../../components/common/CallDirectionChip'

const STAGE_LABELS = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  converted: 'Converted',
  dropped: 'Dropped',
}

const DISPOSITION_LABELS = {
  converted: 'Converted',
  interested: 'Interested',
  callback: 'Callback',
  no_answer: 'No Answer',
  busy: 'Busy',
  not_interested: 'Not Interested',
  in_progress: 'In Progress',
}

const toDateInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const toRangeStartIso = (dateStr) => {
  if (!dateStr) return undefined
  const d = new Date(`${dateStr}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const toRangeEndIso = (dateStr) => {
  if (!dateStr) return undefined
  const d = new Date(`${dateStr}T23:59:59.999`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const leadDisplayName = (lead) => {
  const full = `${lead?.firstName || ''} ${lead?.lastName || ''}`.trim()
  return full || lead?.phonePrimary || 'Unknown lead'
}

const stageLabel = (value) => STAGE_LABELS[value] || value || '-'

const dispositionLabel = (value) => DISPOSITION_LABELS[value] || value || '-'

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (value) => {
  const secs = Number(value)
  if (!Number.isFinite(secs) || secs < 0) return '-'
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${String(rem).padStart(2, '0')}s`
}

const normalizeDialNumber = (value) => {
  if (!value) return ''
  return String(value).replace(/[^\d+]/g, '')
}

const openDialer = (phoneNumber) => {
  const dialNumber = normalizeDialNumber(phoneNumber)
  if (!dialNumber || typeof window === 'undefined') return false
  window.location.href = `tel:${dialNumber}`
  return true
}

const getLeadKey = (lead) => {
  if (!lead) return ''
  return String(lead.id || lead._id || lead.phonePrimary || lead.email || '')
}

const getLeadSortTime = (group) => {
  const values = [
    group.queueLead?.createdAt,
    group.latestCall?.createdAt,
    group.nextFollowUp?.dueAt,
    group.lead?.updatedAt,
    group.lead?.createdAt,
  ]
  for (const value of values) {
    const time = new Date(value).getTime()
    if (!Number.isNaN(time)) return time
  }
  return 0
}

function AgentCallsPage() {
  const auth = useAuth()
  const toast = useToast()

  const [selectedDate, setSelectedDate] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedLeadKey, setSelectedLeadKey] = useState('')
  const [isStartingCall, setIsStartingCall] = useState(false)
  const [activeCall, setActiveCall] = useState(null)
  const [dispositionOpen, setDispositionOpen] = useState(false)
  const [isSavingDisposition, setIsSavingDisposition] = useState(false)
  const [dispositionError, setDispositionError] = useState(null)
  const [recentCalls, setRecentCalls] = useState([])
  const [isLoadingRecentCalls, setIsLoadingRecentCalls] = useState(false)
  const [recentCallsError, setRecentCallsError] = useState(null)
  const [selectedRecordingByCallId, setSelectedRecordingByCallId] = useState({})
  const [uploadingCallId, setUploadingCallId] = useState('')
  const [followupItems, setFollowupItems] = useState([])
  const [isLoadingFollowups, setIsLoadingFollowups] = useState(false)
  const [followupsError, setFollowupsError] = useState(null)
  const [activeFollowUpForCall, setActiveFollowUpForCall] = useState(null)
  const [busyRecordingAction, setBusyRecordingAction] = useState('')
  const [activePlayback, setActivePlayback] = useState({ callId: '', url: '' })
  const [currentLeadsPage, setCurrentLeadsPage] = useState(1)
  const queueFetchIdRef = useRef(0)
  const recentCallsFetchIdRef = useRef(0)
  const followupsFetchIdRef = useRef(0)

  const fetchQueue = useCallback(async () => {
    const fetchId = queueFetchIdRef.current + 1
    queueFetchIdRef.current = fetchId
    setIsLoading(true)
    setError(null)
    try {
      const params = {
        page: 1,
        limit: 100,
        from: toRangeStartIso(selectedDate),
        to: toRangeEndIso(selectedDate),
        hasFilter: Boolean(selectedDate),
      }
      const data = await callsApi.agentQueue(params)
      if (fetchId !== queueFetchIdRef.current) return
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (e) {
      if (fetchId !== queueFetchIdRef.current) return
      setError(e)
    } finally {
      if (fetchId === queueFetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [selectedDate])

  const fetchRecentCalls = useCallback(async () => {
    if (!auth.user?.id) return
    const fetchId = recentCallsFetchIdRef.current + 1
    recentCallsFetchIdRef.current = fetchId
    setIsLoadingRecentCalls(true)
    setRecentCallsError(null)
    try {
      const params = {
        page: 1,
        limit: 100,
        agentId: auth.user.id,
        from: toRangeStartIso(selectedDate),
        to: toRangeEndIso(selectedDate),
      }
      const data = await callsApi.list(params)
      if (fetchId !== recentCallsFetchIdRef.current) return
      setRecentCalls(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      if (fetchId !== recentCallsFetchIdRef.current) return
      setRecentCallsError(e)
    } finally {
      if (fetchId === recentCallsFetchIdRef.current) {
        setIsLoadingRecentCalls(false)
      }
    }
  }, [auth.user?.id, selectedDate])

  const fetchFollowups = useCallback(async () => {
    const fetchId = followupsFetchIdRef.current + 1
    followupsFetchIdRef.current = fetchId
    setIsLoadingFollowups(true)
    setFollowupsError(null)
    try {
      const data = await followupsApi.listMy({
        page: 1,
        limit: 100,
        status: 'pending',
        from: toRangeStartIso(selectedDate),
        to: toRangeEndIso(selectedDate),
        hasFilter: Boolean(selectedDate),
      })
      if (fetchId !== followupsFetchIdRef.current) return
      setFollowupItems(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      if (fetchId !== followupsFetchIdRef.current) return
      setFollowupsError(e)
    } finally {
      if (fetchId === followupsFetchIdRef.current) {
        setIsLoadingFollowups(false)
      }
    }
  }, [selectedDate])

  useEffect(() => {
    setSelectedDate(toDateInput(new Date()))
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    fetchQueue()
    fetchRecentCalls()
    fetchFollowups()
    setCurrentLeadsPage(1)
  }, [selectedDate, fetchQueue, fetchRecentCalls, fetchFollowups])

  useEffect(() => {
    return () => {
      if (activePlayback.url) {
        URL.revokeObjectURL(activePlayback.url)
      }
    }
  }, [activePlayback.url])

  const allLeadGroups = useMemo(() => {
    const byLead = new Map()

    const ensureGroup = (lead) => {
      const key = getLeadKey(lead)
      if (!key) return null
      if (!byLead.has(key)) {
        byLead.set(key, {
          key,
          lead: lead || null,
          queueLead: null,
          calls: [],
          followups: [],
        })
      }
      const group = byLead.get(key)
      if (!group.lead && lead) group.lead = lead
      return group
    }

    for (const lead of items) {
      const group = ensureGroup(lead)
      if (!group) continue
      group.lead = lead
      group.queueLead = lead
    }

    for (const call of recentCalls) {
      const group = ensureGroup(call.lead)
      if (!group) continue
      group.calls.push(call)
    }

    for (const followup of followupItems) {
      const group = ensureGroup(followup.lead)
      if (!group) continue
      group.followups.push(followup)
    }

    return [...byLead.values()]
      .map((group) => {
        const calls = [...group.calls].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        const followups = [...group.followups].sort(
          (a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
        )
        return {
          ...group,
          calls,
          followups,
          latestCall: calls[0] || null,
          nextFollowUp: followups[0] || null,
        }
      })
      .sort((a, b) => {
        if (a.queueLead && !b.queueLead) return -1
        if (!a.queueLead && b.queueLead) return 1
        return getLeadSortTime(b) - getLeadSortTime(a)
      })
  }, [items, recentCalls, followupItems])

  const LEADS_PER_PAGE = 5
  const totalLeadsPages = Math.ceil(allLeadGroups.length / LEADS_PER_PAGE)
  const leadGroups = useMemo(() => {
    const startIdx = (currentLeadsPage - 1) * LEADS_PER_PAGE
    const endIdx = startIdx + LEADS_PER_PAGE
    return allLeadGroups.slice(startIdx, endIdx)
  }, [allLeadGroups, currentLeadsPage])

  useEffect(() => {
    if (!allLeadGroups.length) {
      setSelectedLeadKey('')
      return
    }
    if (!allLeadGroups.some((group) => group.key === selectedLeadKey)) {
      setSelectedLeadKey(allLeadGroups[0].key)
    }
  }, [allLeadGroups, selectedLeadKey])

  const activeLeadGroup = leadGroups.find((group) => group.key === selectedLeadKey) || null
  const activeLead = activeLeadGroup?.lead || null

  const startCallForLead = async ({ leadId, phoneNumber, followUp = null }) => {
    if (!leadId) return
    setIsStartingCall(true)
    try {
      const call = await callsApi.start({ leadId, direction: 'outbound' })
      setActiveCall(call)
      setActiveFollowUpForCall(followUp)
      setDispositionError(null)
      setDispositionOpen(true)
      if (!openDialer(phoneNumber)) {
        toast.error('Lead phone number is missing or invalid')
      }
    } catch (e) {
      toast.error(e?.message || 'Failed to start call')
    } finally {
      setIsStartingCall(false)
    }
  }

  const startCallForActiveLead = async () =>
    startCallForLead({
      leadId: activeLead?.id,
      phoneNumber: activeLead?.phonePrimary,
      followUp: activeLeadGroup?.nextFollowUp || null,
    })

  const closeDisposition = () => {
    if (isSavingDisposition) return
    setDispositionOpen(false)
    setActiveFollowUpForCall(null)
  }

  const submitDisposition = async (payload) => {
    if (!activeCall?.id) return
    setIsSavingDisposition(true)
    setDispositionError(null)
    try {
      await callsApi.applyDisposition(activeCall.id, payload)
      if (activeFollowUpForCall?.id) {
        if (payload.disposition === 'callback' && payload.followUpRequired && payload.followUpAt) {
          await followupsApi.update(activeFollowUpForCall.id, {
            status: 'pending',
            dueAt: payload.followUpAt,
            reason: payload.followUpReason || undefined,
            priority: payload.followUpPriority || undefined,
            note: payload.notes || undefined,
          })
        } else {
          await followupsApi.update(activeFollowUpForCall.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
            note: payload.notes || undefined,
          })
        }
      }
      toast.success('Disposition saved')
      setDispositionOpen(false)
      setActiveCall(null)
      setActiveFollowUpForCall(null)
      await Promise.all([fetchQueue(), fetchRecentCalls(), fetchFollowups()])
    } catch (e) {
      setDispositionError(e)
      toast.error(e?.message || 'Failed to save disposition')
      throw e
    } finally {
      setIsSavingDisposition(false)
    }
  }

  const onPickRecordingForCall = (callId, file) => {
    setSelectedRecordingByCallId((prev) => ({
      ...prev,
      [callId]: file || null,
    }))
  }

  const onUploadRecordingForCall = async (callId) => {
    const file = selectedRecordingByCallId[callId]
    if (!file) {
      toast.error('Choose a recording file first')
      return
    }
    setUploadingCallId(callId)
    try {
      await recordingsApi.upload(callId, file, { consentCaptured: true })
      toast.success('Recording saved')
      setSelectedRecordingByCallId((prev) => ({
        ...prev,
        [callId]: null,
      }))
      setRecentCalls((prev) =>
        prev.map((call) =>
          call.id === callId ? { ...call, recording: call.recording || { id: `uploaded-${callId}` } } : call
        )
      )
    } catch (e) {
      toast.error(e?.message || 'Failed to save recording')
    } finally {
      setUploadingCallId('')
    }
  }

  const onPlayRecordingForCall = async (callId) => {
    setBusyRecordingAction(`play:${callId}`)
    try {
      if (activePlayback.url) {
        URL.revokeObjectURL(activePlayback.url)
      }
      const objectUrl = await recordingsApi.createPlaybackObjectUrl(callId)
      setActivePlayback({ callId, url: objectUrl })
    } catch (e) {
      toast.error(e?.message || 'Failed to open recording')
    } finally {
      setBusyRecordingAction('')
    }
  }

  const closeInlinePlayback = () => {
    if (activePlayback.url) {
      URL.revokeObjectURL(activePlayback.url)
    }
    setActivePlayback({ callId: '', url: '' })
  }

  const onDownloadRecordingForCall = async (call) => {
    setBusyRecordingAction(`download:${call.id}`)
    try {
      await recordingsApi.downloadForCall(call.id, call.recording?.fileName || `recording-${call.id}.webm`)
    } catch (e) {
      toast.error(e?.message || 'Failed to download recording')
    } finally {
      setBusyRecordingAction('')
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Workspace"
        title="Agent Call Workspace"
        description="Your pending leads, follow-ups, and calls."
      />

      {/* Control Bar */}
      <div className="tele-card p-4 sm:p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b-4 border-tele-primary">
         <div className="flex items-center gap-4">
            <div className="flex items-center text-sm font-bold text-tele-dark">
               <CalendarIcon size={16} className="mr-2 text-tele-primary" />
               Date Filter
            </div>
            <input
               className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm text-tele-dark focus:border-tele-primary focus:ring-1 focus:ring-tele-primary min-w-[150px]"
               type="date"
               value={selectedDate}
               onChange={(e) => setSelectedDate(e.target.value)}
             />
         </div>
         <div className="flex flex-wrap items-center gap-3">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-card bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                {total || items.length} Pending
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-card bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                {recentCalls.length} Calls
             </div>
             <Button
               className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 h-8 px-3 text-xs font-medium transition-colors"
               onPress={() => Promise.all([fetchQueue(), fetchRecentCalls(), fetchFollowups()])}
               isDisabled={isLoading || isLoadingRecentCalls || isLoadingFollowups}
             >
               <RefreshCw size={14} className="mr-1.5" /> Refresh
             </Button>
         </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[350px_minmax(0,1fr)]">
        {/* Left Sidebar: Leads Queue */}
        <div className="space-y-4">
          <div className="tele-card p-0 flex flex-col min-h-[500px]">
             <div className="p-5 border-b border-tele-border flex justify-between items-center bg-gray-50 rounded-t-[1.5rem]">
               <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Queue & Leads</h2>
               <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-tele-primary text-white">
                 {allLeadGroups.length}
               </span>
             </div>

             <div className="p-3 flex-1 flex flex-col">
               {error || recentCallsError || followupsError ? (
                 <div className="rounded-card border border-red-200 bg-red-50 p-4">
                   <p className="text-sm font-medium text-red-700">
                     {error?.message || recentCallsError?.message || followupsError?.message || 'Failed to load data'}
                   </p>
                 </div>
               ) : null}

               {isLoading || isLoadingRecentCalls || isLoadingFollowups ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-tele-primary mb-3"></div>
                    <p className="text-sm font-medium">Loading workspace...</p>
                 </div>
               ) : null}

               {!isLoading && !isLoadingRecentCalls && !isLoadingFollowups && !allLeadGroups.length ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
                    <p className="font-bold text-tele-dark">No leads found</p>
                    <p className="text-xs mt-1">Try selecting a different date.</p>
                 </div>
               ) : null}

               {!isLoading && !isLoadingRecentCalls && !isLoadingFollowups && allLeadGroups.length ? (
                 <>
                   <div className="space-y-2 flex-1">
                     {leadGroups.map((group) => {
                       const isActive = group.key === selectedLeadKey
                       return (
                         <button
                           key={group.key}
                           type="button"
                           className={`w-full rounded-card border px-4 py-3 text-left transition-all ${
                             isActive
                               ? 'border-tele-primary bg-tele-light/30 shadow-soft ring-1 ring-tele-primary ring-inset'
                               : 'border-tele-border bg-white hover:border-tele-primary/30'
                             }`}
                           onClick={() => setSelectedLeadKey(group.key)}
                         >
                           <div className="flex items-start justify-between gap-3 mb-2">
                             <div className="min-w-0">
                               <p className={`truncate text-sm font-bold ${isActive ? 'text-tele-primary' : 'text-tele-dark'}`}>
                                  {leadDisplayName(group.lead)}
                               </p>
                               <p className="text-gray-500 mt-0.5 truncate text-xs">{group.lead?.phonePrimary || '-'}</p>
                             </div>
                             {group.queueLead && (
                               <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-orange-100 text-orange-700 border border-orange-200">
                                 Pending
                               </span>
                             )}
                           </div>
                           <div className="flex flex-wrap gap-1.5 mb-2">
                             <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                               {stageLabel(group.lead?.stage)}
                             </span>
                             {group.nextFollowUp && (
                               <span className="px-2 py-0.5 rounded text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 font-medium">
                                 Follow-up Due
                               </span>
                             )}
                           </div>
                           <p className="text-gray-400 text-[10px] uppercase font-semibold">
                             {group.latestCall
                               ? `Call: ${formatDateTime(group.latestCall.createdAt)}`
                               : `Added: ${formatDateTime(group.lead?.createdAt)}`}
                           </p>
                         </button>
                       )
                     })}
                   </div>

                   {totalLeadsPages > 1 && (
                     <div className="flex items-center justify-between gap-2 border-t border-tele-border pt-3 mt-3">
                       <Button
                         size="sm"
                         className="rounded-btn border border-tele-border bg-white text-gray-700 disabled:opacity-50 h-8 px-3 text-xs"
                         isDisabled={currentLeadsPage === 1}
                         onPress={() => setCurrentLeadsPage(Math.max(1, currentLeadsPage - 1))}
                       >
                         Prev
                       </Button>
                       <span className="text-xs font-bold text-gray-500">
                         {currentLeadsPage} / {totalLeadsPages}
                       </span>
                       <Button
                         size="sm"
                         className="rounded-btn border border-tele-border bg-white text-gray-700 disabled:opacity-50 h-8 px-3 text-xs"
                         isDisabled={currentLeadsPage === totalLeadsPages}
                         onPress={() => setCurrentLeadsPage(Math.min(totalLeadsPages, currentLeadsPage + 1))}
                       >
                         Next
                       </Button>
                     </div>
                   )}
                 </>
               ) : null}
             </div>
          </div>
        </div>

        {/* Right Area: Lead Detail, Follow-ups, Calls */}
        <div className="space-y-6">
           {/* Lead Header */}
           <div className="tele-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-l-4 border-l-tele-primary">
              {!activeLead ? (
                <div className="text-gray-500 p-4">
                  <p className="font-bold text-tele-dark">Select a lead</p>
                  <p className="text-sm mt-1">Choose any lead from the queue to inspect details and start calling.</p>
                </div>
              ) : (
                <>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold text-tele-dark mb-1">{leadDisplayName(activeLead)}</h2>
                    <p className="text-gray-500 font-medium mb-3">{activeLead.phonePrimary || 'No Phone Number'}</p>
                    <div className="flex flex-wrap gap-2">
                       <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-tele-light/30 text-tele-primary border border-tele-light">
                         Stage: {stageLabel(activeLead.stage)}
                       </span>
                       <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-100 text-gray-700">
                         Priority: P{activeLead.priority || 3}
                       </span>
                       {activeLeadGroup?.queueLead && (
                         <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200">
                           In Queue
                         </span>
                       )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex flex-col gap-2">
                     <Button
                       className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full md:w-auto h-12 px-6 font-bold shadow-md shadow-tele-primary/20"
                       onPress={startCallForActiveLead}
                       isDisabled={!activeLead?.id}
                       isLoading={isStartingCall}
                     >
                       <PhoneCall size={18} className="mr-2" />
                       Start Call
                     </Button>
                     <p className="text-[10px] text-gray-400 text-center uppercase tracking-wide font-semibold">
                        Added: {formatDateTime(activeLead.createdAt)}
                     </p>
                  </div>
                </>
              )}
           </div>

           {activeLead && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Notes & Followups */}
                <div className="space-y-6">
                   {activeLead.notes && (
                     <div className="tele-card p-5 bg-gray-50 border-dashed border-2">
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Lead Notes</h3>
                        <p className="text-sm text-tele-dark whitespace-pre-wrap">{activeLead.notes}</p>
                     </div>
                   )}

                   {activeLeadGroup?.followups.length > 0 && (
                     <div className="tele-card p-0 overflow-hidden">
                        <div className="bg-indigo-50 border-b border-indigo-100 p-4 flex items-center justify-between">
                           <h3 className="text-sm font-bold text-indigo-900">Next Follow-ups</h3>
                           <span className="w-6 h-6 rounded-full bg-indigo-200 text-indigo-800 flex items-center justify-center text-xs font-bold">
                             {activeLeadGroup.followups.length}
                           </span>
                        </div>
                        <div className="p-4 space-y-3">
                           {activeLeadGroup.followups.map((fu) => (
                             <div key={fu.id} className="rounded-card border border-tele-border p-4 bg-white hover:border-indigo-300 transition-colors">
                               <div className="flex items-start justify-between gap-3 mb-3">
                                 <div>
                                   <p className="text-sm font-bold text-tele-dark">{fu.reason || 'Callback scheduled'}</p>
                                   <p className="text-xs text-indigo-600 font-medium mt-1">Due: {formatDateTime(fu.dueAt)}</p>
                                 </div>
                                 <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-bold rounded">
                                   P{fu.priority || 3}
                                 </span>
                               </div>
                               <div className="flex gap-2">
                                 <Button
                                   size="sm"
                                   className="flex-1 rounded-btn bg-indigo-600 text-white font-medium hover:bg-indigo-700 h-8"
                                   isDisabled={isStartingCall}
                                   onPress={() =>
                                     startCallForLead({
                                       leadId: fu.leadId,
                                       phoneNumber: fu.lead?.phonePrimary,
                                       followUp: fu,
                                     })
                                   }
                                 >
                                   <PhoneCall size={12} className="mr-1" /> Call Now
                                 </Button>
                                 <Button
                                   size="sm"
                                   className="flex-1 rounded-btn bg-white border border-tele-border text-gray-700 font-medium hover:bg-gray-50 h-8"
                                   onPress={async () => {
                                     try {
                                       await followupsApi.update(fu.id, {
                                         status: 'completed',
                                         completedAt: new Date().toISOString(),
                                       })
                                       toast.success('Follow-up marked completed')
                                       await fetchFollowups()
                                     } catch (e) {
                                       toast.error(e?.message || 'Failed to update follow-up')
                                     }
                                   }}
                                 >
                                   <CheckCircle size={12} className="mr-1" /> Done
                                 </Button>
                               </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}
                </div>

                {/* Recent Calls */}
                <div className="space-y-6">
                   <div className="tele-card p-0 overflow-hidden">
                      <div className="bg-gray-50 border-b border-tele-border p-4 flex items-center justify-between">
                         <h3 className="text-sm font-bold text-tele-dark">Call History</h3>
                         <span className="w-6 h-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-bold">
                           {activeLeadGroup?.calls.length || 0}
                         </span>
                      </div>
                      <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto scrollbar-soft">
                         {!activeLeadGroup?.calls.length ? (
                           <div className="text-center p-6 border border-dashed border-gray-200 rounded-card">
                             <p className="font-bold text-gray-400">No calls yet</p>
                             <p className="text-xs text-gray-400 mt-1">History will appear here.</p>
                           </div>
                         ) : (
                           activeLeadGroup.calls.map((call) => {
                             const selectedFile = selectedRecordingByCallId[call.id]
                             const isUploading = uploadingCallId === call.id
                             const recording = call.recording
                             const canPlay = Boolean(recording)
                             const isPlaying = busyRecordingAction === `play:${call.id}`
                             const isDownloading = busyRecordingAction === `download:${call.id}`
                             const isPlaybackOpen = activePlayback.callId === call.id && Boolean(activePlayback.url)

                             return (
                               <div key={call.id} className="rounded-card border border-tele-border p-4 bg-white hover:border-tele-primary/30 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                     <div className="flex items-center gap-2">
                                        <CallDirectionChip direction={call.direction} />
                                        <span className="text-sm font-bold text-tele-dark">{dispositionLabel(call.disposition || 'in_progress')}</span>
                                     </div>
                                     <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                        {formatDuration(call.durationSeconds)}
                                     </span>
                                  </div>
                                  
                                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                                     <p>{formatDateTime(call.createdAt)}</p>
                                     <p className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">
                                       Device: {call.phoneDevice?.label || call.phoneDevice?.imei || 'None'}
                                     </p>
                                  </div>

                                  <div className="flex gap-2 mb-3">
                                     <Button
                                       size="sm"
                                       className="flex-1 rounded border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-7 text-xs disabled:opacity-50"
                                       onPress={() => onPlayRecordingForCall(call.id)}
                                       isDisabled={!canPlay || isPlaying || isDownloading}
                                     >
                                       {isPlaying ? 'Opening...' : 'Play'}
                                     </Button>
                                     <Button
                                       size="sm"
                                       className="flex-1 rounded border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-7 text-xs disabled:opacity-50"
                                       onPress={() => onDownloadRecordingForCall(call)}
                                       isDisabled={!canPlay || isDownloading || isPlaying}
                                     >
                                       {isDownloading ? 'Downloading...' : 'Download'}
                                     </Button>
                                  </div>

                                  <div className="pt-3 border-t border-gray-100">
                                     <div className="flex items-center gap-2">
                                        <label className="flex-1 relative cursor-pointer">
                                           <span className={`block w-full text-center text-xs border rounded p-1.5 transition-colors ${selectedFile ? 'bg-tele-light/30 border-tele-primary text-tele-primary font-medium' : 'bg-gray-50 border-dashed border-gray-300 text-gray-500 hover:bg-gray-100'}`}>
                                              {selectedFile ? <span className="truncate block max-w-[150px] mx-auto">{selectedFile.name}</span> : 'Select Audio File'}
                                           </span>
                                           <input
                                             className="hidden"
                                             type="file"
                                             accept="audio/*"
                                             onChange={(e) => onPickRecordingForCall(call.id, e.target.files?.[0] || null)}
                                           />
                                        </label>
                                        <Button
                                           size="sm"
                                           className="rounded bg-tele-primary text-white hover:bg-tele-secondary font-medium h-auto py-1.5 px-3 text-xs"
                                           onPress={() => onUploadRecordingForCall(call.id)}
                                           isLoading={isUploading}
                                           isDisabled={!selectedFile}
                                        >
                                           <Upload size={12} className={isUploading ? "hidden" : "mr-1 inline"} /> Save
                                        </Button>
                                     </div>
                                  </div>

                                  {isPlaybackOpen && (
                                    <div className="mt-3 bg-gray-50 rounded p-3 border border-gray-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-tele-primary">Playing...</span>
                                        <button onClick={closeInlinePlayback} className="text-[10px] text-red-500 hover:underline">Close</button>
                                      </div>
                                      <audio className="w-full h-8" controls autoPlay src={activePlayback.url} />
                                    </div>
                                  )}
                               </div>
                             )
                           })
                         )}
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>

      <DispositionModal
        isOpen={dispositionOpen}
        call={activeCall}
        canSubmit={Boolean(activeCall?.id)}
        isSaving={isSavingDisposition}
        error={dispositionError}
        onClose={closeDisposition}
        onSubmit={submitDisposition}
      />
    </section>
  )
}

export default AgentCallsPage
