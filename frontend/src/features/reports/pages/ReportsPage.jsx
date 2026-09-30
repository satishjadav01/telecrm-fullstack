import { Button, Chip, ProgressBar } from '@heroui/react'
import { RefreshCw, Filter, BarChart3, TrendingUp, Users, PhoneCall, PieChart, Activity } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import PageHeader from '../../../components/common/PageHeader'
import StatCard from '../../../components/common/StatCard'
import { useAuth } from '../../auth/context/AuthContext'
import { reportsApi } from '../api/reportsApi'

const RANGE_OPTIONS = [
  { label: 'All time', value: 'all_time' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'This month', value: 'this_month' },
  { label: 'Custom', value: 'custom' },
]

const STAGE_ORDER = [
  ['new', 'New'],
  ['attempted', 'Attempted'],
  ['connected', 'Connected'],
  ['follow_up', 'Follow up'],
  ['converted', 'Converted'],
  ['dropped', 'Dropped'],
]

const OUTCOME_LABELS = {
  in_progress: 'In progress',
  no_answer: 'No answer',
  busy: 'Busy',
  interested: 'Interested',
  not_interested: 'Not interested',
  callback: 'Callback',
  converted: 'Converted',
}

const outcomeColors = {
  converted: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  interested: 'bg-blue-100 text-blue-700 border-blue-200',
  callback: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
  not_interested: 'bg-red-100 text-red-700 border-red-200',
  busy: 'bg-orange-100 text-orange-700 border-orange-200',
  no_answer: 'bg-gray-100 text-gray-700 border-gray-200',
}

const getOutcomeColor = (outcome) => outcomeColors[outcome] || 'bg-gray-100 text-gray-700 border-gray-200'

