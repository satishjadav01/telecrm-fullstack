import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '@heroui/react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../../components/common/PageHeader'
import { useAuth } from '../../auth/context/AuthContext'
import { usersApi } from '../../users/api/usersApi'
import { recordingsApi } from '../api/recordingsApi'
import { useToast } from '../../../components/common/ToastProvider'
import { RefreshCw, Play, Download, StopCircle, Search, Filter, Mic } from 'lucide-react'

// Reusable Filter Sub-components
function ColumnFilterDropdown({ isOpen, onApply, onClear, children }) {
  if (!isOpen) return null
  return (
    <div className="absolute top-full left-0 mt-2 z-50 w-64 p-3 bg-white border border-tele-border rounded-card shadow-soft flex flex-col gap-3 text-tele-dark filter-dropdown-container">
      <div className="flex flex-col gap-2">
        {children}
      </div>
      <div className="flex gap-2 justify-end border-t border-tele-border pt-3 mt-1">
        <Button
          size="sm"
          className="bg-white border border-tele-border text-gray-700 hover:bg-gray-50 rounded-btn font-medium"
          onPress={onClear}
        >
          Clear
        </Button>
        <Button
          size="sm"
          className="bg-tele-primary text-white hover:bg-tele-secondary rounded-btn font-medium"
          onPress={onApply}
        >
          Apply
        </Button>
      </div>
    </div>
  )
}

