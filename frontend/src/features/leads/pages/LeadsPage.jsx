import { Button, Chip, Input, Table } from "@heroui/react";
import PageHeader from "../../../components/common/PageHeader";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../auth/context/AuthContext";
import { leadsApi } from "../api/leadsApi";
import { usersApi } from "../../users/api/usersApi";
import LeadFormModal, { STAGE_OPTIONS } from "../components/LeadFormModal";
import LeadDetailPanel from "../components/LeadDetailPanel";
import { Plus, RefreshCw, Search, Edit3, Trash2, MoreHorizontal, Filter, Download, Upload, Server } from "lucide-react";
import { callsApi } from "../../calls/api/callsApi";
import DispositionModal from "../../calls/components/DispositionModal";
import { recordingsApi } from "../../recordings/api/recordingsApi";
import { shopifyApi } from "../../integrations/api/shopifyApi";
import { useToast } from "../../../components/common/ToastProvider";

const AGENT_LEADS_PAGE_SIZE = 10;
const DEFAULT_LEADS_PAGE_SIZE = 10;
const INITIAL_COLUMN_FILTERS = {
  lead: "",
  phone: "",
  stage: "",
  agent: "",
  source: "",
};

const stageLabel = (value) =>
  STAGE_OPTIONS.find((s) => s.value === value)?.label || value || "-";

const normalizeDialNumber = (value) => {
  if (!value) return "";
  return String(value).replace(/[^\d+]/g, "");
};

const openDialer = (phoneNumber) => {
  const dialNumber = normalizeDialNumber(phoneNumber);
  if (!dialNumber || typeof window === "undefined") return false;
  window.location.href = `tel:${dialNumber}`;
  return true;
};

const toDateInputValue = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const yyyy = String(d.getFullYear());
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getDefaultShopifySyncDates = () => {
  const now = new Date();
  return {
    startDate: toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateInputValue(now),
  };
};

function ColumnFilterDropdown({ isOpen, onApply, onClear, children }) {
  if (!isOpen) return null;

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
  );
}

function TextColumnFilter({ value, onChange, placeholder }) {
  return (
    <input
      type="text"
      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
      placeholder={placeholder}
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  );
}

