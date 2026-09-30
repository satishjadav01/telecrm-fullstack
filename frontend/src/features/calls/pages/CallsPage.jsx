import { Button, Card, Chip, ProgressBar, Table } from '@heroui/react'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { RefreshCw, Play, Download, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../../../components/common/PageHeader'
import { callsApi } from '../api/callsApi'
import { recordingsApi } from '../../recordings/api/recordingsApi'

import { CallDirectionChip } from '../../../components/common/CallDirectionChip'

const DISPOSITION_OPTIONS = [
  { value: '', label: 'All dispositions' },
  { value: 'converted', label: 'Converted' },
  { value: 'interested', label: 'Interested' },
  { value: 'callback', label: 'Callback' },
  { value: 'no_answer', label: 'No answer' },
  { value: 'busy', label: 'Busy' },
  { value: 'not_interested', label: 'Not interested' },
]

const toDateInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const toRangeStartIso = (value) => {
  if (!value) return undefined
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const toRangeEndIso = (value) => {
  if (!value) return undefined
  const d = new Date(`${value}T23:59:59.999`)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toISOString()
}

const clampPct = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, x))
}

const toCallLabel = (call) => {
  const firstName = call?.lead?.firstName || ''
  const lastName = call?.lead?.lastName || ''
  const full = `${firstName} ${lastName}`.trim()
  return full || call?.lead?.phonePrimary || '-'
}

function CallsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [from, setFrom] = useState(() => toDateInput(searchParams.get('from')))
  const [to, setTo] = useState(() => toDateInput(searchParams.get('to')))
  const [disposition, setDisposition] = useState(() => searchParams.get('disposition') || '')
  const [page, setPage] = useState(() => Number(searchParams.get('page') || 1))

  const updateFilters = (newParams) => {
    const params = new URLSearchParams(searchParams)
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === '') {
        params.delete(key)
      } else {
        params.set(key, String(val))
      }
    })
    setSearchParams(params, { replace: true })
  }
  const [limit] = useState(10)
  const [items, setItems] = useState([])
  const [summary, setSummary] = useState(null)
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [activePlayback, setActivePlayback] = useState({ callId: '', url: '' })
  const [busyRecordingAction, setBusyRecordingAction] = useState('')
  const [recordingError, setRecordingError] = useState(null)

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit))
  const hasFilter = useMemo(() => Boolean(from || to || disposition), [from, to, disposition])

  const fetchData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const query = {
        disposition: disposition || undefined,
        from: toRangeStartIso(from),
        to: toRangeEndIso(to),
        hasFilter,
      }
      const [listData, summaryData] = await Promise.all([
        callsApi.list({ ...query, page, limit }),
        callsApi.summary(query),
      ])
      setItems(listData.items || [])
      setTotal(listData.total || 0)
      setSummary(summaryData || null)
    } catch (e) {
      setError(e)
      setItems([])
      setSummary(null)
      setTotal(0)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const nextDisposition = searchParams.get('disposition') || ''
    const nextFrom = toDateInput(searchParams.get('from'))
    const nextTo = toDateInput(searchParams.get('to'))
    const nextPage = Number(searchParams.get('page') || 1)

    setPage(nextPage)
    setDisposition(nextDisposition)
    setFrom(nextFrom)
    setTo(nextTo)
  }, [searchParams])

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, disposition, page])

  useEffect(() => {
    return () => {
      if (activePlayback.url) URL.revokeObjectURL(activePlayback.url)
    }
  }, [activePlayback.url])

  const clearFilters = () => {
    updateFilters({ from: '', to: '', disposition: '', page: 1 })
  }

  const onPlayRecordingForCall = async (callId) => {
    setBusyRecordingAction(`play:${callId}`)
    setRecordingError(null)
    try {
      if (activePlayback.url) URL.revokeObjectURL(activePlayback.url)
      const objectUrl = await recordingsApi.createPlaybackObjectUrl(callId)
      setActivePlayback({ callId, url: objectUrl })
    } catch (e) {
      setActivePlayback({ callId: '', url: '' })
      setRecordingError(e)
    } finally {
      setBusyRecordingAction('')
    }
  }

  const onDownloadRecordingForCall = async (callId, fileName) => {
    setBusyRecordingAction(`download:${callId}`)
    setRecordingError(null)
    try {
      await recordingsApi.downloadForCall(callId, fileName || `recording-${callId}.webm`)
    } catch (e) {
      setRecordingError(e)
    } finally {
      setBusyRecordingAction('')
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Calls"
        title="Call History & Analytics"
        description="Review calls, track dispositions, and playback recordings."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Filters and Outcome Mix (Sidebar) */}
        <div className="space-y-6 lg:col-span-1">
           <div className="tele-card p-5">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-sm font-bold text-tele-dark flex items-center">
                    <Filter size={16} className="mr-2 text-tele-primary" />
                    Filters
                 </h2>
                 {hasFilter && (
                   <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 font-medium underline underline-offset-2">
                      Clear
                   </button>
                 )}
              </div>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600 uppercase tracking-wider">From Date</span>
                  <input
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                    type="date"
                    value={from}
                    onChange={(e) => {
                      updateFilters({ from: e.target.value, page: 1 })
                    }}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600 uppercase tracking-wider">To Date</span>
                  <input
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                    type="date"
                    value={to}
                    onChange={(e) => {
                      updateFilters({ to: e.target.value, page: 1 })
                    }}
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-gray-600 uppercase tracking-wider">Disposition</span>
                  <select
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                    value={disposition}
                    onChange={(e) => {
                      updateFilters({ disposition: e.target.value, page: 1 })
                    }}
                  >
                    {DISPOSITION_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </label>

                <Button
                  className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full flex items-center justify-center font-medium h-10 mt-2"
                  onPress={fetchData}
                  isDisabled={isLoading}
                >
                  <RefreshCw size={16} className="mr-2" />
                  Refresh Results
                </Button>
              </div>
           </div>

           <div className="tele-card p-5">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-sm font-bold text-tele-dark">Outcome Mix</h2>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-tele-light/50 text-tele-primary border border-tele-light">
                  {summary?.totalCalls || 0} Total
                </span>
             </div>
             
             <div className="space-y-4">
                {[
                  ['converted', 'Converted', 'bg-tele-primary'],
                  ['interested', 'Interested', 'bg-tele-secondary'],
                  ['callback', 'Callback', 'bg-indigo-400'],
                  ['no_answer', 'No Answer', 'bg-amber-400'],
                  ['busy', 'Busy', 'bg-orange-400'],
                  ['not_interested', 'Not Interested', 'bg-red-400'],
                  ['unknown', 'In Progress', 'bg-gray-300'],
                ].map(([key, label, colorClass]) => (
                  <div key={key}>
                    <div className="mb-1 flex justify-between text-xs font-medium text-gray-600">
                      <span>{label}</span>
                      <span className="text-tele-dark font-bold">{summary?.percentages?.[key] ?? 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                       <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${clampPct(summary?.percentages?.[key] ?? 0)}%` }}></div>
                    </div>
                  </div>
                ))}
             </div>
           </div>
        </div>

        {/* Call List (Main Content) */}
        <div className="lg:col-span-3 space-y-6">
           <div className="tele-card p-0 flex flex-col min-h-[500px]">
              <div className="p-5 border-b border-tele-border flex justify-between items-center bg-white rounded-t-[1.5rem]">
                 <div>
                    <h2 className="text-lg font-bold text-tele-dark">Recent Calls</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Showing <span className="font-medium text-tele-dark">{items.length}</span> of{' '}
                      <span className="font-medium text-tele-dark">{total}</span> calls.
                    </p>
                 </div>
                 {items.length > 0 && totalPages > 1 && (
                   <div className="flex items-center gap-1 bg-gray-50/50 rounded-lg p-1 border border-tele-border">
                     <button
                       className="p-1.5 rounded-md hover:bg-white dark:hover:bg-tele-border hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:shadow-none transition-all text-tele-dark"
                       onClick={() => updateFilters({ page: Math.max(1, page - 1) })}
                       disabled={page <= 1 || isLoading}
                       aria-label="Previous page"
                     >
                       <ChevronLeft size={16} />
                     </button>
                     <div className="px-3 text-sm font-semibold text-tele-dark min-w-[3rem] text-center">
                       {page} <span className="text-gray-400 font-normal mx-0.5">/</span> {totalPages}
                     </div>
                     <button
                       className="p-1.5 rounded-md hover:bg-white dark:hover:bg-tele-border hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent disabled:shadow-none transition-all text-tele-dark"
                       onClick={() => updateFilters({ page: Math.min(totalPages, page + 1) })}
                       disabled={page >= totalPages || isLoading}
                       aria-label="Next page"
                     >
                       <ChevronRight size={16} />
                     </button>
                   </div>
                 )}
              </div>

              {error ? (
                <div className="p-5">
                  <div className="rounded-card border border-red-200 bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-700">
                      {error.message || 'Failed to load calls'}
                    </p>
                  </div>
                </div>
              ) : null}

              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
                  <p className="font-medium text-tele-dark">Loading calls...</p>
                  <p className="text-gray-500 text-sm mt-1">Fetching live call data.</p>
                </div>
              ) : null}

              {!isLoading && !items.length ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-gray-50/30">
                  <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Search className="text-gray-400" size={24} />
                  </div>
                  <p className="font-bold text-lg text-tele-dark">No calls found</p>
                  <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                    {hasFilter ? 'Try clearing filters or selecting another date range.' : 'Calls will appear here once activity starts.'}
                  </p>
                </div>
              ) : null}

              {!isLoading && items.length > 0 && (
                 <div className="flex-1 overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                          <tr>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Lead</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Agent</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Phone / Device</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Direction</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Disposition</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Duration</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider">Time</th>
                             <th className="px-5 py-3 font-semibold uppercase tracking-wider text-right">Recording</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-tele-border text-tele-dark bg-white">
                          {items.map((row) => {
                            const canPlay = Boolean(row.recording)
                            const isPlaying = busyRecordingAction === `play:${row.id}`
                            const isDownloading = busyRecordingAction === `download:${row.id}`

                            return (
                               <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                  <td className="px-5 py-4 font-bold text-tele-dark">{toCallLabel(row)}</td>
                                  <td className="px-5 py-4 text-gray-600">{row.agent?.fullName || '-'}</td>
                                  <td className="px-5 py-4 text-gray-600">{row.phoneDevice?.label || row.phoneDevice?.imei || '-'}</td>
                                  <td className="px-5 py-4">
                                     <CallDirectionChip direction={row.direction} />
                                  </td>
                                  <td className="px-5 py-4">
                                     <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                       {row.disposition || 'in_progress'}
                                     </span>
                                  </td>
                                  <td className="px-5 py-4 font-mono text-gray-600">{row.durationSeconds ? `${row.durationSeconds}s` : '-'}</td>
                                  <td className="px-5 py-4 text-gray-500">
                                     {row.createdAt ? new Date(row.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'}) : '-'}
                                  </td>
                                  <td className="px-5 py-4">
                                     <div className="flex items-center justify-end gap-2">
                                        <Button
                                          size="sm"
                                          className="min-w-0 h-8 px-3 rounded text-xs font-medium bg-white border border-tele-border text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                          onPress={() => onPlayRecordingForCall(row.id)}
                                          isDisabled={!canPlay || isPlaying || isDownloading}
                                        >
                                          {isPlaying ? 'Opening...' : <><Play size={12} className="mr-1 inline" /> Play</>}
                                        </Button>
                                        <Button
                                          size="sm"
                                          className="min-w-0 h-8 px-2 rounded text-xs font-medium bg-white border border-tele-border text-gray-500 hover:text-tele-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
                                          onPress={() => onDownloadRecordingForCall(row.id, row.recording?.fileName)}
                                          isDisabled={!canPlay || isDownloading || isPlaying}
                                          aria-label="Download Recording"
                                        >
                                          {isDownloading ? '...' : <Download size={14} />}
                                        </Button>
                                     </div>
                                  </td>
                               </tr>
                            )
                          })}
                       </tbody>
                    </table>
                 </div>
              )}

              {/* Player and Pagination */}
              <div className="mt-auto border-t border-tele-border p-5 bg-gray-50/50 rounded-b-[1.5rem]">
                 {recordingError && (
                   <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3">
                     <p className="text-sm font-medium text-red-700">
                       {recordingError?.message || 'Failed to play recording'}
                     </p>
                   </div>
                 )}

                 {activePlayback.url && (
                   <div className="mb-4 rounded-card border border-tele-primary/30 bg-white p-4 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-tele-primary"></div>
                      <div className="flex items-center justify-between gap-4 mb-3 pl-2">
                         <p className="text-sm font-bold text-tele-dark flex items-center">
                           <Play size={14} className="mr-2 text-tele-primary" />
                           Now Playing
                         </p>
                         <button
                           className="text-xs text-gray-500 hover:text-red-600 font-medium transition-colors underline underline-offset-2"
                           onClick={() => {
                             if (activePlayback.url) URL.revokeObjectURL(activePlayback.url)
                             setActivePlayback({ callId: '', url: '' })
                           }}
                         >
                           Close Player
                         </button>
                      </div>
                      <audio className="w-full h-10 outline-none" controls autoPlay src={activePlayback.url} />
                   </div>
                 )}

                 {items.length > 0 && (
                   <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <p className="text-sm text-gray-500">
                       Page <span className="font-bold text-tele-dark">{page}</span> of <span className="font-bold text-tele-dark">{totalPages}</span>
                     </p>
                     <div className="flex gap-2">
                       <Button
                         className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium px-4 h-9"
                         onPress={() => updateFilters({ page: Math.max(1, page - 1) })}
                         isDisabled={page <= 1 || isLoading}
                       >
                         Previous
                       </Button>
                       <Button
                         className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors text-sm font-medium px-4 h-9"
                         onPress={() => updateFilters({ page: Math.min(totalPages, page + 1) })}
                         isDisabled={page >= totalPages || isLoading}
                       >
                         Next
                       </Button>
                     </div>
                   </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </section>
  )
}

export default CallsPage