function TextColumnFilter({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary text-tele-dark font-normal"
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

function DateRangeColumnFilter({ from, to, onChangeFrom, onChangeTo }) {
  return (
    <div className="flex flex-col gap-3 text-left" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 font-medium px-0.5">From</span>
        <input
          type="date"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary text-tele-dark font-normal"
          value={from || ''}
          onChange={(e) => onChangeFrom(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 font-medium px-0.5">To</span>
        <input
          type="date"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary text-tele-dark font-normal"
          value={to || ''}
          onChange={(e) => onChangeTo(e.target.value)}
        />
      </div>
    </div>
  )
}

function NumberRangeColumnFilter({ min, max, onChangeMin, onChangeMax, minLabel, maxLabel }) {
  return (
    <div className="flex flex-col gap-3 text-left" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 font-medium px-0.5">{minLabel}</span>
        <input
          type="number"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary text-tele-dark font-normal"
          value={min || ''}
          onChange={(e) => onChangeMin(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-gray-500 font-medium px-0.5">{maxLabel}</span>
        <input
          type="number"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary text-tele-dark font-normal"
          value={max || ''}
          onChange={(e) => onChangeMax(e.target.value)}
        />
      </div>
    </div>
  )
}

function ColumnFilterHeader({ label, column, activeDropdown, isActive, onToggle, onApply, onClear, children }) {
  return (
    <div className="filter-dropdown-container relative inline-flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      <button
        type="button"
        className="rounded p-1 text-gray-400 hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label={'Filter ' + label}
        onClick={() => onToggle(column)}
      >
        <Filter
          size={14}
          className={isActive ? 'fill-tele-primary text-tele-primary' : 'text-gray-400'}
        />
      </button>
      <ColumnFilterDropdown
        isOpen={activeDropdown === column}
        onApply={() => onApply(column)}
        onClear={() => onClear(column)}
      >
        {children}
      </ColumnFilterDropdown>
    </div>
  )
}

const MANAGEMENT_ROLES = new Set(['admin', 'manager', 'team_lead'])
const RECORDINGS_PAGE_SIZE = 10

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (value) => {
  if (value === null || value === undefined) return '-'
  const secs = Number(value)
  if (!Number.isFinite(secs) || secs <= 0) return '-'
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${String(rem).padStart(2, '0')}s`
}

const formatBytes = (bytes) => {
  if (!bytes) return '-'
  const size = Number(bytes)
  if (!Number.isFinite(size)) return '-'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
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

const leadLabel = (recording) => {
  const lead = recording?.lead
  if (!lead) return 'Unknown Lead'
  return `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.phonePrimary || 'Unknown Lead'
}

const agentLabel = (recording) => {
  const agent = recording?.agent
  return agent?.fullName || agent?.email || agent?.phone || '-'
}

export default function RecordingsPage() {
  const auth = useAuth()
  const toast = useToast()
  const isManagement = MANAGEMENT_ROLES.has(auth.roleCode)
  const [searchParams, setSearchParams] = useSearchParams()

  const [agents, setAgents] = useState([])
  const [selectedAgentId, setSelectedAgentId] = useState(() => searchParams.get('agentId') || '')
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [from, setFrom] = useState(() => toDateInput(searchParams.get('from')))
  const [to, setTo] = useState(() => toDateInput(searchParams.get('to')))
  const [page, setPage] = useState(() => Number(searchParams.get('page') || 1))

  // Column filter state management
  const initialFilterState = {
    lead: '',
    agent: '',
    dateFrom: '',
    dateTo: '',
    durationMin: '',
    durationMax: '',
    sizeMin: '',
    sizeMax: '',
  }
  const [columnFilters, setColumnFilters] = useState(initialFilterState)
  const [tempFilters, setTempFilters] = useState(initialFilterState)
  const [activeDropdown, setActiveDropdown] = useState(null)

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
  const [limit] = useState(RECORDINGS_PAGE_SIZE)
  const [recordings, setRecordings] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [activePlayback, setActivePlayback] = useState({ callId: '', url: '' })
  const [busyAction, setBusyAction] = useState('')
  const recordingsFetchIdRef = useRef(0)

  const effectiveAgentId = useMemo(() => {
    return isManagement ? selectedAgentId : auth.user?.id || ''
  }, [auth.user?.id, isManagement, selectedAgentId])

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [limit, total])
  const pageStart = total > 0 ? (page - 1) * limit + 1 : 0
  const pageEnd = total > 0 ? Math.min(page * limit, total) : 0
  const hasFilter = useMemo(
    () => Boolean((search || '').trim() || from || to || (isManagement && selectedAgentId)),
    [from, isManagement, search, selectedAgentId, to],
  )

  // Toggle single column filter dropdown
  const toggleDropdown = (column) => {
    if (activeDropdown === column) {
      setActiveDropdown(null)
    } else {
      setTempFilters(columnFilters)
      setActiveDropdown(column)
    }
  }

  // Handle outside clicks to close activeDropdown
  useEffect(() => {
    if (!activeDropdown) return
    const handleOutsideClick = (event) => {
      if (!event.target.closest('.filter-dropdown-container')) {
        setActiveDropdown(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [activeDropdown])

  const isFilterActive = (column) => {
    if (column === 'lead') return Boolean(columnFilters.lead)
    if (column === 'agent') return Boolean(columnFilters.agent)
    if (column === 'date') return Boolean(columnFilters.dateFrom || columnFilters.dateTo)
    if (column === 'duration') return Boolean(columnFilters.durationMin || columnFilters.durationMax)
    if (column === 'size') return Boolean(columnFilters.sizeMin || columnFilters.sizeMax)
    return false
  }

  const hasAnyColumnFilter = useMemo(() => {
    return Object.values(columnFilters).some((val) => val !== '')
  }, [columnFilters])

  const handleApplyFilter = (column) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      if (column === 'lead') {
        next.lead = tempFilters.lead
      } else if (column === 'agent') {
        next.agent = tempFilters.agent
      } else if (column === 'date') {
        next.dateFrom = tempFilters.dateFrom
        next.dateTo = tempFilters.dateTo
      } else if (column === 'duration') {
        next.durationMin = tempFilters.durationMin
        next.durationMax = tempFilters.durationMax
      } else if (column === 'size') {
        next.sizeMin = tempFilters.sizeMin
        next.sizeMax = tempFilters.sizeMax
      }
      return next
    })
    setPage(1)
    updateFilters({ page: 1 })
    setActiveDropdown(null)
  }

  const handleClearFilter = (column) => {
    setColumnFilters((prev) => {
      const next = { ...prev }
      if (column === 'lead') {
        next.lead = ''
      } else if (column === 'agent') {
        next.agent = ''
      } else if (column === 'date') {
        next.dateFrom = ''
        next.dateTo = ''
      } else if (column === 'duration') {
        next.durationMin = ''
        next.durationMax = ''
      } else if (column === 'size') {
        next.sizeMin = ''
        next.sizeMax = ''
      }
      return next
    })
    setTempFilters((prev) => {
      const next = { ...prev }
      if (column === 'lead') {
        next.lead = ''
      } else if (column === 'agent') {
        next.agent = ''
      } else if (column === 'date') {
        next.dateFrom = ''
        next.dateTo = ''
      } else if (column === 'duration') {
        next.durationMin = ''
        next.durationMax = ''
      } else if (column === 'size') {
        next.sizeMin = ''
        next.sizeMax = ''
      }
      return next
    })
    setPage(1)
    updateFilters({ page: 1 })
    setActiveDropdown(null)
  }

  const handleClearAllColumnFilters = () => {
    setColumnFilters(initialFilterState)
    setTempFilters(initialFilterState)
    setPage(1)
    updateFilters({ page: 1 })
  }

  // Memoized filter logic matching multiple active filters
  const filteredRecordings = useMemo(() => {
    return recordings.filter((rec) => {
      // 1. Lead filter
      if (columnFilters.lead) {
        const leadVal = leadLabel(rec).toLowerCase()
        const leadPhone = (rec.lead?.phonePrimary || '').toLowerCase()
        const searchVal = columnFilters.lead.toLowerCase()
        if (!leadVal.includes(searchVal) && !leadPhone.includes(searchVal)) {
          return false
        }
      }

      // 2. Agent filter
      if (columnFilters.agent) {
        const agentVal = agentLabel(rec).toLowerCase()
        const searchVal = columnFilters.agent.toLowerCase()
        if (!agentVal.includes(searchVal)) {
          return false
        }
      }

      // 3. Date & Time filter
      if (columnFilters.dateFrom || columnFilters.dateTo) {
        const recTime = rec.createdAt ? new Date(rec.createdAt).getTime() : null
        if (!recTime) return false

        if (columnFilters.dateFrom) {
          const fromTime = new Date(`${columnFilters.dateFrom}T00:00:00`).getTime()
          if (recTime < fromTime) return false
        }
        if (columnFilters.dateTo) {
          const toTime = new Date(`${columnFilters.dateTo}T23:59:59.999`).getTime()
          if (recTime > toTime) return false
        }
      }

      // 4. Duration filter (in seconds)
      if (columnFilters.durationMin || columnFilters.durationMax) {
        const dur = rec.durationSeconds || rec.call?.durationSeconds || 0
        if (columnFilters.durationMin && dur < Number(columnFilters.durationMin)) return false
        if (columnFilters.durationMax && dur > Number(columnFilters.durationMax)) return false
      }

      // 5. Size filter (in KB)
      if (columnFilters.sizeMin || columnFilters.sizeMax) {
        const bytes = rec.fileSizeBytes || 0
        const kb = bytes / 1024
        if (columnFilters.sizeMin && kb < Number(columnFilters.sizeMin)) return false
        if (columnFilters.sizeMax && kb > Number(columnFilters.sizeMax)) return false
      }

      return true
    })
  }, [recordings, columnFilters])

  const fetchAgents = useCallback(async () => {
    if (!isManagement) return
    try {
      const data = await usersApi.list({ page: 1, limit: 100, isActive: true })
      setAgents(data.items?.filter((u) => u.role?.code === 'agent') || [])
    } catch (e) {
      toast.error(e?.message || 'Failed to load agents')
    }
  }, [isManagement, toast])

  const fetchRecordings = useCallback(async () => {
    if (!isManagement && !effectiveAgentId) {
      recordingsFetchIdRef.current += 1
      setIsLoading(false)
      setRecordings([])
      setTotal(0)
      return
    }

    const fetchId = recordingsFetchIdRef.current + 1
    recordingsFetchIdRef.current = fetchId
    setIsLoading(true)
    try {
      const params = {
        page,
        limit,
        search: search || undefined,
        from: toRangeStartIso(from),
        to: toRangeEndIso(to),
        hasFilter,
      }
      const data = isManagement
        ? await recordingsApi.list({ ...params, agentId: selectedAgentId || undefined })
        : await recordingsApi.listForAgent(effectiveAgentId, params)

      if (fetchId !== recordingsFetchIdRef.current) return

      const rawItems = Array.isArray(data) ? data : data?.items || []
      const hasServerPage = !Array.isArray(data) && Number(data?.page) > 0
      const hasServerLimit = !Array.isArray(data) && Number(data?.limit) > 0
      const nextItems = hasServerPage && hasServerLimit
        ? rawItems.slice(0, limit)
        : rawItems.slice((page - 1) * limit, page * limit)

      setRecordings(nextItems)
      setTotal(Number(data?.total ?? rawItems.length))
    } catch (e) {
      if (fetchId !== recordingsFetchIdRef.current) return
      toast.error(e?.message || 'Failed to fetch recordings')
    } finally {
      if (fetchId === recordingsFetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [effectiveAgentId, from, hasFilter, isManagement, limit, page, selectedAgentId, search, to, toast])

  useEffect(() => {
    setPage(Number(searchParams.get('page') || 1))
    setSelectedAgentId(searchParams.get('agentId') || '')
    setSearch(searchParams.get('search') || '')
    setFrom(toDateInput(searchParams.get('from')))
    setTo(toDateInput(searchParams.get('to')))
  }, [searchParams])

  useEffect(() => {
    const timer = setTimeout(fetchAgents, 0)
    return () => clearTimeout(timer)
  }, [fetchAgents])

  useEffect(() => {
    const timer = setTimeout(fetchRecordings, 0)
    return () => clearTimeout(timer)
  }, [fetchRecordings])

  useEffect(() => {
    if (!isLoading && page > totalPages) {
      setPage(totalPages)
    }
  }, [isLoading, page, totalPages])

  useEffect(() => {
    return () => {
      if (activePlayback.url) {
        URL.revokeObjectURL(activePlayback.url)
      }
    }
  }, [activePlayback.url])

  const clearFilters = () => {
    updateFilters({ agentId: '', search: '', from: '', to: '', page: 1 })
    handleClearAllColumnFilters()
  }

  const handlePlay = async (callId) => {
    setBusyAction(`play:${callId}`)
    try {
      if (activePlayback.url) {
        URL.revokeObjectURL(activePlayback.url)
      }
      const objectUrl = await recordingsApi.createPlaybackObjectUrl(callId)
      setActivePlayback({ callId, url: objectUrl })
    } catch (e) {
      toast.error(e?.message || 'Failed to open recording')
    } finally {
      setBusyAction('')
    }
  }
  const handleStopPlayback = () => {
    if (activePlayback.url) {
      URL.revokeObjectURL(activePlayback.url)
    }
    setActivePlayback({ callId: '', url: '' })
  }
  const handleDownload = async (callId, fileName) => {
    setBusyAction(`download:${callId}`)
    try {
      await recordingsApi.downloadForCall(callId, fileName || `recording-${callId}.webm`)
    } catch (e) {
      toast.error(e?.message || 'Failed to download recording')
    } finally {
      setBusyAction('')
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Quality"
        title={isManagement ? 'Team Recordings' : 'My Recordings'}
        description="Listen, download, and review call recordings."
      />
      
      <div className="tele-card">
        {/* Controls & Search Header */}
        <div className="p-6 border-b border-tele-border space-y-4">
          <div className="flex flex-col lg:flex-row justify-between gap-4 lg:items-end">
            <div className="flex-1 w-full relative">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Search Recordings</span>
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full rounded-input border border-tele-border bg-gray-50 py-2.5 pl-10 pr-3 h-[42px] text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                  placeholder="Search lead, phone, date..."
                  value={search}
                  onChange={(e) => {
                    updateFilters({ search: e.target.value, page: 1 })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchRecordings()
                    }
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-end">
               {isManagement && (
                 <label className="block w-full sm:w-auto">
                   <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Agent</span>
                   <select
                     className="w-full sm:w-auto min-w-[150px] rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                     value={selectedAgentId}
                     onChange={(e) => {
                       updateFilters({ agentId: e.target.value, page: 1 })
                     }}
                   >
                     <option value="">All agents</option>
                     {agents.map((a) => (
                       <option key={a.id} value={a.id}>
                         {a.fullName || a.email || a.phone}
                       </option>
                     ))}
                   </select>
                 </label>
               )}

               <label className="block w-full sm:w-auto">
                 <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">From</span>
                 <input
                   className="w-full sm:w-auto rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                   type="date"
                   value={from}
                   onChange={(e) => {
                     updateFilters({ from: e.target.value, page: 1 })
                   }}
                 />
               </label>
               <label className="block w-full sm:w-auto">
                 <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">To</span>
                 <input
                   className="w-full sm:w-auto rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                   type="date"
                   value={to}
                   onChange={(e) => {
                     updateFilters({ to: e.target.value, page: 1 })
                   }}
                 />
               </label>
               
               <div className="flex gap-2 w-full sm:w-auto">
                 <Button
                   className="flex-1 sm:flex-none rounded-btn border border-tele-border bg-gray-50 text-gray-700 hover:bg-white h-[42px] px-4 font-medium transition-colors"
                   onPress={fetchRecordings}
                   isLoading={isLoading}
                   isDisabled={isLoading || (!isManagement && !effectiveAgentId)}
                 >
                   <RefreshCw size={16} className={isLoading ? "hidden" : "mr-2"} />
                   Refresh
                 </Button>
                 
                 {(hasFilter || hasAnyColumnFilter) && (
                   <Button
                     className="flex-1 sm:flex-none rounded-btn border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 h-[42px] px-4 font-medium transition-colors"
                     onPress={clearFilters}
                   >
                     Clear All
                   </Button>
                 )}
               </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
             <p className="text-sm font-medium text-gray-500">
               {isLoading ? 'Loading data...' : `${filteredRecordings.length} of ${total} total records`}
             </p>
             {hasAnyColumnFilter && (
               <Button
                 size="sm"
                 className="rounded-full border border-red-200 bg-red-50 text-red-600 text-xs px-3 font-medium hover:bg-red-100 transition-colors h-7"
                 onPress={handleClearAllColumnFilters}
               >
                 Clear table filters
               </Button>
             )}
          </div>
        </div>

        {/* Data Area */}
        <div className="p-0 min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
               <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
               <p className="font-medium text-tele-dark">Loading recordings...</p>
            </div>
          ) : null}

          {!isLoading && recordings.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50">
               <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Mic className="text-gray-400" size={24} />
               </div>
               <p className="font-bold text-lg text-tele-dark">No recordings found</p>
               <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                 {hasFilter || hasAnyColumnFilter ? 'Try clearing filters or changing the search parameters.' : 'No call recordings are available yet.'}
               </p>
            </div>
          ) : null}

          {!isLoading && recordings.length > 0 ? (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-sm whitespace-nowrap">
                 <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                    <tr>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider group">
                         <ColumnFilterHeader
                            label="Lead"
                            column="lead"
                            activeDropdown={activeDropdown}
                            isActive={isFilterActive('lead')}
                            onToggle={toggleDropdown}
                            onApply={() => handleApplyFilter('lead')}
                            onClear={() => handleClearFilter('lead')}
                          >
                            <TextColumnFilter
                              value={tempFilters.lead}
                              onChange={(val) => setTempFilters((prev) => ({ ...prev, lead: val }))}
                              placeholder="Search lead or phone..."
                            />
                          </ColumnFilterHeader>
                       </th>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider group">
                         <ColumnFilterHeader
                            label="Agent"
                            column="agent"
                            activeDropdown={activeDropdown}
                            isActive={isFilterActive('agent')}
                            onToggle={toggleDropdown}
                            onApply={() => handleApplyFilter('agent')}
                            onClear={() => handleClearFilter('agent')}
                          >
                            <TextColumnFilter
                              value={tempFilters.agent}
                              onChange={(val) => setTempFilters((prev) => ({ ...prev, agent: val }))}
                              placeholder="Search agent name..."
                            />
                          </ColumnFilterHeader>
                       </th>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider group">
                         <ColumnFilterHeader
                            label="Date & Time"
                            column="date"
                            activeDropdown={activeDropdown}
                            isActive={isFilterActive('date')}
                            onToggle={toggleDropdown}
                            onApply={() => handleApplyFilter('date')}
                            onClear={() => handleClearFilter('date')}
                          >
                            <DateRangeColumnFilter
                              from={tempFilters.dateFrom}
                              to={tempFilters.dateTo}
                              onChangeFrom={(val) => setTempFilters((prev) => ({ ...prev, dateFrom: val }))}
                              onChangeTo={(val) => setTempFilters((prev) => ({ ...prev, dateTo: val }))}
                            />
                          </ColumnFilterHeader>
                       </th>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider group">
                         <ColumnFilterHeader
                            label="Duration"
                            column="duration"
                            activeDropdown={activeDropdown}
                            isActive={isFilterActive('duration')}
                            onToggle={toggleDropdown}
                            onApply={() => handleApplyFilter('duration')}
                            onClear={() => handleClearFilter('duration')}
                          >
                            <NumberRangeColumnFilter
                              min={tempFilters.durationMin}
                              max={tempFilters.durationMax}
                              onChangeMin={(val) => setTempFilters((prev) => ({ ...prev, durationMin: val }))}
                              onChangeMax={(val) => setTempFilters((prev) => ({ ...prev, durationMax: val }))}
                              minLabel="Min duration (seconds)"
                              maxLabel="Max duration (seconds)"
                            />
                          </ColumnFilterHeader>
                       </th>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider group">
                         <ColumnFilterHeader
                            label="Size"
                            column="size"
                            activeDropdown={activeDropdown}
                            isActive={isFilterActive('size')}
                            onToggle={toggleDropdown}
                            onApply={() => handleApplyFilter('size')}
                            onClear={() => handleClearFilter('size')}
                          >
                            <NumberRangeColumnFilter
                              min={tempFilters.sizeMin}
                              max={tempFilters.sizeMax}
                              onChangeMin={(val) => setTempFilters((prev) => ({ ...prev, sizeMin: val }))}
                              onChangeMax={(val) => setTempFilters((prev) => ({ ...prev, sizeMax: val }))}
                              minLabel="Min size (KB)"
                              maxLabel="Max size (KB)"
                            />
                          </ColumnFilterHeader>
                       </th>
                       <th className="px-5 py-3 font-semibold uppercase tracking-wider">Playback & Download</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-tele-border text-tele-dark bg-white">
                   {filteredRecordings.map((rec) => {
                     const isPlaying = busyAction === `play:${rec.callId}`
                     const isDownloading = busyAction === `download:${rec.callId}`
                     const isPlaybackOpen = activePlayback.callId === rec.callId && Boolean(activePlayback.url)

                     return (
                       <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="px-5 py-4">
                            <div className="flex flex-col">
                               <span className="font-bold text-tele-dark">{leadLabel(rec)}</span>
                               <span className="text-gray-500 text-xs mt-0.5">{rec.lead?.phonePrimary || '-'}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-gray-700">{agentLabel(rec)}</td>
                          <td className="px-5 py-4 text-gray-600">{formatDateTime(rec.createdAt)}</td>
                          <td className="px-5 py-4 text-gray-700 font-medium">{formatDuration(rec.durationSeconds || rec.call?.durationSeconds)}</td>
                          <td className="px-5 py-4 text-gray-500">{formatBytes(rec.fileSizeBytes)}</td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-2 min-w-[200px]">
                               <div className="flex items-center gap-2">
                                  {isPlaybackOpen ? (
                                    <Button
                                      size="sm"
                                      className="rounded-btn bg-red-50 text-red-600 hover:bg-red-100 font-medium h-8 border border-red-200"
                                      startContent={<StopCircle size={14} />}
                                      onPress={handleStopPlayback}
                                    >
                                      Stop
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium h-8 px-4"
                                      startContent={!isPlaying ? <Play size={14} /> : null}
                                      onPress={() => handlePlay(rec.callId)}
                                      isLoading={isPlaying}
                                      isDisabled={busyAction !== '' && !isPlaying}
                                    >
                                      Play
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    className="rounded-btn bg-white border border-tele-border text-gray-700 hover:bg-gray-50 font-medium h-8"
                                    startContent={!isDownloading ? <Download size={14} /> : null}
                                    onPress={() => handleDownload(rec.callId, rec.fileName)}
                                    isLoading={isDownloading}
                                    isDisabled={busyAction !== '' && !isDownloading}
                                  >
                                    Download
                                  </Button>
                               </div>
                               {isPlaybackOpen && (
                                 <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-200">
                                   <audio src={activePlayback.url} controls autoPlay className="h-8 w-full max-w-xs" />
                                 </div>
                               )}
                            </div>
                          </td>
                       </tr>
                     )
                   })}
                 </tbody>
              </table>
            </div>
          ) : null}
        </div>
        
        {/* Pagination Footer */}
        {total > 0 && (
          <div className="p-6 border-t border-tele-border bg-gray-50 rounded-b-card flex flex-col sm:flex-row items-center justify-between gap-4">
             <p className="text-sm text-gray-500">
               Showing <span className="font-bold text-tele-dark">{pageStart}</span> to <span className="font-bold text-tele-dark">{pageEnd}</span> of <span className="font-bold text-tele-dark">{total}</span> recordings
             </p>
             <div className="flex gap-2 w-full sm:w-auto">
               <Button
                 className="flex-1 sm:flex-none rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
                 onPress={() => updateFilters({ page: Math.max(1, page - 1) })}
                 isDisabled={page <= 1 || isLoading}
               >
                 Previous
               </Button>
               <Button
                 className="flex-1 sm:flex-none rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
                 onPress={() => updateFilters({ page: Math.min(totalPages, page + 1) })}
                 isDisabled={page >= totalPages || isLoading}
               >
                 Next
               </Button>
             </div>
          </div>
        )}
      </div>
    </section>
  )
}