function SelectColumnFilter({ value, onChange, options }) {
  return (
    <select
      className="w-full rounded-input border border-tele-border bg-gray-50 px-3 py-2 text-sm font-normal text-tele-dark outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">All stages</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function ColumnFilterHeader({ label, column, activeDropdown, isActive, onToggle, onApply, onClear, children }) {
  return (
    <div className="filter-dropdown-container relative inline-flex items-center gap-1.5">
      <span className="text-xs font-semibold uppercase text-gray-500 tracking-wider">{label}</span>
      <button
        type="button"
        className="rounded p-1 text-gray-400 hover:bg-gray-100 transition-colors focus:outline-none"
        aria-label={"Filter " + label}
        onClick={() => onToggle(column)}
      >
        <Filter
          size={14}
          className={isActive ? "fill-tele-primary text-tele-primary" : "text-gray-400"}
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
  );
}

const leadName = (lead) => {
  return [lead?.firstName, lead?.lastName].filter(Boolean).join(" ").trim() || lead?.phonePrimary || "-";
};

const agentName = (lead) => {
  return lead?.assignee?.fullName || lead?.assignee?.email || lead?.assignee?.phone || "-";
};

function LeadsPage() {
  const auth = useAuth();
  const canEdit = Boolean(auth.isAuthenticated);
  const canUploadRecording = Boolean(auth.isAuthenticated);
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [page, setPage] = useState(() => Number(searchParams.get("page") || 1));
  const limit = auth.roleCode === "agent" ? AGENT_LEADS_PAGE_SIZE : DEFAULT_LEADS_PAGE_SIZE;
  const [stage, setStage] = useState(() => searchParams.get("stage") || "");
  const [assignedTo, setAssignedTo] = useState(() => searchParams.get("assignedTo") || "");
  const [searchInput, setSearchInput] = useState(() => searchParams.get("search") || "");
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [columnFilters, setColumnFilters] = useState(INITIAL_COLUMN_FILTERS);
  const [tempColumnFilters, setTempColumnFilters] = useState(INITIAL_COLUMN_FILTERS);
  const [activeColumnFilter, setActiveColumnFilter] = useState(null);

  const updateFilters = (newParams) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    setSearchParams(params, { replace: true });
  };

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [assignees, setAssignees] = useState([]);
  const [assigneeError, setAssigneeError] = useState(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [activeLeadId, setActiveLeadId] = useState(null);
  const [activeLead, setActiveLead] = useState(null);
  const [isLoadingLead, setIsLoadingLead] = useState(false);
  const [activeMenuLeadId, setActiveMenuLeadId] = useState(null);

  const [activeCall, setActiveCall] = useState(null);
  const [isStartingCall, setIsStartingCall] = useState(false);
  const [dispositionOpen, setDispositionOpen] = useState(false);
  const [isSavingDisposition, setIsSavingDisposition] = useState(false);
  const [dispositionError, setDispositionError] = useState(null);
  const [callResult, setCallResult] = useState(null);

  const [recordings, setRecordings] = useState([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(false);
  const [recordingsError, setRecordingsError] = useState(null);
  const [busyRecordingAction, setBusyRecordingAction] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [modalLead, setModalLead] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [isImportingLeads, setIsImportingLeads] = useState(false);
  const [lastImportedLeadIds, setLastImportedLeadIds] = useState([]);
  const [bulkAssignAgentId, setBulkAssignAgentId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);
  const [isSyncingShopify, setIsSyncingShopify] = useState(false);
  const [shopifySyncDates, setShopifySyncDates] = useState(getDefaultShopifySyncDates);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  const leadsFetchIdRef = useRef(0);
  const leadDetailFetchIdRef = useRef(0);
  const recordingsFetchIdRef = useRef(0);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / limit)),
    [total, limit],
  );
  const agentAssignees = useMemo(
    () =>
      assignees.filter((u) => (u?.role?.code || "").toLowerCase() === "agent"),
    [assignees],
  );
  const hasFilter = useMemo(
    () => Boolean((search || "").trim() || stage || assignedTo),
    [assignedTo, search, stage],
  );

  const hasAnyColumnFilter = useMemo(
    () => Object.values(columnFilters).some((value) => String(value || "").trim() !== ""),
    [columnFilters],
  );

  const toggleColumnFilter = (column) => {
    if (activeColumnFilter === column) {
      setActiveColumnFilter(null);
      return;
    }

    setTempColumnFilters(columnFilters);
    setActiveColumnFilter(column);
  };

  useEffect(() => {
    if (!activeColumnFilter) return undefined;

    const handleOutsideClick = (event) => {
      if (!event.target.closest(".filter-dropdown-container")) {
        setActiveColumnFilter(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [activeColumnFilter]);

  const isColumnFilterActive = (column) => Boolean(columnFilters[column]);

  const applyColumnFilter = (column) => {
    setColumnFilters((prev) => ({
      ...prev,
      [column]: tempColumnFilters[column],
    }));
    updateFilters({ page: 1 });
    setActiveColumnFilter(null);
  };

  const clearColumnFilter = (column) => {
    setColumnFilters((prev) => ({ ...prev, [column]: "" }));
    setTempColumnFilters((prev) => ({ ...prev, [column]: "" }));
    updateFilters({ page: 1 });
    setActiveColumnFilter(null);
  };

  const clearColumnFilters = () => {
    setColumnFilters(INITIAL_COLUMN_FILTERS);
    setTempColumnFilters(INITIAL_COLUMN_FILTERS);
    updateFilters({ page: 1 });
    setActiveColumnFilter(null);
  };

  const filteredItems = useMemo(() => {
    return items.filter((lead) => {
      const leadQuery = columnFilters.lead.trim().toLowerCase();
      if (leadQuery) {
        const leadValue = [leadName(lead), lead.email, lead.phonePrimary].filter(Boolean).join(" ").toLowerCase();
        if (!leadValue.includes(leadQuery)) return false;
      }

      const phoneQuery = columnFilters.phone.trim().toLowerCase();
      if (phoneQuery) {
        const phoneValue = [lead.phonePrimary, lead.phoneAlternate].filter(Boolean).join(" ").toLowerCase();
        if (!phoneValue.includes(phoneQuery)) return false;
      }

      if (columnFilters.stage && lead.stage !== columnFilters.stage) return false;

      const agentQuery = columnFilters.agent.trim().toLowerCase();
      if (agentQuery) {
        const agentValue = agentName(lead).toLowerCase();
        if (!agentValue.includes(agentQuery)) return false;
      }

      const sourceQuery = columnFilters.source.trim().toLowerCase();
      if (sourceQuery) {
        const sourceValue = String(lead.source || "").toLowerCase();
        if (!sourceValue.includes(sourceQuery)) return false;
      }

      return true;
    });
  }, [columnFilters, items]);

  const fetchAssignees = useCallback(async () => {
    setAssigneeError(null);
    try {
      const data = await usersApi.list({ page: 1, limit: 100, isActive: true });
      setAssignees(data.items || []);
    } catch (e) {
      setAssigneeError(e);
      setAssignees([]);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    const fetchId = leadsFetchIdRef.current + 1;
    leadsFetchIdRef.current = fetchId;
    setIsLoading(true);
    setError(null);
    try {
      const data = await leadsApi.list({
        page,
        limit,
        search: search || undefined,
        stage: stage || undefined,
        assignedTo: assignedTo || undefined,
        hasFilter,
      });
      if (fetchId !== leadsFetchIdRef.current) return;
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      if (fetchId !== leadsFetchIdRef.current) return;
      setError(e);
    } finally {
      if (fetchId === leadsFetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [assignedTo, hasFilter, limit, page, search, stage]);

  const loadLead = useCallback(async (id) => {
    const fetchId = leadDetailFetchIdRef.current + 1;
    leadDetailFetchIdRef.current = fetchId;
    setIsLoadingLead(true);
    try {
      const lead = await leadsApi.getById(id);
      if (fetchId !== leadDetailFetchIdRef.current) return;
      setActiveLead(lead);
    } catch {
      if (fetchId !== leadDetailFetchIdRef.current) return;
      setActiveLead(null);
    } finally {
      if (fetchId === leadDetailFetchIdRef.current) {
        setIsLoadingLead(false);
      }
    }
  }, []);

  const loadRecordings = useCallback(async (leadId) => {
    if (!leadId) return;
    const fetchId = recordingsFetchIdRef.current + 1;
    recordingsFetchIdRef.current = fetchId;
    setIsLoadingRecordings(true);
    setRecordingsError(null);
    try {
      const list = await recordingsApi.listForLead(leadId);
      if (fetchId !== recordingsFetchIdRef.current) return;
      setRecordings(Array.isArray(list) ? list : []);
    } catch (e) {
      if (fetchId !== recordingsFetchIdRef.current) return;
      setRecordingsError(e);
    } finally {
      if (fetchId === recordingsFetchIdRef.current) {
        setIsLoadingRecordings(false);
      }
    }
  }, []);

  useEffect(() => {
    setPage(Number(searchParams.get("page") || 1));
    setStage(searchParams.get("stage") || "");
    setAssignedTo(searchParams.get("assignedTo") || "");
    const nextSearch = searchParams.get("search") || "";
    setSearchInput(nextSearch);
    setSearch(nextSearch);
  }, [searchParams]);

  useEffect(() => {
    fetchAssignees();
  }, [fetchAssignees]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const onApplySearch = () => {
    updateFilters({ search: searchInput.trim(), page: 1 });
  };

  const clearFilters = () => {
    updateFilters({ stage: "", assignedTo: "", search: "", page: 1 });
    clearColumnFilters();
  };

  const openCreate = () => {
    setSaveError(null);
    setModalMode("create");
    setModalLead(null);
    setModalOpen(true);
  };

  const openEdit = () => {
    if (!activeLead) return;
    setSaveError(null);
    setModalMode("edit");
    setModalLead(activeLead);
    setModalOpen(true);
  };

  const openEditLead = (lead) => {
    if (!lead) return;
    setSaveError(null);
    setModalMode("edit");
    setModalLead(lead);
    setModalOpen(true);
    setActiveMenuLeadId(null);
  };

  const toggleMenuForLead = (leadId) => {
    setActiveMenuLeadId((current) => (current === leadId ? null : leadId));
  };

  const deleteLead = async (lead) => {
    if (!lead?.id) return;
    const title = lead.firstName || lead.lastName ? `${lead.firstName || ''} ${lead.lastName || ''}`.trim() : 'this lead';
    if (!window.confirm(`Delete ${title}? This cannot be undone.`)) {
      return;
    }

    try {
      await leadsApi.delete(lead.id);
      toast.success('Lead deleted');
      setActiveMenuLeadId(null);
      if (activeLeadId === lead.id) {
        closeDetails();
      }
      await fetchLeads();
    } catch (e) {
      toast.error(e?.message || 'Failed to delete lead');
    }
  };

  const closeModal = () => {
    if (isSaving) return;
    setModalOpen(false);
  };

  const openDetails = async (lead) => {
    setActiveLeadId(lead.id);
    setActiveLead(lead);
    setDetailOpen(true);
    setActiveCall(null);
    setCallResult(null);
    setRecordings([]);
    setRecordingsError(null);
    await Promise.all([loadLead(lead.id), loadRecordings(lead.id)]);
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setDispositionOpen(false);
    setActiveCall(null);
    setCallResult(null);
    setRecordings([]);
    setRecordingsError(null);
  };

  const startCall = async () => {
    if (!activeLeadId) return;
    setIsStartingCall(true);
    setCallResult(null);
    try {
      const call = await callsApi.start({
        leadId: activeLeadId,
        direction: "outbound",
      });
      setActiveCall(call);
      if (!openDialer(activeLead?.phonePrimary)) {
        toast.error("Lead phone number is missing or invalid");
      }
    } finally {
      setIsStartingCall(false);
    }
  };

  const openDisposition = () => {
    setDispositionError(null);
    setDispositionOpen(true);
  };

  const closeDisposition = () => {
    if (isSavingDisposition) return;
    setDispositionOpen(false);
  };

  const submitDisposition = async (payload) => {
    if (!activeCall?.id) return;
    setIsSavingDisposition(true);
    setDispositionError(null);
    try {
      const result = await callsApi.applyDisposition(activeCall.id, payload);

      setDispositionOpen(false);
      setActiveCall(null);

      // Refresh lead (full record) + list so pipeline shows updated stage.
      await Promise.all([
        loadLead(activeLeadId),
        fetchLeads(),
        loadRecordings(activeLeadId),
      ]);

      const followUpAt = result?.followUp?.dueAt
        ? new Date(result.followUp.dueAt).toLocaleString()
        : null;
      setCallResult({
        message: result?.followUp
          ? "Disposition saved and follow-up scheduled."
          : "Disposition saved.",
        followUpAt,
      });
      toast.success("Disposition saved");
    } catch (e) {
      setDispositionError(e);
      toast.error(e?.message || "Failed to save disposition");
      throw e;
    } finally {
      setIsSavingDisposition(false);
    }
  };

  const uploadRecording = async (file, meta) => {
    if (!activeCall?.id) {
      throw new Error("Start a call first to upload a recording");
    }
    await recordingsApi.upload(activeCall.id, file, meta);
    await loadLead(activeLeadId); // Refresh lead to show new recording in history
    toast.success("Recording uploaded");
  };

  const playRecording = async (callId) => {
    setBusyRecordingAction(`play:${callId}`);
    try {
      const objectUrl = await recordingsApi.createPlaybackObjectUrl(callId);
      const audio = new Audio(objectUrl);
      audio.play();
      toast.info("Playing recording...");
    } catch (e) {
      toast.error(e?.message || "Failed to play recording");
    } finally {
      setBusyRecordingAction("");
    }
  };

  const downloadRecording = async (call) => {
    setBusyRecordingAction(`download:${call.id}`);
    try {
      await recordingsApi.downloadForCall(
        call.id,
        call.recording?.fileName || `recording-${call.id}.webm`
      );
    } catch (e) {
      toast.error(e?.message || "Failed to download recording");
    } finally {
      setBusyRecordingAction("");
    }
  };

  const onSubmit = async (payload) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      if (modalMode === "create") {
        const created = await leadsApi.create(payload);
        toast.success("Lead created");
        setModalOpen(false);
        updateFilters({ page: 1 });
        await fetchLeads();
        // Open the newly created lead in detail panel.
        await openDetails(created);
      } else {
        const updated = await leadsApi.update(modalLead.id, payload);
        toast.success("Lead updated");
        setModalOpen(false);
        await fetchLeads();
        if (activeLeadId === updated.id) {
          setActiveLead(updated);
        }
      }
    } catch (e) {
      setSaveError(e);
      toast.error(e?.message || "Failed to save lead");
      throw e;
    } finally {
      setIsSaving(false);
    }
  };

  const onDownloadImportTemplate = () => {
    const headers = [
      "firstName",
      "lastName",
      "phonePrimary",
      "phoneAlternate",
      "email",
      "source",
      "city",
      "stage",
      "priority",
      "notes",
    ];
    const sample = [
      "Rahul",
      "Sharma",
      "9999999999",
      "",
      "rahul@example.com",
      "Meta Ads",
      "Mumbai",
      "new",
      "3",
      "Interested, call tomorrow morning",
    ];
    const csv = `${headers.join(",")}\n${sample.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "lead-import-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportExcelLeads = async () => {
    if (!importFile) {
      toast.error("Select an Excel/CSV file first");
      return;
    }

    setIsImportingLeads(true);
    try {
      const result = await leadsApi.importExcel(importFile);
      await Promise.all([fetchLeads(), fetchAssignees()]);
      setLastImportedLeadIds(
        Array.isArray(result?.importedLeadIds) ? result.importedLeadIds : [],
      );
      const errorPreview = (result.errors || [])
        .slice(0, 3)
        .map((e) => `Row ${e.row}: ${e.message}`)
        .join(" | ");
      toast.success(
        `Import complete: ${result.created || 0} created, ${result.updated || 0} updated, ${result.skipped || 0} skipped${errorPreview ? ` (${errorPreview})` : ""}`,
      );
      setImportFile(null);
    } catch (e) {
      toast.error(e?.message || "Failed to import leads from file");
    } finally {
      setIsImportingLeads(false);
    }
  };

  const onAssignImportedLeads = async () => {
    if (!lastImportedLeadIds.length) {
      toast.error("No imported leads found in current session");
      return;
    }
    if (!bulkAssignAgentId) {
      toast.error("Select an agent first");
      return;
    }

    setIsBulkAssigning(true);
    try {
      const result = await leadsApi.assignImported({
        leadIds: lastImportedLeadIds,
        agentId: bulkAssignAgentId,
        onlyUnassigned: true,
      });
      await fetchLeads();
      toast.success(`Assigned ${result.assignedCount || 0} imported leads`);
    } catch (e) {
      toast.error(e?.message || "Failed to assign imported leads");
    } finally {
      setIsBulkAssigning(false);
    }
  };
  const onSyncShopifyCarts = async () => {
    if (
      shopifySyncDates.startDate &&
      shopifySyncDates.endDate &&
      shopifySyncDates.startDate > shopifySyncDates.endDate
    ) {
      toast.error("Start date cannot be after end date");
      return;
    }
    setIsSyncingShopify(true);
    setIsSyncModalOpen(true);
    setSyncProgress(0);
    setSyncStatusMsg("Connecting to Shopify...");
    const animateTo = async (target, durationMs, stepMsg = null) => {
      if (stepMsg) setSyncStatusMsg(stepMsg);
      let startVal = 0;
      setSyncProgress((prev) => {
        startVal = prev;
        return prev;
      });
      const startTime = Date.now();
      return new Promise((resolve) => {
        const interval = setInterval(() => {
          const elapsed = Date.now() - startTime;
          const pct = Math.min(elapsed / durationMs, 1);
          setSyncProgress(Math.round(startVal + (target - startVal) * pct));
          if (pct >= 1) {
            clearInterval(interval);
            resolve();
          }
        }, 30);
      });
    };

    try {
      // Start sync request
      const syncPromise = shopifyApi.syncAbandonedCheckouts(shopifySyncDates);

      // Animate first phase (connecting)
      await animateTo(45, 1000, "Connecting to Shopify API...");

      // Wait for response
      const result = await syncPromise;

      // Show checkouts found
      const total = (result.created || 0) + (result.skipped || 0);
      await animateTo(
        75,
        1200,
        `Found ${total || result.totalFound || 0} checkouts in range. Starting sync...`
      );

      // Show lead creation phase
      await animateTo(95, 800, `Syncing ${result.created || 0} checkouts to leads...`);

      // Finish to 100%
      setSyncProgress(100);
      setSyncStatusMsg(`Shopify sync complete: ${result.created || 0} leads created.`);

      // Wait briefly so the user can see completion
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(
        `Shopify sync complete: ${result.created || 0} leads created, ${result.skipped || 0} skipped.`
      );
      if (result.created > 0) {
        updateFilters({ page: 1 });
        await fetchLeads();
      }
    } catch (e) {
      toast.error(e?.message || "Failed to sync Shopify abandoned carts");
    } finally {
      setIsSyncingShopify(false);
      setIsSyncModalOpen(false);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader
        badge="Leads"
        title="Lead Management"
        description="Create, assign, track, and search easily."
      />

      <div className="tele-card">
        <div className="p-6 border-b border-tele-border flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-tele-dark">Leads Directory</h2>
            <p className="text-sm text-gray-500 mt-1">
              Showing{" "}
              <span className="font-medium text-tele-dark">{hasAnyColumnFilter ? filteredItems.length : items.length}</span> of{" "}
              <span className="font-medium text-tele-dark">{total}</span> leads.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <Button
              className="rounded-btn border border-tele-border bg-gray-50 text-gray-700 hover:bg-white transition-colors w-full sm:w-auto flex items-center justify-center font-medium px-4 h-10"
              onPress={() => fetchLeads()}
              isDisabled={isLoading}
            >
              <RefreshCw size={16} className="mr-2" />
              Refresh
            </Button>
            {canEdit ? (
              <Button
                className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto flex items-center justify-center font-medium px-5 h-10"
                onPress={openCreate}
              >
                <Plus size={16} className="mr-2" />
                Create Lead
              </Button>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 border border-purple-200">
                Read-only ({auth.roleCode || "role"})
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-6">
          {canEdit && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
               {/* Import Card */}
               <div className="rounded-card border border-tele-border bg-gray-50/50 p-5">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-bold text-tele-dark flex items-center">
                       <Upload size={16} className="mr-2 text-tele-primary" />
                       Bulk Import (Excel/CSV)
                     </h3>
                     <Button
                      className="text-xs font-medium text-tele-primary hover:text-tele-secondary underline-offset-2 hover:underline p-0 h-auto bg-transparent border-none"
                      onPress={onDownloadImportTemplate}
                     >
                      <Download size={12} className="inline mr-1" /> Template
                     </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                     <input
                        className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      />
                      <Button
                        className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full sm:w-auto px-4 py-2 text-sm font-medium h-auto"
                        onPress={onImportExcelLeads}
                        isLoading={isImportingLeads}
                      >
                        Upload
                      </Button>
                  </div>

                  {lastImportedLeadIds.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-tele-border">
                       <select
                          className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                          value={bulkAssignAgentId}
                          onChange={(e) => setBulkAssignAgentId(e.target.value)}
                          disabled={isBulkAssigning || !agentAssignees.length}
                        >
                          <option value="">
                            {agentAssignees.length ? "Select Agent" : "No active agents"}
                          </option>
                          {agentAssignees.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.fullName}
                            </option>
                          ))}
                        </select>
                        <Button
                          className="rounded-btn border border-tele-border bg-white text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto px-4 py-2 text-sm font-medium h-auto"
                          onPress={onAssignImportedLeads}
                          isLoading={isBulkAssigning}
                          isDisabled={!agentAssignees.length}
                        >
                          Assign Leads
                        </Button>
                    </div>
                  )}
               </div>

               {/* Shopify Sync Card */}
               <div className="rounded-card border border-tele-border bg-gray-50/50 p-5">
                  <div className="mb-4">
                     <h3 className="text-sm font-bold text-tele-dark flex items-center">
                       <Server size={16} className="mr-2 text-tele-primary" />
                       Shopify Integration
                     </h3>
                     <p className="text-xs text-gray-500 mt-1 ml-6">Sync abandoned carts into leads.</p>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                     <div className="flex flex-col sm:flex-row items-center gap-3">
                        <label className="flex-1 w-full flex flex-col gap-1.5 text-xs font-medium text-gray-600">
                           From Date
                           <input
                              className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                              type="date"
                              value={shopifySyncDates.startDate}
                              max={shopifySyncDates.endDate || undefined}
                              onChange={(e) =>
                                setShopifySyncDates((prev) => ({
                                  ...prev,
                                  startDate: e.target.value,
                                }))
                              }
                              disabled={isSyncingShopify}
                            />
                        </label>
                        <label className="flex-1 w-full flex flex-col gap-1.5 text-xs font-medium text-gray-600">
                           To Date
                           <input
                              className="w-full rounded-input border border-tele-border bg-white px-3 py-2 text-sm text-gray-700 focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                              type="date"
                              value={shopifySyncDates.endDate}
                              min={shopifySyncDates.startDate || undefined}
                              onChange={(e) =>
                                setShopifySyncDates((prev) => ({
                                  ...prev,
                                  endDate: e.target.value,
                                }))
                              }
                              disabled={isSyncingShopify}
                            />
                        </label>
                     </div>
                     <Button
                        className="rounded-btn bg-tele-primary text-white hover:bg-tele-secondary transition-colors w-full py-2 text-sm font-medium h-auto mt-1"
                        onPress={onSyncShopifyCarts}
                        isLoading={isSyncingShopify}
                        isDisabled={isSyncingShopify}
                      >
                        Sync Abandoned Carts
                      </Button>
                  </div>
               </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_auto_auto]">
            <div className="relative">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">Search</span>
              <div className="relative w-full">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                  <Search size={16} />
                </div>
                <input
                  type="text"
                  className="w-full rounded-input border border-tele-border bg-gray-50 py-2.5 pl-10 pr-3 h-[42px] text-sm text-tele-dark placeholder-gray-400 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary transition-all"
                  placeholder="Name, phone, email..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onApplySearch();
                  }}
                />
              </div>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">
                Stage
              </span>
              <select
                className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-gray-700 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                value={stage}
                onChange={(e) => {
                  updateFilters({ stage: e.target.value, page: 1 });
                }}
              >
                <option value="">All stages</option>
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-gray-600 uppercase tracking-wider">
                Owner
              </span>
              <select
                className="w-full rounded-input border border-tele-border bg-gray-50 px-3 h-[42px] text-sm text-gray-700 outline-none focus:border-tele-primary focus:ring-1 focus:ring-tele-primary"
                value={assignedTo}
                onChange={(e) => {
                  updateFilters({ assignedTo: e.target.value, page: 1 });
                }}
              >
                <option value="">All owners</option>
                {assignees.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
              {assigneeError ? (
                <span className="mt-1 block text-xs font-medium text-red-600">
                  Failed to load owners
                </span>
              ) : null}
            </label>

            <div className="flex flex-col justify-end">
              <Button
                className="rounded-btn border border-tele-border bg-gray-50 text-gray-700 hover:bg-white h-[42px] px-5 font-medium transition-colors"
                onPress={onApplySearch}
              >
                <Search size={16} className="mr-2" />
                Apply
              </Button>
            </div>

            {hasFilter && (
              <div className="flex flex-col justify-end">
                <Button
                  className="rounded-btn border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 h-[42px] px-5 font-medium transition-colors"
                  onPress={clearFilters}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {hasAnyColumnFilter && (
            <div className="flex justify-end pt-2">
              <Button
                size="sm"
                className="rounded-full border border-red-200 bg-red-50 text-red-600 text-xs px-3 font-medium hover:bg-red-100 transition-colors"
                onPress={clearColumnFilters}
              >
                Clear table column filters
              </Button>
            </div>
          )}

          {error && (
            <div className="rounded-card border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-medium text-red-700">
                {error.message || "Failed to load leads"}
              </p>
            </div>
          )}

          {isLoading ? (
            <div className="rounded-card border border-tele-border bg-gray-50/50 p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-tele-primary mb-3"></div>
              <p className="font-medium text-tele-dark">Loading leads...</p>
              <p className="text-gray-500 text-sm mt-1">Fetching pipeline data from the backend.</p>
            </div>
          ) : null}

          {!isLoading && !items.length && !error ? (
            <div className="rounded-card border border-tele-border bg-gray-50/50 p-12 text-center">
              <div className="bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={24} />
              </div>
              <p className="font-bold text-lg text-tele-dark">No leads found</p>
              <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
                {hasFilter ? "Try clearing filters or changing the search parameters." : "Your pipeline is empty. Create a lead or import your first file to get started."}
              </p>
            </div>
          ) : null}

          {/* Mobile: cards */}
          {!isLoading && items.length > 0 ? (
            <div className="grid gap-3 md:hidden">
              {items.map((lead) => (
                <div
                  key={lead.id}
                  className="rounded-card border border-tele-border bg-white p-4 hover:border-tele-primary/30 hover:shadow-soft transition-all cursor-pointer"
                  onClick={() => openDetails(lead)}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-bold text-tele-dark">
                        {leadName(lead)}
                      </p>
                      <p className="text-gray-500 mt-1 truncate text-sm">
                        {lead.phonePrimary}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-tele-light/30 text-tele-primary border border-tele-light">
                      {stageLabel(lead.stage)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                        {lead.assignee?.fullName ? lead.assignee.fullName : "Unassigned"}
                      </span>
                      {lead.source && (
                        <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">
                          {lead.source}
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="relative flex-shrink-0">
                        <button
                          type="button"
                          className="p-1.5 rounded-md text-gray-400 hover:bg-gray-100 hover:text-tele-dark transition-colors"
                          onClick={(e) => { e.stopPropagation(); toggleMenuForLead(lead.id); }}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                        {activeMenuLeadId === lead.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-10 w-36 rounded-card border border-tele-border bg-white shadow-soft py-1">
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                              onClick={(e) => { e.stopPropagation(); openEditLead(lead); }}
                            >
                              <Edit3 size={14} className="mr-2" /> Edit
                            </button>
                            <button
                              type="button"
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                              onClick={(e) => { e.stopPropagation(); deleteLead(lead); }}
                            >
                              <Trash2 size={14} className="mr-2" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {/* Desktop: table */}
          {!isLoading && items.length > 0 ? (
            <div className="hidden md:block table-container">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider relative group">
                      <ColumnFilterHeader
                        label="Lead"
                        column="lead"
                        activeDropdown={activeColumnFilter}
                        isActive={isColumnFilterActive("lead")}
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
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider relative group">
                      <ColumnFilterHeader
                        label="Phone"
                        column="phone"
                        activeDropdown={activeColumnFilter}
                        isActive={isColumnFilterActive("phone")}
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
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider relative group">
                      <ColumnFilterHeader
                        label="Stage"
                        column="stage"
                        activeDropdown={activeColumnFilter}
                        isActive={isColumnFilterActive("stage")}
                        onToggle={toggleColumnFilter}
                        onApply={applyColumnFilter}
                        onClear={clearColumnFilter}
                      >
                        <SelectColumnFilter
                          value={tempColumnFilters.stage}
                          onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, stage: value }))}
                          options={STAGE_OPTIONS}
                        />
                      </ColumnFilterHeader>
                    </th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider relative group">
                      <ColumnFilterHeader
                        label="Owner"
                        column="agent"
                        activeDropdown={activeColumnFilter}
                        isActive={isColumnFilterActive("agent")}
                        onToggle={toggleColumnFilter}
                        onApply={applyColumnFilter}
                        onClear={clearColumnFilter}
                      >
                        <TextColumnFilter
                          value={tempColumnFilters.agent}
                          onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, agent: value }))}
                          placeholder="Search agent..."
                        />
                      </ColumnFilterHeader>
                    </th>
                    <th className="px-6 py-3 font-semibold uppercase tracking-wider relative group">
                      <ColumnFilterHeader
                        label="Source"
                        column="source"
                        activeDropdown={activeColumnFilter}
                        isActive={isColumnFilterActive("source")}
                        onToggle={toggleColumnFilter}
                        onApply={applyColumnFilter}
                        onClear={clearColumnFilter}
                      >
                        <TextColumnFilter
                          value={tempColumnFilters.source}
                          onChange={(value) => setTempColumnFilters((prev) => ({ ...prev, source: value }))}
                          placeholder="Search source..."
                        />
                      </ColumnFilterHeader>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tele-border">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                        No leads match the selected table filters.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((lead) => (
                      <tr key={lead.id}>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            className="font-bold text-tele-dark hover:text-tele-primary transition-colors"
                            onClick={() => openDetails(lead)}
                          >
                            {leadName(lead)}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{lead.phonePrimary}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-tele-light/30 text-tele-primary border border-tele-light">
                            {stageLabel(lead.stage)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {lead.assignee?.fullName || "-"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-gray-600">{lead.source || "-"}</span>
                            {canEdit && (
                              <div className="relative">
                                <button
                                  type="button"
                                  className="p-1 rounded text-gray-400 hover:text-tele-dark hover:bg-gray-100 transition-colors focus:outline-none"
                                  onClick={(e) => { e.stopPropagation(); toggleMenuForLead(lead.id); }}
                                >
                                  <MoreHorizontal size={16} />
                                </button>
                                {activeMenuLeadId === lead.id && (
                                  <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-card border border-tele-border bg-white shadow-soft py-1">
                                    <button
                                      type="button"
                                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                                      onClick={() => openEditLead(lead)}
                                    >
                                      <Edit3 size={14} className="mr-2" /> Edit
                                    </button>
                                    <button
                                      type="button"
                                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                                      onClick={() => deleteLead(lead)}
                                    >
                                      <Trash2 size={14} className="mr-2" /> Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Pagination */}
          {items.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-tele-border gap-4">
              <p className="text-sm text-gray-500">
                Page <span className="font-semibold text-tele-dark">{page}</span> of{" "}
                <span className="font-semibold text-tele-dark">{totalPages}</span> — {limit} per page
              </p>
              <div className="flex items-center gap-2">
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

      {/* Detail Panel */}
      <LeadDetailPanel
        isOpen={detailOpen}
        lead={isLoadingLead ? null : activeLead}
        canEdit={canEdit}
        callState={activeCall}
        callResult={callResult}
        isStartingCall={isStartingCall}
        onStartCall={startCall}
        onOpenDisposition={openDisposition}
        recordings={recordings}
        recordingsLoading={isLoadingRecordings}
        recordingsError={recordingsError}
        onRefreshRecordings={() => loadRecordings(activeLeadId)}
        onUploadRecording={uploadRecording}
        canUploadRecording={canUploadRecording}
        onClose={closeDetails}
        onEdit={openEdit}
        onPlayRecording={playRecording}
        onDownloadRecording={downloadRecording}
        busyRecordingAction={busyRecordingAction}
      />

      {/* Modals */}
      <DispositionModal
        isOpen={dispositionOpen}
        call={activeCall}
        canSubmit={Boolean(activeCall?.id)}
        isSaving={isSavingDisposition}
        error={dispositionError}
        onClose={closeDisposition}
        onSubmit={submitDisposition}
      />

      <LeadFormModal
        key={`${modalOpen ? 'open' : 'closed'}-${modalLead?.id || modalMode}`}
        isOpen={modalOpen}
        mode={modalMode}
        initialLead={modalLead}
        assignees={assignees}
        canEdit={canEdit}
        isSaving={isSaving}
        error={saveError}
        onClose={closeModal}
        onSubmit={onSubmit}
      />

      {/* Sync Modal */}
      <AnimatePresence>
        {isSyncModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md rounded-[2rem] bg-tele-card p-8 shadow-tele-float text-center flex flex-col items-center relative overflow-hidden border border-tele-border"
            >
              {/* Background glow effect */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-tele-primary/20 rounded-full blur-[3rem] pointer-events-none" />
              <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-tele-primary/10 rounded-full blur-[3rem] pointer-events-none" />

              <div className="relative z-10 w-full flex flex-col items-center">
                <div className="mb-6 h-16 w-16 rounded-full bg-tele-light/50 border-4 border-tele-card flex items-center justify-center shadow-inner relative">
                  <div className="absolute inset-0 rounded-full border-2 border-tele-primary border-t-transparent animate-spin" />
                  <RefreshCw className="text-tele-primary" size={24} />
                </div>

                <h3 className="text-2xl font-black text-tele-dark mb-2 tracking-tight">
                  Syncing Shopify
                </h3>
                <p className="text-gray-500 text-sm mb-8 max-w-[250px] leading-relaxed">
                  Please keep this tab open. We're fetching your abandoned carts.
                </p>

                <div className="w-full mb-8 relative">
                  <div className="flex justify-between items-end mb-2 px-1">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Progress</span>
                    <span className="text-lg font-black text-tele-primary">{syncProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-tele-border/50 rounded-full h-3 overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${syncProgress}%` }}
                      transition={{ ease: "easeOut", duration: 0.5 }}
                      className="bg-tele-primary h-full rounded-full relative overflow-hidden"
                    />
                  </div>
                </div>
                
                <div className="w-full bg-gray-50/50 dark:bg-tele-border/30 rounded-2xl p-4 flex items-center justify-center gap-3 border border-tele-border text-tele-dark font-medium text-sm">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tele-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tele-primary"></span>
                  </span>
                  <span className="truncate animate-pulse">{syncStatusMsg}</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default LeadsPage;