const toDateInput = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = String(d.getFullYear())
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const dateAtLocalStart = (value) => {
  const d = new Date(`${value}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : d
}

const dateAtLocalEnd = (value) => {
  const d = new Date(`${value}T23:59:59.999`)
  return Number.isNaN(d.getTime()) ? null : d
}

const getRangeDates = (range, customDates) => {
  if (range === 'all_time') return {}

  const now = new Date()
  let from = new Date(now)
  let to = new Date(now)

  switch (range) {
    case 'today':
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case 'yesterday':
      from.setDate(now.getDate() - 1)
      from.setHours(0, 0, 0, 0)
      to.setDate(now.getDate() - 1)
      to.setHours(23, 59, 59, 999)
      break
    case '7d':
      from.setDate(now.getDate() - 7)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case '30d':
      from.setDate(now.getDate() - 30)
      from.setHours(0, 0, 0, 0)
      to.setHours(23, 59, 59, 999)
      break
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1)
      to.setHours(23, 59, 59, 999)
      break
    case 'custom': {
      const customFrom = customDates?.from ? dateAtLocalStart(customDates.from) : null
      const customTo = customDates?.to ? dateAtLocalEnd(customDates.to) : null
      return {
        from: customFrom ? customFrom.toISOString() : undefined,
        to: customTo ? customTo.toISOString() : undefined,
      }
    }
    default:
      return {}
  }

  return { from: from.toISOString(), to: to.toISOString() }
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatDuration = (value) => {
  const secs = Number(value || 0)
  if (!Number.isFinite(secs) || secs <= 0) return '-'
  const mins = Math.floor(secs / 60)
  const rem = secs % 60
  return `${mins}m ${String(rem).padStart(2, '0')}s`
}

const clampPct = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x)) return 0
  return Math.max(0, Math.min(100, x))
}

const displayName = (person) => {
  const full = `${person?.firstName || ''} ${person?.lastName || ''}`.trim()
  return person?.fullName || full || person?.phonePrimary || person?.email || person?.phone || '-'
}

const outcomeLabel = (value) => OUTCOME_LABELS[value || 'in_progress'] || String(value).replaceAll('_', ' ')

function ReportsPage() {
  const auth = useAuth()
  const isAgent = auth.roleCode === 'agent'
  const [dateRange, setDateRange] = useState('all_time')
  const [customDates, setCustomDates] = useState(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 30)
    return { from: toDateInput(start), to: toDateInput(now) }
  })
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [filterOptions, setFilterOptions] = useState({ agents: [], sources: [] })
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingFilters, setIsLoadingFilters] = useState(false)
  const [error, setError] = useState(null)
  const [showFilters, setShowFilters] = useState(true)

  const effectiveAgentId = isAgent ? auth.user?.id : selectedAgentId

  const reportParams = useMemo(() => ({
    ...getRangeDates(dateRange, customDates),
    agentId: effectiveAgentId || undefined,
    source: selectedSource || undefined,
  }), [customDates, dateRange, effectiveAgentId, selectedSource])

  const rangeLabel = RANGE_OPTIONS.find((item) => item.value === dateRange)?.label || 'All time'

  const fetchFilterOptions = useCallback(async () => {
    setIsLoadingFilters(true)
    try {
      const data = await reportsApi.filterOptions()
      setFilterOptions({
        agents: Array.isArray(data?.agents) ? data.agents : [],
        sources: Array.isArray(data?.sources) ? data.sources : [],
      })
    } catch {
      setFilterOptions({ agents: [], sources: [] })
    } finally {
      setIsLoadingFilters(false)
    }
  }, [])

  const fetchReports = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await reportsApi.dashboardSummary(reportParams)
      setSummary(data || null)
    } catch (e) {
      setError(e)
      setSummary(null)
    } finally {
      setIsLoading(false)
    }
  }, [reportParams])

  useEffect(() => {
    const timer = setTimeout(fetchFilterOptions, 0)
    return () => clearTimeout(timer)
  }, [fetchFilterOptions])

  useEffect(() => {
    const timer = setTimeout(fetchReports, 0)
    return () => clearTimeout(timer)
  }, [fetchReports])

  const funnel = summary?.funnel || null
  const agentPerf = useMemo(
    () => (Array.isArray(summary?.performance) ? summary.performance : []),
    [summary?.performance],
  )
  const calls = useMemo(
    () => (Array.isArray(summary?.calendar?.calls) ? summary.calendar.calls : []),
    [summary?.calendar?.calls],
  )
  const followups = useMemo(
    () => (Array.isArray(summary?.calendar?.followups) ? summary.calendar.followups : []),
    [summary?.calendar?.followups],
  )

  const totalLeads = funnel?.totalLeads || 0
  const totalCalls = calls.length
  const totalFollowups = followups.length
  const converted = funnel?.stages?.converted || 0
  const dropped = funnel?.stages?.dropped || 0
  const conversionRate = totalLeads ? Number(((converted / totalLeads) * 100).toFixed(2)) : 0
  const dropRate = totalLeads ? Number(((dropped / totalLeads) * 100).toFixed(2)) : 0
  const interestedCalls = agentPerf.reduce((sum, row) => sum + (row.interestedCalls || 0), 0)
  const callbackCalls = agentPerf.reduce((sum, row) => sum + (row.callbackCalls || 0), 0)
  const interestRate = totalCalls ? Number(((interestedCalls / totalCalls) * 100).toFixed(2)) : 0

  const topAgent = useMemo(() => {
    if (!agentPerf.length) return null
    return [...agentPerf].sort((a, b) => (b.totalCalls || 0) - (a.totalCalls || 0))[0]
  }, [agentPerf])

  const outcomeMix = useMemo(() => {
    const map = new Map()
    for (const call of calls) {
      const key = call.disposition || 'in_progress'
      map.set(key, (map.get(key) || 0) + 1)
    }
    return [...map.entries()]
      .map(([key, count]) => ({ key, count, pct: totalCalls ? Number(((count / totalCalls) * 100).toFixed(2)) : 0 }))
      .sort((a, b) => b.count - a.count)
  }, [calls, totalCalls])

  const recentActivity = useMemo(() => {
    const callRows = calls.map((call) => ({
      id: `call-${call.id}`,
      type: 'Call',
      at: call.createdAt,
      lead: call.lead,
      owner: call.agent,
      detail: `${call.direction || 'call'} / ${outcomeLabel(call.disposition)}`,
      meta: formatDuration(call.durationSeconds),
    }))
    const followupRows = followups.map((followup) => ({
      id: `followup-${followup.id}`,
      type: 'Follow-up',
      at: followup.dueAt,
      lead: followup.lead,
      owner: followup.assignee,
      detail: followup.reason || followup.status || 'pending',
      meta: `P${followup.priority || 3}`,
    }))

    return [...callRows, ...followupRows]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 12)
  }, [calls, followups])

  const kpis = [
    { title: `Leads`, value: String(totalLeads), delta: conversionRate ? `Conv ${conversionRate}%` : '' },
    { title: `Calls`, value: String(totalCalls), delta: callbackCalls ? `${callbackCalls} callbacks` : '' },
    { title: `Follow-ups`, value: String(totalFollowups), delta: totalFollowups ? 'Scheduled tasks' : '' },
    { title: 'Interest rate', value: `${interestRate}%`, delta: interestedCalls ? `${interestedCalls} interested` : '' },
  ]

  return (
    <section className="space-y-6 overflow-hidden">
      <PageHeader
        badge="Analytics"
        title="Reports & Insights"
        description="Track team performance, lead progress, calls, and follow-up workload."
      />

      <div className="tele-card">
        <div className="p-5 border-b border-tele-border flex justify-between items-center bg-gray-50 rounded-t-[1.5rem]">
           <div className="flex items-center gap-3">
              <BarChart3 className="text-tele-primary" size={20} />
              <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Report Configuration</h2>
           </div>
           <div className="flex items-center gap-2">
              <Button
                className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 font-medium h-9 px-4 text-xs"
                onPress={() => setShowFilters(!showFilters)}
                startContent={<Filter size={14} />}
              >
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button
                className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary font-medium h-9 px-4 text-xs shadow-md shadow-tele-primary/20"
                startContent={<RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />}
                onPress={fetchReports}
                isDisabled={isLoading}
              >
                Refresh Data
              </Button>
           </div>
        </div>

        {showFilters && (
          <div className="p-6 space-y-4">
            <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-4">
              {!isAgent ? (
                <label className="block w-full">
                  <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Agent</span>
                  <select
                    className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    disabled={isLoadingFilters}
                  >
                    <option value="">All agents</option>
                    {filterOptions.agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.fullName || agent.email || agent.phone}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="block w-full">
                <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Lead Source</span>
                <select
                  className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  disabled={isLoadingFilters}
                >
                  <option value="">All sources</option>
                  {filterOptions.sources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block w-full">
                <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Date Range</span>
                <select
                  className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary appearance-none cursor-pointer"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                >
                  {RANGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {dateRange === 'custom' ? (
                <>
                  <label className="block w-full">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">From</span>
                    <input
                      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                      type="date"
                      value={customDates.from}
                      onChange={(e) => setCustomDates((prev) => ({ ...prev, from: e.target.value }))}
                    />
                  </label>
                  <label className="block w-full">
                    <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">To</span>
                    <input
                      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                      type="date"
                      value={customDates.to}
                      onChange={(e) => setCustomDates((prev) => ({ ...prev, to: e.target.value }))}
                    />
                  </label>
                </>
              ) : null}
            </div>

            {error ? (
              <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error.message || 'Failed to load reports'}
              </div>
            ) : null}
            
            {isLoading ? (
               <div className="rounded-card bg-tele-light/30 border border-tele-light p-4 flex items-center justify-center gap-3">
                  <div className="inline-block animate-spin rounded-full h-5 w-5 border-b-2 border-tele-primary"></div>
                  <p className="text-sm font-medium text-tele-primary">Generating report data...</p>
               </div>
            ) : null}
            
            <div className="flex items-center gap-2 mt-2">
               <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                 Range: {rangeLabel}
               </span>
               {selectedAgentId && (
                 <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                   Agent Filter Active
                 </span>
               )}
               {selectedSource && (
                 <span className="px-2 py-1 rounded bg-gray-100 text-gray-600 text-xs font-medium border border-gray-200">
                   Source: {selectedSource}
                 </span>
               )}
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Conversion Funnel */}
        <div className="tele-card xl:col-span-2">
           <div className="p-5 border-b border-tele-border bg-gray-50 flex items-center justify-between rounded-t-[1.5rem]">
              <div className="flex items-center gap-3">
                 <TrendingUp className="text-tele-primary" size={20} />
                 <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Conversion Funnel</h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-700 border border-gray-200 shadow-sm">
                 {totalLeads} Total Leads
              </span>
           </div>
           <div className="p-6">
              <div className="grid md:grid-cols-2 gap-8 mb-8">
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-bold text-gray-600">Conversion Rate</span>
                       <span className="text-2xl font-black text-tele-primary">{conversionRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                       <div className="bg-tele-primary h-3 rounded-full transition-all duration-500" style={{ width: `${clampPct(conversionRate)}%` }}></div>
                    </div>
                 </div>
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-bold text-gray-600">Drop Rate</span>
                       <span className="text-2xl font-black text-red-500">{dropRate}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-3">
                       <div className="bg-red-400 h-3 rounded-full transition-all duration-500" style={{ width: `${clampPct(dropRate)}%` }}></div>
                    </div>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {STAGE_ORDER.map(([key, label], idx) => (
                    <div key={key} className="rounded-card border border-tele-border bg-white p-4 relative overflow-hidden group hover:border-tele-primary/30 transition-colors">
                       <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                         <BarChart3 size={40} className="text-tele-primary" />
                       </div>
                       <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2 relative z-10">{label}</p>
                       <p className="text-3xl font-black text-tele-dark relative z-10">{funnel?.stages?.[key] || 0}</p>
                       
                       <div className="absolute bottom-0 left-0 h-1 bg-tele-primary" style={{ width: `${clampPct(((funnel?.stages?.[key] || 0) / (totalLeads || 1)) * 100)}%` }}></div>
                    </div>
                 ))}
              </div>
           </div>
        </div>

        {/* Outcome Mix */}
        <div className="tele-card">
           <div className="p-5 border-b border-tele-border bg-gray-50 flex items-center justify-between rounded-t-[1.5rem]">
              <div className="flex items-center gap-3">
                 <PieChart className="text-indigo-600" size={20} />
                 <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Call Outcomes</h2>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-700 border border-gray-200 shadow-sm">
                 {totalCalls} Calls
              </span>
           </div>
           <div className="p-6 space-y-5 h-[400px] overflow-y-auto scrollbar-soft">
             {!outcomeMix.length && !isLoading ? (
               <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                 <PhoneCall size={32} className="text-gray-300 mb-3" />
                 <p className="font-bold text-tele-dark">No call outcomes</p>
                 <p className="text-xs mt-1">Change the date range or generate call data.</p>
               </div>
             ) : null}
             
             {outcomeMix.map((item) => (
               <div key={item.key}>
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-tele-dark">{outcomeLabel(item.key)}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500">{item.count}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${getOutcomeColor(item.key)}`}>
                        {item.pct}%
                      </span>
                    </div>
                 </div>
                 <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full transition-all duration-500 ${item.key === 'converted' ? 'bg-emerald-500' : item.key === 'not_interested' ? 'bg-red-400' : 'bg-tele-primary'}`} style={{ width: `${clampPct(item.pct)}%` }}></div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
         {/* Agent Performance */}
         <div className="tele-card">
            <div className="p-5 border-b border-tele-border bg-gray-50 flex items-center justify-between rounded-t-[1.5rem]">
               <div className="flex items-center gap-3">
                  <Users className="text-orange-500" size={20} />
                  <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Agent Performance</h2>
               </div>
               {topAgent?.agent?.fullName ? (
                 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-orange-100 text-orange-700 border border-orange-200">
                   Top: {topAgent.agent.fullName}
                 </span>
               ) : (
                 <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white text-gray-700 border border-gray-200 shadow-sm">
                   {agentPerf.length} Agents
                 </span>
               )}
            </div>
            
            <div className="p-0 overflow-x-auto min-h-[300px]">
              {!agentPerf.length && !isLoading ? (
                <div className="text-center p-12 text-gray-500 flex flex-col items-center">
                  <p className="font-bold text-tele-dark">No agent data found</p>
                  <p className="text-xs mt-1">Try expanding the date range.</p>
                </div>
              ) : null}

              {agentPerf.length ? (
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-gray-500 border-b border-tele-border">
                       <tr>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Agent</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Calls</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Conv</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Intr</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Rates</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-tele-border bg-white">
                       {agentPerf.map((row) => (
                          <tr key={row.agentId || 'unknown'} className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-5 py-3 font-bold text-tele-dark">{row.agent?.fullName || row.agent?.email || row.agentId || '-'}</td>
                             <td className="px-5 py-3 font-medium text-gray-700">{row.totalCalls}</td>
                             <td className="px-5 py-3 font-medium text-emerald-600">{row.convertedCalls}</td>
                             <td className="px-5 py-3 font-medium text-blue-600">{row.interestedCalls}</td>
                             <td className="px-5 py-3">
                                <div className="flex gap-2">
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold" title="Conversion Rate">
                                    C: {row.conversionRate}%
                                  </span>
                                  <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-bold" title="Interest Rate">
                                    I: {row.interestRate}%
                                  </span>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              ) : null}
            </div>
         </div>

         {/* Recent Activity */}
         <div className="tele-card">
            <div className="p-5 border-b border-tele-border bg-gray-50 flex items-center justify-between rounded-t-[1.5rem]">
               <div className="flex items-center gap-3">
                  <Activity className="text-tele-primary" size={20} />
                  <h2 className="text-sm font-bold text-tele-dark uppercase tracking-wider">Recent Activity</h2>
               </div>
               <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] uppercase font-bold bg-tele-light/30 text-tele-primary border border-tele-light">
                 {recentActivity.length} Events
               </span>
            </div>

            <div className="p-0 overflow-x-auto min-h-[300px]">
              {!recentActivity.length && !isLoading ? (
                <div className="text-center p-12 text-gray-500 flex flex-col items-center">
                  <p className="font-bold text-tele-dark">No recent activity</p>
                  <p className="text-xs mt-1">The selected filters did not return any events.</p>
                </div>
              ) : null}

              {recentActivity.length ? (
                 <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-white text-gray-500 border-b border-tele-border">
                       <tr>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Type</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Lead</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Detail</th>
                          <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider">Time</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-tele-border bg-white">
                       {recentActivity.map((row) => (
                          <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                             <td className="px-5 py-3">
                               <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${row.type === 'Call' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                 {row.type}
                               </span>
                             </td>
                             <td className="px-5 py-3">
                               <div className="flex flex-col">
                                 <span className="font-bold text-tele-dark">{displayName(row.lead)}</span>
                                 <span className="text-[10px] text-gray-400">{displayName(row.owner)}</span>
                               </div>
                             </td>
                             <td className="px-5 py-3">
                               <div className="flex flex-col">
                                 <span className="font-medium text-gray-700">{row.detail}</span>
                                 <span className="text-[10px] text-gray-400 font-semibold">{row.meta}</span>
                               </div>
                             </td>
                             <td className="px-5 py-3 text-xs text-gray-500">{formatDateTime(row.at)}</td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              ) : null}
            </div>
         </div>
      </div>
    </section>
  )
}

export default ReportsPage