import { Button, Card, Chip, Input, Table, Tabs } from '@heroui/react'
import PageHeader from '../../../components/common/PageHeader'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { followupsApi } from '../api/followupsApi'
import FollowUpFormModal from '../components/FollowUpFormModal'
import { Filter, Plus, RefreshCw, Calendar as CalendarIcon, Edit3, Search } from 'lucide-react'
import { useToast } from '../../../components/common/ToastProvider'
import { useAuth } from '../../auth/context/AuthContext'

const MANAGEMENT_ROLES = new Set(['admin', 'manager', 'team_lead'])
const AGENT_TASKS_PAGE_SIZE = 15
const DEFAULT_TASKS_PAGE_SIZE = 20
const INITIAL_COLUMN_FILTERS = {
  lead: '',
  phone: '',
  owner: '',
  dueAt: { from: '', to: '' },
  reason: '',
  priority: '',
  status: '',
}
const TASK_PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
]
const TASK_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function ColumnFilterDropdown({ isOpen, onApply, onClear, children }) {
  if (!isOpen) return null

  return (
    <div className="filter-dropdown-container absolute left-0 top-full z-50 mt-2 flex w-64 flex-col gap-3 rounded-card border border-tele-border bg-white p-3 text-tele-dark shadow-soft">
      <div className="flex flex-col gap-2">{children}</div>
      <div className="mt-1 flex justify-end gap-2 border-t border-tele-border pt-3">
        <Button
          size="sm"
          className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium"
          onPress={onClear}
        >
          Clear
        </Button>
        <Button
          size="sm"
          className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium"
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
      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
      placeholder={placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}

function SelectColumnFilter({ value, onChange, options, allLabel }) {
  return (
    <select
      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">{allLabel}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

function DateRangeColumnFilter({ value, onChange }) {
  return (
    <div className="grid gap-3">
      <label className="grid gap-1.5 text-xs font-medium text-gray-600">
        From
        <input
          type="date"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
          value={value?.from || ''}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      </label>
      <label className="grid gap-1.5 text-xs font-medium text-gray-600">
        To
        <input
          type="date"
          className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
          value={value?.to || ''}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          onClick={(e) => e.stopPropagation()}
        />
      </label>
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

const priorityTone = (p) => {
  const n = Number(p || 3)
  if (n >= 4) return { cls: 'bg-red-50 text-red-700 border-red-200', label: 'High' }
  if (n === 3) return { cls: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Medium' }
  return { cls: 'bg-tele-light/30 text-tele-primary border-tele-light', label: 'Low' }
}

const fmtDate = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const ownerLabel = (followUp) => {
  const owner = followUp?.assignee
  return owner?.fullName || owner?.email || owner?.phone || '-'
}

const taskLeadName = (followUp, fallback = '-') => {
  const lead = followUp?.lead || {}
  return [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || lead.phonePrimary || fallback
}

const priorityFilterValue = (priority) => {
  const n = Number(priority || 3)
  if (n >= 4) return 'high'
  if (n === 3) return 'medium'
  return 'low'
}

const toDateInputValue = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

const isColumnFilterValueActive = (value) => {
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => String(entry || '').trim() !== '')
  }
  return String(value || '').trim() !== ''
}

const isDueToday = (value) => {
  if (!value) return false
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return false
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

const statusToTab = (status) => {
  if (status === 'completed') return 'completed'
  if (status === 'cancelled') return 'cancelled'
  if (status === 'overdue') return 'overdue'
  return 'due'
}
function FollowupsPage() {
  const toast = useToast()
  const auth = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [tab, setTab] = useState(() => statusToTab(searchParams.get('status')))
  const [page, setPage] = useState(() => Number(searchParams.get('page') || 1))
  const limit = auth.roleCode === 'agent' ? AGENT_TASKS_PAGE_SIZE : DEFAULT_TASKS_PAGE_SIZE
  const [search, setSearch] = useState(() => searchParams.get('search') || '')
  const [selectedDate, setSelectedDate] = useState(() => searchParams.get('date') || '')
  const [columnFilters, setColumnFilters] = useState(INITIAL_COLUMN_FILTERS)
  const [tempColumnFilters, setTempColumnFilters] = useState(INITIAL_COLUMN_FILTERS)
  const [activeColumnFilter, setActiveColumnFilter] = useState(null)

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

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const followUpsFetchIdRef = useRef(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState('create')
  const [activeFollowUp, setActiveFollowUp] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)

  const canViewTeamFollowUps = MANAGEMENT_ROLES.has(auth.roleCode)
  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [total, limit])

  const effectiveStatus = useMemo(() => {
    if (tab === 'completed') return 'completed'
    if (tab === 'cancelled') return 'cancelled'
    if (tab === 'overdue') return 'overdue'
    return 'pending'
  }, [tab])
  const normalizedSearch = useMemo(() => (search || '').trim(), [search])
  const hasFilter = useMemo(
    () => Boolean(normalizedSearch || selectedDate || tab !== 'due'),
    [normalizedSearch, selectedDate, tab],
  )
  const requestHasFilter = useMemo(
    () => Boolean(normalizedSearch || selectedDate || effectiveStatus !== 'pending'),
    [effectiveStatus, normalizedSearch, selectedDate],
  )
  const hasAnyColumnFilter = useMemo(
    () => Object.values(columnFilters).some(isColumnFilterValueActive),
    [columnFilters],
  )

  const toggleColumnFilter = (column) => {
    if (activeColumnFilter === column) {
      setActiveColumnFilter(null)
      return
    }

    setTempColumnFilters(columnFilters)
    setActiveColumnFilter(column)
  }

  useEffect(() => {
    if (!activeColumnFilter) return undefined

    const handleOutsideClick = (event) => {
      if (!event.target.closest('.filter-dropdown-container')) {
        setActiveColumnFilter(null)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [activeColumnFilter])

  const isColumnFilterActive = (column) => isColumnFilterValueActive(columnFilters[column])

  const applyColumnFilter = (column) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: tempColumnFilters[column],
    }))
    updateFilters({ page: 1 })
    setActiveColumnFilter(null)
  }

  const clearColumnFilter = (column) => {
    setColumnFilters((prev) => ({ ...prev, [column]: INITIAL_COLUMN_FILTERS[column] }))
    setTempColumnFilters((prev) => ({ ...prev, [column]: INITIAL_COLUMN_FILTERS[column] }))
    updateFilters({ page: 1 })
    setActiveColumnFilter(null)
  }

  const clearColumnFilters = (syncPage = true) => {
    setColumnFilters(INITIAL_COLUMN_FILTERS)
    setTempColumnFilters(INITIAL_COLUMN_FILTERS)
    if (syncPage) updateFilters({ page: 1 })
    setActiveColumnFilter(null)
  }

  const fetchFollowUps = useCallback(async () => {
    const fetchId = followUpsFetchIdRef.current + 1
    followUpsFetchIdRef.current = fetchId
    setIsLoading(true)
    setError(null)
    try {
      let fromStr, toStr
      if (selectedDate) {
        const [y, m, d] = selectedDate.split('-').map(Number)
        const from = new Date(y, m - 1, d, 0, 0, 0, 0)
        const to = new Date(y, m - 1, d, 23, 59, 59, 999)
        fromStr = from.toISOString()
        toStr = to.toISOString()
      }

      const listMethod = canViewTeamFollowUps ? followupsApi.list : followupsApi.listMy
      const data = await listMethod({
        page,
        limit,
        status: effectiveStatus,
        from: fromStr,
        to: toStr,
        search: normalizedSearch || undefined,
        hasFilter: requestHasFilter,
      })
      if (fetchId !== followUpsFetchIdRef.current) return
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (e) {
      if (fetchId !== followUpsFetchIdRef.current) return
      setError(e)
    } finally {
      if (fetchId === followUpsFetchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [canViewTeamFollowUps, effectiveStatus, limit, normalizedSearch, page, requestHasFilter, selectedDate])

  useEffect(() => {
    setPage(Number(searchParams.get('page') || 1))
    setTab(statusToTab(searchParams.get('status')))
    setSearch(searchParams.get('search') || '')
    setSelectedDate(searchParams.get('date') || '')
  }, [searchParams])

  useEffect(() => {
    fetchFollowUps()
  }, [fetchFollowUps])

  const filteredItems = useMemo(() => {
    return items.filter((followUp) => {
      const lead = followUp.lead || {}
      const leadQuery = columnFilters.lead.trim().toLowerCase()
      if (leadQuery) {
        const leadValue = [taskLeadName(followUp), lead.email, lead.phonePrimary]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!leadValue.includes(leadQuery)) return false
      }

      const phoneQuery = columnFilters.phone.trim().toLowerCase()
      if (phoneQuery) {
        const phoneValue = [lead.phonePrimary, lead.phoneAlternate]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!phoneValue.includes(phoneQuery)) return false
      }

      const ownerQuery = columnFilters.owner.trim().toLowerCase()
      if (ownerQuery && !ownerLabel(followUp).toLowerCase().includes(ownerQuery)) return false

      const dueDate = toDateInputValue(followUp.dueAt)
      if (columnFilters.dueAt.from && (!dueDate || dueDate < columnFilters.dueAt.from)) return false
      if (columnFilters.dueAt.to && (!dueDate || dueDate > columnFilters.dueAt.to)) return false

      const reasonQuery = columnFilters.reason.trim().toLowerCase()
      if (reasonQuery && !String(followUp.reason || '').toLowerCase().includes(reasonQuery)) return false

      if (columnFilters.priority && priorityFilterValue(followUp.priority) !== columnFilters.priority) return false
      if (columnFilters.status && followUp.status !== columnFilters.status) return false

      return true
    })
  }, [columnFilters, items])

  const dueToday = useMemo(() => {
    if (effectiveStatus !== 'pending') return 0
    return items.filter((f) => isDueToday(f.dueAt)).length
  }, [items, effectiveStatus])

  const openCreate = () => {
    setSaveError(null)
    setModalMode('create')
    setActiveFollowUp(null)
    setModalOpen(true)
  }

  const openEdit = (followUp) => {
    setSaveError(null)
    setModalMode('edit')
    setActiveFollowUp(followUp)
    setModalOpen(true)
  }

  const clearFilters = () => {
    clearColumnFilters(false)
    updateFilters({ search: '', date: '', status: 'due', page: 1 })
  }

  const closeModal = () => {
    if (isSaving) return
    setModalOpen(false)
  }

  const onSubmit = async (payload) => {
    setIsSaving(true)
    setSaveError(null)
    try {
      if (modalMode === 'create') {
        await followupsApi.create(payload)
        toast.success('Follow-up created')
      } else {
        await followupsApi.update(activeFollowUp.id, payload)
        toast.success('Follow-up updated')
      }
      setModalOpen(false)
      await fetchFollowUps()
    } catch (e) {
      setSaveError(e)
      toast.error(e?.message || 'Failed to save follow-up')
      throw e
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Tasks"
        title="Follow-ups"
        description="Track, assign, and resolve scheduled tasks."
      />

      <div className="tele-card">
        <div className="p-6 border-b border-tele-border flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tele-dark">
              {canViewTeamFollowUps ? 'Team follow-ups' : 'My follow-ups'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing <span className="font-medium text-tele-dark">{hasAnyColumnFilter ? filteredItems.length : items.length}</span> of{' '}
              <span className="font-medium text-tele-dark">{total}</span> items.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <Button
              className="rounded-btn border border-tele-border bg-gray-50 text-gray-700 hover:bg-white transition-colors w-full sm:w-auto flex items-center justify-center font-medium px-4 h-10"
              onPress={() => fetchFollowUps()}
              isDisabled={isLoading}
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            <Button
              className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto flex items-center justify-center font-medium px-5 h-10"
              onPress={openCreate}
            >
              <Plus size={16} className="mr-2" />
              Create follow-up
            </Button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full relative">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Search Tasks</span>
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  placeholder="Lead, phone, owner, reason..."
                  className="w-full rounded-input border border-tele-border bg-gray-50 py-2.5 pl-10 pr-3 h-[42px] text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                  value={search}
                  onChange={(e) => {
                    updateFilters({ search: e.target.value, page: 1 })
                  }}
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto items-end">
               <label className="block w-full sm:w-auto">
                 <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Due Date</span>
                 <input
                   type="date"
                   className="w-full sm:w-auto rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                   value={selectedDate}
                   onChange={(e) => {
                     updateFilters({ date: e.target.value, page: 1 })
                   }}
                 />
               </label>
               <Button
                 className="rounded-btn border border-tele-border bg-gray-50 text-gray-700 hover:bg-white h-[42px] px-4 font-medium transition-colors w-full sm:w-auto"
                 onPress={() => {
                   updateFilters({ date: '', page: 1 })
                 }}
               >
                 Clear Date
               </Button>
               {hasFilter ? (
                 <Button
                   className="rounded-btn border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 h-[42px] px-4 font-medium transition-colors w-full sm:w-auto"
                   onPress={clearFilters}
                 >
                   Reset All
                 </Button>
               ) : null}
            </div>
          </div>
          
          {hasAnyColumnFilter && (
            <div className="flex justify-end">
              <Button
                size="sm"
                className="rounded-full border border-red-200 bg-red-50 text-red-600 text-xs px-3 font-medium hover:bg-red-100 transition-colors"
                onPress={() => clearColumnFilters()}
              >
                Clear table column filters
              </Button>
            </div>
          )}

          <div className="border-b border-tele-border mb-4">
             <div className="flex overflow-x-auto scrollbar-hide space-x-1 p-1">
                <button 
                  onClick={() => updateFilters({ status: 'due', page: 1 })}
                  className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${tab === 'due' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
                >
                  Pending 
                  {effectiveStatus === 'pending' && dueToday > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-orange-100 text-orange-700 border border-orange-200">
                      {dueToday} due today
                    </span>
                  )}
                </button>
                <button 
                  onClick={() => updateFilters({ status: 'overdue', page: 1 })}
                  className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${tab === 'overdue' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
                >
                  Overdue
                </button>
                <button 
                  onClick={() => updateFilters({ status: 'completed', page: 1 })}
                  className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${tab === 'completed' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
                >
                  Completed
                </button>
                <button 
                  onClick={() => updateFilters({ status: 'cancelled', page: 1 })}
                  className={`px-4 py-2.5 text-sm font-bold rounded-t-lg transition-colors whitespace-nowrap ${tab === 'cancelled' ? 'bg-tele-primary/10 text-tele-primary border-b-2 border-tele-primary' : 'text-gray-500 hover:text-tele-dark hover:bg-gray-50'}`}
                >
                  Cancelled
                </button>
             </div>
          </div>

          <div className="min-h-[400px]">
             {error ? (
               <div className="rounded-card border border-red-200 bg-red-50 p-4">
                 <p className="text-sm font-medium text-red-700">
                   {error.message || 'Failed to load follow-ups'}
                 </p>
               </div>
             ) : null}

             {isLoading ? (
               <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                 <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
                 <p className="font-medium text-tele-dark">Loading tasks...</p>
               </div>
             ) : null}

             {!isLoading && !filteredItems.length && !error ? (
               <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50/50 rounded-card border border-tele-border">
                  <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                     <CalendarIcon className="text-gray-400" size={24} />
                  </div>
                 <p className="font-bold text-lg text-tele-dark">No follow-ups found</p>
                 <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                   {hasFilter || hasAnyColumnFilter ? 'Try clearing filters or changing the search parameters.' : 'Create a follow-up when a lead needs attention.'}
                 </p>
               </div>
             ) : null}

             {/* Mobile View */}
             {!isLoading && filteredItems.length > 0 ? (
               <div className="grid gap-4 md:hidden">
                 {filteredItems.map((f) => {
                   const lead = f.lead || {}
                   const tone = priorityTone(f.priority)
                   const leadName = `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.phonePrimary || 'Lead'
                   return (
                     <div key={f.id} className="rounded-card border border-tele-border bg-white p-4">
                       <div className="flex items-start justify-between gap-3 mb-3">
                         <div className="min-w-0">
                           <p className="truncate text-base font-bold text-tele-dark">{leadName}</p>
                           <p className="text-gray-500 mt-1 truncate text-sm">{lead.phonePrimary || '-'}</p>
                         </div>
                         <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${tone.cls}`}>
                           {tone.label}
                         </span>
                       </div>
                       <div className="flex flex-col gap-2 mb-4 text-sm text-gray-600">
                         <div className="flex items-center">
                            <span className="font-medium w-16">Due:</span> 
                            <span className={isDueToday(f.dueAt) ? "text-orange-600 font-bold" : ""}>{fmtDate(f.dueAt)}</span>
                         </div>
                         {canViewTeamFollowUps && (
                           <div className="flex items-center">
                              <span className="font-medium w-16">Owner:</span> 
                              <span>{ownerLabel(f)}</span>
                           </div>
                         )}
                         <div className="flex items-start">
                            <span className="font-medium w-16">Reason:</span> 
                            <span className="flex-1">{f.reason || '-'}</span>
                         </div>
                       </div>
                       <div className="pt-3 border-t border-gray-100 flex justify-end">
                         <Button
                           className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-9 px-4 text-sm"
                           onPress={() => openEdit(f)}
                         >
                           <Edit3 size={14} className="mr-2 inline" /> Edit Task
                         </Button>
                       </div>
                     </div>
                   )
                 })}
               </div>
             ) : null}

             {/* Desktop Table View */}
             {!isLoading && filteredItems.length > 0 ? (
               <div className="hidden md:block overflow-x-auto rounded-card border border-tele-border">
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600 border-b border-tele-border">
                       <tr>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Lead"
                              column="lead"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('lead')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <TextColumnFilter
                                value={tempColumnFilters.lead}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, lead: value }))}
                                placeholder="Search lead..."
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Phone"
                              column="phone"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('phone')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <TextColumnFilter
                                value={tempColumnFilters.phone}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, phone: value }))}
                                placeholder="Search phone..."
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Owner"
                              column="owner"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('owner')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <TextColumnFilter
                                value={tempColumnFilters.owner}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, owner: value }))}
                                placeholder="Search owner..."
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Due At"
                              column="dueAt"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('dueAt')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <DateRangeColumnFilter
                                value={tempColumnFilters.dueAt}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, dueAt: value }))}
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Reason"
                              column="reason"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('reason')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <TextColumnFilter
                                value={tempColumnFilters.reason}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, reason: value }))}
                                placeholder="Search reason..."
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Priority"
                              column="priority"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('priority')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <SelectColumnFilter
                                value={tempColumnFilters.priority}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, priority: value }))}
                                options={TASK_PRIORITY_OPTIONS}
                                allLabel="All"
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider relative group">
                            <ColumnFilterHeader
                              label="Status"
                              column="status"
                              activeDropdown={activeColumnFilter}
                              isActive={isColumnFilterActive('status')}
                              onToggle={toggleColumnFilter}
                              onApply={applyColumnFilter}
                              onClear={clearColumnFilter}
                            >
                              <SelectColumnFilter
                                value={tempColumnFilters.status}
                                onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, status: value }))}
                                options={TASK_STATUS_OPTIONS}
                                allLabel="All"
                              />
                            </ColumnFilterHeader>
                          </th>
                          <th className="px-5 py-3 font-semibold uppercase tracking-wider"></th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-tele-border text-tele-dark bg-white">
                      {filteredItems.map((f) => {
                        const lead = f.lead || {}
                        const leadName = taskLeadName(f)
                        const tone = priorityTone(f.priority)
                        return (
                          <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-5 py-4 font-bold text-tele-dark">{leadName}</td>
                             <td className="px-5 py-4 text-gray-600">{lead.phonePrimary || '-'}</td>
                             <td className="px-5 py-4 text-gray-600">{ownerLabel(f)}</td>
                             <td className={`px-5 py-4 ${isDueToday(f.dueAt) && f.status === 'pending' ? 'text-orange-600 font-bold' : 'text-gray-500'}`}>{fmtDate(f.dueAt)}</td>
                             <td className="px-5 py-4 text-gray-700 max-w-[200px] truncate" title={f.reason}>{f.reason || '-'}</td>
                             <td className="px-5 py-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${tone.cls}`}>
                                  {tone.label}
                                </span>
                             </td>
                             <td className="px-5 py-4">
                               <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200 capitalize">
                                  {f.status}
                               </span>
                             </td>
                             <td className="px-5 py-4 text-right">
                               <Button
                                 className="rounded border border-tele-border bg-white text-gray-700 hover:bg-gray-50 transition-colors h-8 px-3 text-xs font-medium"
                                 onPress={() => openEdit(f)}
                               >
                                 Edit
                               </Button>
                             </td>
                          </tr>
                        )
                      })}
                    </tbody>
                 </table>
               </div>
             ) : null}

             {/* Pagination */}
             {items.length > 0 && (
               <div className="flex flex-col sm:flex-row items-center justify-between pt-6 border-t border-transparent gap-4">
                 <p className="text-sm text-gray-500">
                   Page <span className="font-bold text-tele-dark">{page}</span> of{' '}
                   <span className="font-bold text-tele-dark">{totalPages}</span> — {limit} per page
                 </p>
                 <div className="flex gap-2">
                   <Button
                     className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
                     onPress={() => updateFilters({ page: Math.max(1, page - 1) })}
                     isDisabled={page <= 1 || isLoading}
                   >
                     Previous
                   </Button>
                   <Button
                     className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 h-9 px-4 text-sm font-medium transition-colors"
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
      
      <FollowUpFormModal
        key={`${modalOpen ? 'open' : 'closed'}-${activeFollowUp?.id || modalMode}`}
        isOpen={modalOpen}
        mode={modalMode}
        initialFollowUp={activeFollowUp}
        canEdit={true}
        isSaving={isSaving}
        error={saveError}
        onClose={closeModal}
        onSubmit={onSubmit}
      />
    </section>
  )
}

export default FollowupsPage
