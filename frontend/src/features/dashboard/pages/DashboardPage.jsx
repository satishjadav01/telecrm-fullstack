import { Button, Card, Chip, ProgressBar, Table } from "@heroui/react";
import { RefreshCw, TrendingUp, Users, PhoneCall, Calendar, Activity, Headphones } from "lucide-react";
import BackendDataOverview from "../components/BackendDataOverview";
import { useEffect, useMemo, useState } from "react";
import { reportsApi } from "../../reports/api/reportsApi";
import { leadsApi } from "../../leads/api/leadsApi";
import { recordingsApi } from "../../recordings/api/recordingsApi";
import { useAuth } from "../../auth/context/AuthContext";
import { NavLink } from "react-router-dom";
import { CallDirectionChip } from "../../../components/common/CallDirectionChip";

const CALL_ACTIVITY_PAGE_SIZE = 12;
const RANGE_OPTIONS = [
  { label: "All Time", value: "all_time" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 Days", value: "7d" },
  { label: "Last 30 Days", value: "30d" },
  { label: "This Month", value: "this_month" },
  { label: "Custom", value: "custom" },
];

const getRangeDates = (range, customRange) => {
  if (range === "all_time") return {};

  const now = new Date();
  let from = new Date(now);
  let to = new Date(now);

  switch (range) {
    case "today":
      from.setHours(0, 0, 0, 0);
      to.setHours(23, 59, 59, 999);
      break;
    case "yesterday":
      from.setDate(now.getDate() - 1);
      from.setHours(0, 0, 0, 0);
      to.setDate(now.getDate() - 1);
      to.setHours(23, 59, 59, 999);
      break;
    case "7d":
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
      break;
    case "30d":
      from.setDate(now.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      break;
    case "this_month":
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      from.setHours(0, 0, 0, 0);
      break;
    case "custom":
      if (customRange?.from) {
        const f = new Date(customRange.from);
        f.setHours(0, 0, 0, 0);
        from = f;
      }
      if (customRange?.to) {
        const t = new Date(customRange.to);
        t.setHours(23, 59, 59, 999);
        to = t;
      }
      break;
    default:
      from.setDate(now.getDate() - 7);
      from.setHours(0, 0, 0, 0);
  }
  return { from: from.toISOString(), to: to.toISOString() };
};

const toDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const formatMonthLabel = (value) =>
  value.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

const formatDateLabel = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeLabel = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const leadLabel = (call) => {
  const full =
    `${call?.lead?.firstName || ""} ${call?.lead?.lastName || ""}`.trim();
  return full || call?.lead?.phonePrimary || "-";
};

const followupLabel = (followup) => {
  const full =
    `${followup?.lead?.firstName || ""} ${followup?.lead?.lastName || ""}`.trim();
  return full || followup?.lead?.phonePrimary || "-";
};

function StatCard({ title, value, delta, icon: Icon }) {
  return (
    <div className="tele-card p-5">
      <div className="flex items-center gap-3 mb-2">
        {Icon && (
          <div className="p-2 rounded-lg bg-tele-light text-tele-primary">
            <Icon size={18} />
          </div>
        )}
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      </div>
      <div className="mt-1">
        <p className="text-2xl font-bold text-tele-dark">{value}</p>
        {delta && <p className="text-sm font-medium text-tele-secondary mt-1">{delta}</p>}
      </div>
    </div>
  );
}

function DashboardPage() {
  const auth = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [agentPerf, setAgentPerf] = useState([]);
  const [leadSnapshot, setLeadSnapshot] = useState([]);
  const [agentCalls, setAgentCalls] = useState([]);
  const [agentFollowups, setAgentFollowups] = useState([]);
  const [recentRecordings, setRecentRecordings] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedDayPage, setSelectedDayPage] = useState(1);
  const [dateRange, setDateRange] = useState("all_time");
  const [customDates, setCustomDates] = useState({
    from: toDateKey(new Date(new Date().setDate(new Date().getDate() - 7))),
    to: toDateKey(new Date()),
  });
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [selectedSource, setSelectedSource] = useState("");
  const [overviewMeta, setOverviewMeta] = useState({ activeAgents: 0 });
  const [filterOptions, setFilterOptions] = useState({
    agents: [],
    sources: [],
  });

  const isAgent = auth.roleCode === "agent";
  const effectiveAgentId = isAgent ? auth.user?.id : selectedAgentId;
  const dashboardQuery = useMemo(() => ({
    ...getRangeDates(dateRange, customDates),
    agentId: effectiveAgentId || undefined,
    source: selectedSource || undefined,
    calendarMonth: isAgent
      ? new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        1,
      ).toISOString()
      : undefined,
  }), [
    dateRange,
    customDates,
    effectiveAgentId,
    selectedSource,
    isAgent,
    calendarMonth,
  ]);
  const fetchDashboard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = dashboardQuery;
      const { calendarMonth: _calendarMonth, ...leadParams } = params;

      const [summary, leads, recordingsResult] = await Promise.all([
        reportsApi.dashboardSummary(params),
        leadsApi.list({ page: 1, limit: 8, ...leadParams }),
        isAgent
          ? recordingsApi.listForAgent(auth.user?.id, { page: 1, limit: 5, ...leadParams })
          : recordingsApi.list({ page: 1, limit: 5, ...leadParams })
      ]);

      setFunnel(summary?.funnel || null);
      setAgentPerf(Array.isArray(summary?.performance) ? summary.performance : []);
      setOverviewMeta({ activeAgents: Number(summary?.activeAgents || 0) });
      setLeadSnapshot(leads?.items || []);
      setRecentRecordings(recordingsResult?.data || recordingsResult?.items || []);
      setAgentCalls(
        Array.isArray(summary?.calendar?.calls) ? summary.calendar.calls : [],
      );
      setAgentFollowups(
        Array.isArray(summary?.calendar?.followups)
          ? summary.calendar.followups.filter((item) => {
            const due = new Date(item.dueAt).getTime();
            const matchesAgent =
              !effectiveAgentId || item.assignedTo === effectiveAgentId;
            const matchesSource =
              !selectedSource || item.lead?.source === selectedSource;
            return (
              !Number.isNaN(due) &&
              matchesAgent &&
              matchesSource
            );
          })
          : [],
      );
    } catch (e) {
      setError(e);
      setFunnel(null);
      setAgentPerf([]);
      setAgentPerf([]);
      setOverviewMeta({ activeAgents: 0 });
      setLeadSnapshot([]);
      setRecentRecordings([]);
      setAgentCalls([]);
      setAgentFollowups([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reportsApi.filterOptions().then(setFilterOptions).catch(console.error);
  }, []);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    calendarMonth,
    isAgent,
    auth.user?.id,
    dateRange,
    customDates,
    effectiveAgentId,
    selectedSource,
  ]);

  const totalLeads = funnel?.totalLeads || 0;
  const converted = funnel?.stages?.converted || 0;
  const dropped = funnel?.stages?.dropped || 0;
  const conversionRate = totalLeads
    ? Number(((converted / totalLeads) * 100).toFixed(2))
    : 0;
  const dropRate = totalLeads
    ? Number(((dropped / totalLeads) * 100).toFixed(2))
    : 0;

  const totalCalls = useMemo(
    () => agentPerf.reduce((acc, a) => acc + (a.totalCalls || 0), 0),
    [agentPerf],
  );
  const callbackCalls = useMemo(
    () => agentPerf.reduce((acc, a) => acc + (a.callbackCalls || 0), 0),
    [agentPerf],
  );
  const interestedCalls = useMemo(
    () => agentPerf.reduce((acc, a) => acc + (a.interestedCalls || 0), 0),
    [agentPerf],
  );
  const aggregateInterestRate = useMemo(
    () => (totalCalls ? Number(((interestedCalls / totalCalls) * 100).toFixed(2)) : 0),
    [interestedCalls, totalCalls],
  );
  const activeAgentsCount = useMemo(() => {
    if (overviewMeta.activeAgents !== undefined && overviewMeta.activeAgents !== null) {
      return overviewMeta.activeAgents
    }
    return agentPerf.filter((item) => item.agent?.id).length
  }, [agentPerf, overviewMeta.activeAgents]);

  const dashboardKpis = useMemo(() => {
    const label =
      RANGE_OPTIONS.find((o) => o.value === dateRange)?.label || "7d";
    return [
      {
        title: `Leads`,
        value: String(totalLeads),
        delta: conversionRate ? `Conv ${conversionRate}%` : "",
        icon: Users
      },
      {
        title: `Calls`,
        value: String(totalCalls),
        delta: callbackCalls ? `Callbacks ${callbackCalls}` : "",
        icon: PhoneCall
      },
      {
        title: `Converted`,
        value: String(converted),
        delta: dropRate ? `Drop ${dropRate}%` : "",
        icon: TrendingUp
      },
      {
        title: `Interest Rate`,
        value: `${aggregateInterestRate}%`,
        delta: interestedCalls ? `${interestedCalls} interested` : "",
        icon: Activity
      },
      {
        title: "Active Agents",
        value: String(activeAgentsCount),
        delta: activeAgentsCount ? "Online" : "",
        icon: Users
      },
    ];
  }, [
    totalLeads,
    conversionRate,
    totalCalls,
    callbackCalls,
    interestedCalls,
    aggregateInterestRate,
    converted,
    dropRate,
    activeAgentsCount,
    dateRange,
  ]);

  const callsByDate = useMemo(() => {
    const grouped = new Map();
    for (const call of agentCalls) {
      const key = toDateKey(call.createdAt);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(call);
    }
    return grouped;
  }, [agentCalls]);

  const followupsByDate = useMemo(() => {
    const grouped = new Map();
    for (const followup of agentFollowups) {
      const key = toDateKey(followup.dueAt);
      if (!key) continue;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(followup);
    }
    return grouped;
  }, [agentFollowups]);

  const calendarDays = useMemo(() => {
    const monthStart = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      1,
    );
    const monthEnd = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      0,
    );
    const startWeekday = monthStart.getDay();
    const days = [];

    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }

    for (let day = 1; day <= monthEnd.getDate(); day += 1) {
      const date = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth(),
        day,
      );
      const key = toDateKey(date);
      const dayCalls = callsByDate.get(key) || [];
      const dayFollowups = followupsByDate.get(key) || [];

      const inboundCount = dayCalls.filter(c => c.direction === 'inbound').length;
      const outboundCount = dayCalls.filter(c => c.direction === 'outbound').length;
      const convertedCount = dayCalls.filter(c => c.disposition === 'converted').length;
      const notConnectedCount = dayCalls.filter(c => ['no_answer', 'busy'].includes(c.disposition)).length;

      days.push({
        key,
        date,
        count: dayCalls.length + dayFollowups.length,
        callCount: dayCalls.length,
        followupCount: dayFollowups.length,
        inboundCount,
        outboundCount,
        convertedCount,
        notConnectedCount,
      });
    }

    return days;
  }, [calendarMonth, callsByDate, followupsByDate]);

  useEffect(() => {
    if (!isAgent) return;
    const monthPrefix = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}`;
    const firstCallDate = [...callsByDate.keys()].find((key) =>
      key.startsWith(monthPrefix),
    );
    const firstFollowupDate = [...followupsByDate.keys()].find((key) =>
      key.startsWith(monthPrefix),
    );
    const todayKey = toDateKey(new Date());

    if (
      selectedDateKey &&
      (callsByDate.has(selectedDateKey) || followupsByDate.has(selectedDateKey))
    )
      return;
    if (todayKey.startsWith(monthPrefix)) {
      setSelectedDateKey(todayKey);
      return;
    }
    setSelectedDateKey(
      firstCallDate || firstFollowupDate || `${monthPrefix}-01`,
    );
  }, [isAgent, calendarMonth, callsByDate, followupsByDate, selectedDateKey]);

  const selectedDayCalls = useMemo(() => {
    return callsByDate.get(selectedDateKey) || [];
  }, [callsByDate, selectedDateKey]);

  const selectedDayFollowups = useMemo(() => {
    return followupsByDate.get(selectedDateKey) || [];
  }, [followupsByDate, selectedDateKey]);

  const selectedDayRows = useMemo(
    () => [
      ...selectedDayCalls.map((call) => ({ id: `call-${call.id}`, type: "call", item: call })),
      ...selectedDayFollowups.map((followup) => ({ id: `followup-${followup.id}`, type: "followup", item: followup })),
    ],
    [selectedDayCalls, selectedDayFollowups],
  );
  const selectedDayTotalPages = useMemo(
    () => Math.max(1, Math.ceil(selectedDayRows.length / CALL_ACTIVITY_PAGE_SIZE)),
    [selectedDayRows.length],
  );
  const selectedDayPageRows = useMemo(
    () => selectedDayRows.slice(
      (selectedDayPage - 1) * CALL_ACTIVITY_PAGE_SIZE,
      selectedDayPage * CALL_ACTIVITY_PAGE_SIZE,
    ),
    [selectedDayPage, selectedDayRows],
  );
  const selectedDayPageStart = selectedDayRows.length
    ? (selectedDayPage - 1) * CALL_ACTIVITY_PAGE_SIZE + 1
    : 0;
  const selectedDayPageEnd = selectedDayRows.length
    ? Math.min(selectedDayPage * CALL_ACTIVITY_PAGE_SIZE, selectedDayRows.length)
    : 0;

  useEffect(() => {
    setSelectedDayPage(1);
  }, [selectedDateKey]);

  useEffect(() => {
    if (selectedDayPage > selectedDayTotalPages) {
      setSelectedDayPage(selectedDayTotalPages);
    }
  }, [selectedDayPage, selectedDayTotalPages]);

  return (
    <section className="space-y-6">



      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-card border border-tele-border shadow-soft">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {dateRange === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary w-[140px]"
                value={customDates.from}
                onChange={(e) =>
                  setCustomDates((prev) => ({ ...prev, from: e.target.value }))
                }
              />
              <span className="text-sm text-gray-400">to</span>
              <input
                type="date"
                className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary w-[140px]"
                value={customDates.to}
                onChange={(e) =>
                  setCustomDates((prev) => ({ ...prev, to: e.target.value }))
                }
              />
            </div>
          )}
          <select
            className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary w-full sm:w-[160px]"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            {RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary w-full sm:w-[160px]"
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
          >
            <option value="">All Agents</option>
            {filterOptions.agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.fullName}
              </option>
            ))}
          </select>
          <select
            className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary focus:ring-1 focus:ring-tele-primary w-full sm:w-[160px]"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
          >
            <option value="">All Sources</option>
            {filterOptions.sources.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
        <Button
          className="rounded-btn bg-tele-primary text-white font-medium px-4 py-2 hover:bg-tele-secondary transition-colors h-auto flex items-center w-full sm:w-auto"
          onPress={fetchDashboard}
          isDisabled={isLoading}
        >
          <RefreshCw size={16} className="mr-2" />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="rounded-card border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-medium text-red-700">
            {error.message || "Failed to load dashboard data"}
          </p>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
        {dashboardKpis.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Recordings */}
        <div className="tele-card p-0 lg:col-span-1 flex flex-col">
          <div className="p-6 border-b border-tele-border flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-tele-dark mb-1">Recent Recordings</h2>
              <p className="text-sm text-gray-500">Your latest call recordings</p>
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tele-light text-tele-primary">
              <Headphones size={20} />
            </div>
          </div>
          <div className="p-6 space-y-3 flex-1 overflow-y-auto">
            {recentRecordings.length ? recentRecordings.map((rec) => (
              <NavLink key={rec.id} to="/recordings" className="block rounded-card border border-tele-border bg-gray-50 p-3 hover:border-tele-primary transition-all">
                <p className="text-sm font-semibold text-tele-dark">{rec.lead?.firstName || rec.lead?.phonePrimary || "Unknown"} - {new Date(rec.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                <p className="text-xs text-gray-500 mt-1">{rec.duration ? `${Math.round(rec.duration)}s` : "Recording saved"}</p>
              </NavLink>
            )) : (
              <p className="text-sm text-gray-500 text-center py-4">No recent records returned</p>
            )}
          </div>
        </div>

        {/* Lead Queue Table */}
        <div className="tele-card p-0 lg:col-span-2 flex flex-col">
          <div className="p-6 border-b border-tele-border">
            <h2 className="text-lg font-bold text-tele-dark mb-1">Lead Queue</h2>
            <p className="text-sm text-gray-500">Upcoming leads requiring immediate action.</p>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-gray-50 text-gray-500 border-b border-tele-border">
                <tr>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Lead</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Source</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-3 font-semibold uppercase tracking-wider">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tele-border text-tele-dark bg-white">
                {leadSnapshot.length > 0 ? (
                  leadSnapshot.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium">
                        {lead.firstName || lead.lastName
                          ? `${lead.firstName || ""} ${lead.lastName || ""}`.trim()
                          : "-"}
                      </td>
                      <td className="px-6 py-4">{lead.source || "-"}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-tele-light/30 text-tele-primary border border-tele-light">
                          {lead.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4">{lead.assignee?.fullName || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No leads currently in the queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isAgent && (
        <div className="tele-card p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-tele-dark mb-1">Agent Calendar</h2>
              <p className="text-sm text-gray-500">Track your daily call and follow-up activities.</p>
            </div>
            <div className="flex items-center gap-3 mt-4 sm:mt-0">
              <input
                type="date"
                className="rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm focus:border-tele-primary w-[160px]"
                value={selectedDateKey}
                onChange={(e) => {
                  const nextKey = e.target.value;
                  if (!nextKey) return;
                  const nextDate = new Date(`${nextKey}T00:00:00`);
                  setSelectedDateKey(nextKey);
                  setCalendarMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
                }}
              />
              <div className="flex bg-gray-100 rounded-btn p-1">
                <button onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))} className="px-3 py-1 text-sm font-medium rounded hover:bg-white hover:shadow-sm transition-all text-gray-600">Prev</button>
                <div className="px-3 py-1 text-sm font-semibold text-tele-primary bg-white rounded shadow-sm">{formatMonthLabel(calendarMonth)}</div>
                <button onClick={() => setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))} className="px-3 py-1 text-sm font-medium rounded hover:bg-white hover:shadow-sm transition-all text-gray-600">Next</button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day, index) =>
              day ? (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => setSelectedDateKey(day.key)}
                  className={`min-h-[100px] border rounded-card p-3 flex flex-col items-start transition-all ${selectedDateKey === day.key ? 'border-tele-primary bg-tele-light/20 ring-1 ring-tele-primary' : 'border-tele-border bg-white hover:border-gray-300'}`}
                >
                  <div className="flex justify-between w-full items-center mb-2">
                    <span className={`text-sm font-bold ${selectedDateKey === day.key ? 'text-tele-primary' : 'text-gray-700'}`}>{day.date.getDate()}</span>
                    {day.count > 0 && <span className="bg-gray-100 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-md">{day.count}</span>}
                  </div>
                  {day.count > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {day.inboundCount > 0 && <span className="w-2 h-2 rounded-full bg-tele-primary" title={`Inbound: ${day.inboundCount}`} />}
                      {day.outboundCount > 0 && <span className="w-2 h-2 rounded-full bg-indigo-500" title={`Outbound: ${day.outboundCount}`} />}
                      {day.followupCount > 0 && <span className="w-2 h-2 rounded-full bg-purple-500" title={`Followups: ${day.followupCount}`} />}
                      {day.convertedCount > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" title={`Converted: ${day.convertedCount}`} />}
                    </div>
                  )}
                </button>
              ) : (
                <div key={`blank-${index}`} className="min-h-[100px] bg-transparent" />
              )
            )}
          </div>

          {selectedDayRows.length > 0 && (
            <div className="mt-6 border-t border-tele-border pt-6">
              <h3 className="text-md font-semibold text-tele-dark mb-4">Activity for {formatDateLabel(selectedDateKey)}</h3>
              <div className="space-y-3">
                {selectedDayPageRows.map((row) => (
                  <div key={row.id} className="p-4 rounded-card border border-tele-border bg-gray-50 flex items-center justify-between hover:bg-white transition-colors">
                    <div>
                      <p className="font-semibold text-tele-dark mb-1">
                        {row.type === 'followup' ? followupLabel(row.item) : leadLabel(row.item)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {row.type === 'followup' ? `Due: ${formatTimeLabel(row.item.dueAt)}` : `Time: ${formatTimeLabel(row.item.createdAt)}`}
                      </p>
                    </div>
                    <div>
                      {row.type === 'followup' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">Follow-up</span>
                      ) : (
                        <CallDirectionChip direction={row.item.direction} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {selectedDayTotalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <span className="text-xs text-gray-500">Page {selectedDayPage} of {selectedDayTotalPages}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDayPage(p => Math.max(1, p - 1))}
                      disabled={selectedDayPage === 1}
                      className="px-3 py-1 rounded text-sm bg-white border border-tele-border disabled:opacity-50"
                    >Prev</button>
                    <button
                      onClick={() => setSelectedDayPage(p => Math.min(selectedDayTotalPages, p + 1))}
                      disabled={selectedDayPage === selectedDayTotalPages}
                      className="px-3 py-1 rounded text-sm bg-white border border-tele-border disabled:opacity-50"
                    >Next</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

export default DashboardPage;
