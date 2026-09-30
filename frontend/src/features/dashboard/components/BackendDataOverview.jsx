import { Button, Card, Chip } from '@heroui/react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Database,
  Headphones,
  PhoneCall,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  TrendingUp,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { callsApi } from '../../calls/api/callsApi'
import { followupsApi } from '../../followups/api/followupsApi'
import { leadsApi } from '../../leads/api/leadsApi'
import { phoneDevicesApi } from '../../phoneDevices/api/phoneDevicesApi'
import { recordingsApi } from '../../recordings/api/recordingsApi'
import { reportsApi } from '../../reports/api/reportsApi'
import { companiesApi } from '../../superAdmin/api/companiesApi'
import { rbacApi } from '../../superAdmin/api/rbacApi'
import { usersApi } from '../../users/api/usersApi'
const MANAGEMENT_ROLES = new Set(['admin', 'manager', 'team_lead'])
const SUPER_ROLES = new Set(['super_admin'])
const AUTO_REFRESH_MS = 60000

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
}

const asArray = (value) => {
  if (Array.isArray(value)) return value
  if (Array.isArray(value?.items)) return value.items
  if (Array.isArray(value?.data)) return value.data
  if (Array.isArray(value?.checkouts)) return value.checkouts
  return []
}
const totalFrom = (value, items) => {
  const total = value?.total ?? value?.totalFound ?? value?.count
  const parsed = Number(total)
  return Number.isFinite(parsed) ? parsed : items.length
}
const displayName = (person) => {
  const full = `${person?.firstName || ''} ${person?.lastName || ''}`.trim()
  return person?.fullName || full || person?.phonePrimary || person?.email || person?.phone || '-'
}
const formatDate = (value) => {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}
const mapDashboardSummary = (data) => ({
  total: data?.funnel?.totalLeads || 0,
  items: [],
  meta: 'Summary loaded',
  preview: [],
  metrics: {
    totalLeads: data?.funnel?.totalLeads || 0,
    stages: data?.funnel?.stages || {},
    calls: data?.calendar?.calls || [],
    followups: data?.calendar?.followups || [],
    performance: data?.performance || [],
    activeAgents: data?.activeAgents || 0,
  },
})
const hasActiveQueryParams = (queryParams = {}) => {
  return Object.values(queryParams).some((value) => {
    if (value === undefined || value === null) return false
    return String(value).trim() !== ''
  })
}
const listParser = (value, previewMapper, metaBuilder) => {
  const items = asArray(value)
  return {
    total: totalFrom(value, items),
    items,
    meta: metaBuilder?.(value, items) || `${items.length} loaded now`,
    hasFilter: Boolean(value?.hasFilter),
    preview: items.slice(0, 3).map(previewMapper).filter(Boolean),
  }
}
const roleCopy = (roleCode) => {
  if (roleCode === 'agent') {
    return {
      eyebrow: 'My work today',
      title: 'My Workspace',
      description: 'Track leads, calls, follow-ups, and recordings effortlessly',
    }
  }
  if (MANAGEMENT_ROLES.has(roleCode)) {
    return {
      eyebrow: 'Team performance',
      title: 'Team command center',
      description: 'Monitor pipeline, calls, agents, and workload.',
    }
  }
  if (SUPER_ROLES.has(roleCode)) {
    return {
      eyebrow: 'System overview',
      title: 'Platform command center',
      description: 'Companies, RBAC, and system-wide configuration signals.',
    }
  }
  return {
    eyebrow: 'Live overview',
    title: 'Backend command center',
    description: 'Live backend modules are loaded together with partial failure protection.',
  }
}
const buildDatasetSpecs = ({ roleCode, userId, queryParams = {} }) => {
  const specs = []
  const selfQueryParams = { ...queryParams }
  delete selfQueryParams.agentId
  const selfHasFilter = hasActiveQueryParams(selfQueryParams)
  if (roleCode === 'agent' && userId) {
    specs.push(
      {
        key: 'summary',
        label: 'My summary',
        icon: TrendingUp,
        to: '/leads',
        load: () => reportsApi.dashboardSummary({ ...selfQueryParams, agentId: userId }),
        parse: mapDashboardSummary,
      },
      {
        key: 'leads',
        label: 'My lead pool',
        icon: UsersRound,
        to: '/leads',
        hasFilter: selfHasFilter,
        load: () => leadsApi.list({ page: 1, limit: 5, ...selfQueryParams, assignedTo: userId, hasFilter: selfHasFilter }),
        parse: (data) =>
          listParser(
            data,
            (lead) => `${displayName(lead)} - ${lead.stage || 'lead'}`,
            (value, items) => `${items.length} loaded`,
          ),
      },
      {
        key: 'calls',
        label: 'My calls',
        icon: PhoneCall,
        to: '/agent/calls',
        hasFilter: selfHasFilter,
        load: () => callsApi.list({ page: 1, limit: 5, ...selfQueryParams, agentId: userId, hasFilter: selfHasFilter }),
        parse: (data) =>
          listParser(
            data,
            (call) => `${displayName(call?.lead)} - ${call.disposition || 'call'}`,
            (value, items) => `${items.length} recent`,
          ),
      },
      {
        key: 'followups',
        label: 'My follow-ups',
        icon: CalendarCheck,
        to: '/followups?status=pending',
        hasFilter: selfHasFilter,
        load: () => followupsApi.listMy({ page: 1, limit: 5, status: 'pending', ...selfQueryParams, hasFilter: selfHasFilter }),
        parse: (data) =>
          listParser(
            data,
            (followup) => `${displayName(followup?.lead)} - ${followup.status || 'follow-up'}`,
            (value, items) => `${items.length} pending`,
          ),
      },
      {
        key: 'recordings',
        label: 'My recordings',
        icon: Headphones,
        to: '/recordings',
        hasFilter: selfHasFilter,
        load: () => recordingsApi.listForAgent(userId, { page: 1, limit: 5, ...selfQueryParams, hasFilter: selfHasFilter }),
        parse: (data) =>
          listParser(data, (rec) => `${displayName(rec?.lead)} - ${formatDate(rec.createdAt)}`, () => 'Agent recording library'),
      },
    )
  }
  if (MANAGEMENT_ROLES.has(roleCode)) {
    const hasFilter = hasActiveQueryParams(queryParams)
    specs.push(
      {
        key: 'summary',
        label: 'Team summary',
        icon: TrendingUp,
        to: '/leads',
        load: () => reportsApi.dashboardSummary(queryParams),
        parse: mapDashboardSummary,
      },
      {
        key: 'leads',
        label: 'Team lead pool',
        icon: UsersRound,
        to: '/leads',
        hasFilter: hasFilter,
        load: () => leadsApi.list({ page: 1, limit: 5, ...queryParams, hasFilter }),
        parse: (data) =>
          listParser(
            data,
            (lead) => `${displayName(lead)} - ${lead.stage || 'lead'}`,
            (value, items) => `${items.length} loaded`,
          ),
      },
      {
        key: 'calls',
        label: 'Team calls',
        icon: PhoneCall,
        to: '/calls',
        hasFilter: hasFilter,
        load: () => callsApi.list({ page: 1, limit: 5, ...queryParams, hasFilter }),
        parse: (data) =>
          listParser(
            data,
            (call) => `${displayName(call?.lead)} - ${call.disposition || 'call'}`,
            (value, items) => `${items.length} recent`,
          ),
      },
      {
        key: 'followups',
        label: 'Team follow-ups',
        icon: CalendarCheck,
        to: '/followups?status=pending',
        hasFilter: hasFilter,
        load: () => followupsApi.list({ page: 1, limit: 5, status: 'pending', ...queryParams, hasFilter }),
        parse: (data) =>
          listParser(
            data,
            (followup) => `${displayName(followup?.lead)} - ${followup.status || 'follow-up'}`,
            (value, items) => `${items.length} pending`,
          ),
      },
      {
        key: 'recordings',
        label: 'Team recordings',
        icon: Headphones,
        to: '/recordings',
        hasFilter: hasFilter,
        load: () => recordingsApi.list({ page: 1, limit: 5, ...queryParams, hasFilter }),
        parse: (data) =>
          listParser(data, (rec) => `${displayName(rec?.lead)} - ${formatDate(rec.createdAt)}`, () => 'Team recording library'),
      },
      {
        key: 'users',
        label: 'Users',
        icon: ShieldCheck,
        to: '/admin-setup',
        load: () => usersApi.list({ page: 1, limit: 100, isActive: true }),
        parse: (data) =>
          listParser(
            data,
            (user) => `${displayName(user)} - ${user.role?.code || 'user'}`,
            (value, items) => `${items.filter((user) => user.role?.code === 'agent').length} active agents`,
          ),
      },
      {
        key: 'phones',
        label: 'Phone devices',
        icon: Smartphone,
        to: '/admin-setup',
        load: () => phoneDevicesApi.list({ page: 1, limit: 100, isActive: true }),
        parse: (data) =>
          listParser(
            data,
            (phone) => `${phone.label || phone.imei || 'Phone'} - ${phone.assignedTo?.fullName || 'Unassigned'}`,
            (value, items) => `${items.filter((phone) => phone.assignedToUserId).length} assigned`,
          ),
      },
    )
  }
  if (SUPER_ROLES.has(roleCode)) {
    specs.push(
      {
        key: 'companies',
        label: 'Companies',
        icon: Building2,
        to: '/super/companies',
        load: () => companiesApi.list({ page: 1, limit: 100 }),
        parse: (data) =>
          listParser(data, (company) => `${company.name || 'Company'} - ${company.isActive ? 'active' : 'inactive'}`),
      },
      {
        key: 'roles',
        label: 'RBAC roles',
        icon: ShieldCheck,
        to: '/super/rbac',
        load: () => rbacApi.listRoles({ page: 1, limit: 100, isActive: true }),
        parse: (data) => listParser(data, (role) => `${role.name || role.code} - ${role.code}`),
      },
    )
  }
  return specs
}
const makeUnavailableRow = (spec, error) => {
  const message = error?.message || 'Failed to load'
  const configured = !/not configured|configuration|provide a custom api url/i.test(message)

  return {
    ...spec,
    status: spec.optional && !configured ? 'quiet' : 'error',
    total: 0,
    items: [],
    meta: spec.optional && !configured ? 'Not configured yet' : 'Unavailable for this account',
    preview: [],
    error: spec.optional && !configured ? 'Add configuration when needed' : message,
  }
}
const getRow = (rows, key) => rows.find((row) => row.key === key)
const EXCLUDED_BACKEND_MODULES = new Set([
  'summary',
  'leads',
  'calls',
  'followups',
  'shopify',
  'users',
  'phones',
])
const buildKpis = ({ rows, roleCode }) => {
  const summary = getRow(rows, 'summary')
  const leads = getRow(rows, 'leads')
  const calls = getRow(rows, 'calls')
  const followups = getRow(rows, 'followups')
  const recordings = getRow(rows, 'recordings')
  const users = getRow(rows, 'users')
  const phones = getRow(rows, 'phones')
  const companies = getRow(rows, 'companies')
  const roles = getRow(rows, 'roles')
  const stages = summary?.metrics?.stages || {}
  const callItems = calls?.items || []
  const followupItems = followups?.items || []
  const pendingFollowups = followupItems.filter((item) => item.status === 'pending').length
  const noAnswerCalls = callItems.filter((call) => ['no_answer', 'busy'].includes(call.disposition)).length
  const callbackCalls = callItems.filter((call) => call.disposition === 'callback').length
  const activeAgents = (users?.items || []).filter((user) => user.role?.code === 'agent').length
  const assignedPhones = (phones?.items || []).filter((phone) => phone.assignedToUserId).length
  if (SUPER_ROLES.has(roleCode)) {
    return [
      { label: 'Companies', value: companies?.total || 0, detail: 'All tenants', icon: Building2, to: '/super/companies' },
      { label: 'Active roles', value: roles?.total || 0, detail: 'RBAC ready', icon: ShieldCheck, to: '/super/rbac' },
      { label: 'Live modules', value: rows.filter((row) => row.status === 'ready').length, detail: `${rows.length} checked`, icon: Database, to: '/super/rbac' },
    ]
  }
  if (roleCode === 'agent') {
    return [
      { label: 'My lead pool', value: leads?.total || summary?.metrics?.totalLeads || 0, detail: `${Number(stages.new || 0)} new`, icon: UsersRound, to: '/leads' },
      { label: 'Calls in range', value: calls?.total || summary?.metrics?.calls?.length || 0, detail: `${callbackCalls} callbacks`, icon: PhoneCall, to: '/agent/calls' },
      { label: 'Pending follow-ups', value: pendingFollowups, detail: 'Needs attention', icon: CalendarCheck, to: '/followups?status=pending' },
      { label: 'Recordings', value: recordings?.total || callItems.filter((call) => call.recording).length, detail: 'Available audio', icon: Headphones, to: '/recordings' },
    ]
  }
  return [
    { label: 'Total leads', value: leads?.total || summary?.metrics?.totalLeads || 0, detail: `${Number(stages.converted || 0)} converted`, icon: UsersRound, to: '/leads' },
    { label: 'Team calls', value: calls?.total || summary?.metrics?.calls?.length || 0, detail: `${noAnswerCalls} missed/busy`, icon: PhoneCall, to: '/calls' },
    { label: 'Pending follow-ups', value: pendingFollowups, detail: 'Open tasks', icon: CalendarCheck, to: '/followups?status=pending' },
    { label: 'Active agents', value: activeAgents || summary?.metrics?.activeAgents || summary?.metrics?.performance?.length || 0, detail: `${assignedPhones} phones assigned`, icon: ShieldCheck, to: '/admin-setup' },
  ]
}
function SkeletonOverview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-card border border-tele-border bg-white p-5 shadow-soft">
          <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-200" />
          <div className="mt-5 h-4 w-28 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-8 w-16 animate-pulse rounded bg-gray-200" />
          <div className="mt-4 h-3 w-full animate-pulse rounded bg-gray-200" />
        </div>
      ))}
    </div>
  )
}
function KpiCard({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      className="group relative min-w-0 overflow-hidden rounded-card border border-tele-border bg-white p-5 shadow-soft transition-all hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tele-light text-tele-primary transition group-hover:scale-105">
          <Icon size={18} />
        </div>
        <ArrowRight className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-tele-primary" size={17} />
      </div>
      <p className="mt-5 truncate text-sm font-semibold text-gray-500">{item.label}</p>
      <p className="mt-1 text-3xl font-bold leading-none text-tele-dark">{item.value}</p>
      <p className="mt-2 text-sm text-gray-400">{item.detail}</p>
    </NavLink>
  )
}
function ModuleCard({ row }) {
  const Icon = row.icon
  const isReady = row.status === 'ready'
  const isQuiet = row.status === 'quiet'
  const chipClass = isReady
    ? 'bg-tele-light/50 text-tele-primary border-tele-light'
    : isQuiet
      ? 'bg-gray-100 text-gray-600 border-gray-200'
      : 'bg-red-50 text-red-600 border-red-100'
  return (
    <NavLink
      to={row.to || '/'}
      className="relative min-w-0 overflow-hidden rounded-card border border-tele-border bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tele-light text-tele-primary">
            <Icon size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-gray-500">{row.label}</p>
            <p className="mt-1 text-2xl font-bold leading-none text-tele-dark">{row.total}</p>
          </div>
        </div>
        <Chip
          className={`${chipClass} border`}
          size="sm"
          variant="flat"
          startContent={isReady ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
        >
          {isReady ? 'Live' : isQuiet ? 'Setup' : 'Check'}
        </Chip>
      </div>

      <p className="mt-3 text-sm text-gray-400">{row.meta}</p>

      <div className="mt-3 space-y-2">
        {row.preview.length ? row.preview.map((item) => (
          <div key={item} className="truncate rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600 border border-gray-100">
            {item}
          </div>
        )) : (
          <div className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-400 border border-gray-100">
            {isReady ? 'No recent records returned' : row.error}
          </div>
        )}
      </div>
    </NavLink>
  )
}
function BackendDataOverview({ roleCode, userId, queryParams = {} }) {
  const [isLoading, setIsLoading] = useState(true)
  const [rows, setRows] = useState([])
  const [lastUpdated, setLastUpdated] = useState(null)
  const overviewFetchIdRef = useRef(0)

  const specs = useMemo(
    () => buildDatasetSpecs({ roleCode, userId, queryParams }),
    [roleCode, userId, queryParams],
  )

  const fetchAll = useCallback(async () => {
    const fetchId = overviewFetchIdRef.current + 1
    overviewFetchIdRef.current = fetchId
    setIsLoading(true)
    const settled = await Promise.allSettled(specs.map((spec) => spec.load()))

    if (fetchId !== overviewFetchIdRef.current) return

    setRows(
      settled.map((result, index) => {
        const spec = specs[index]
        if (result.status === 'fulfilled') {
          return {
            ...spec,
            status: 'ready',
            ...spec.parse(result.value),
          }
        }

        return makeUnavailableRow(spec, result.reason)
      }),
    )
    setLastUpdated(new Date())
    setIsLoading(false)
  }, [specs])

  useEffect(() => {
    const timer = setTimeout(fetchAll, 0)
    return () => clearTimeout(timer)
  }, [fetchAll])

  useEffect(() => {
    const timer = setInterval(fetchAll, AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [fetchAll])

  const copy = roleCopy(roleCode)
  const readyCount = rows.filter((row) => row.status === 'ready').length
  const kpis = buildKpis({ rows, roleCode })
  const visibleRows = rows.filter((row) => !EXCLUDED_BACKEND_MODULES.has(row.key))
  const statusLabel = isLoading && !rows.length ? 'Loading' : `${readyCount}/${rows.length || specs.length} live`

  return (
    <div className="tele-card overflow-hidden">
      <div className="p-6 border-b border-tele-border flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tele-primary text-white shadow-sm">
            <Database size={21} />
          </div>
          <div>
            <div className="mb-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-tele-light text-tele-primary">
              {copy.eyebrow}
            </div>
            <h2 className="text-xl font-bold text-tele-dark md:text-2xl">{copy.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{copy.description}</p>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            {statusLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
            <Clock3 size={13} />
            Auto 60s
          </span>
          {lastUpdated ? (
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-tele-light/50 text-tele-primary border border-tele-light">
              {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          ) : null}
          <Button
            className="w-full rounded-btn border border-tele-border bg-white text-gray-700 font-medium sm:w-auto hover:bg-gray-50"
            startContent={<RefreshCw size={16} />}
            onPress={fetchAll}
            isDisabled={isLoading}
          >
            Refresh data
          </Button>
        </div>
      </div>

      <div className="p-6 bg-gray-50/30 space-y-6">
        {isLoading && !rows.length ? (
          <SkeletonOverview />
        ) : (
          <>
            <motion.div 
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {kpis.map((item) => (
                <motion.div key={item.label} variants={itemVariants} className="h-full">
                  <KpiCard item={item} />
                </motion.div>
              ))}
            </motion.div>

            {visibleRows.length > 0 && (
              <div className="rounded-card border border-tele-border bg-white p-5">
                <motion.div 
                  className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                >
                  {visibleRows.map((row) => (
                    <motion.div key={row.key} variants={itemVariants} className="h-full">
                      <ModuleCard row={row} />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default BackendDataOverview





