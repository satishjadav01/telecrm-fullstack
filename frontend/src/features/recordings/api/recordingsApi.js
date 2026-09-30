import { getAccessToken } from "../../../services/auth/token";
import {
  ApiError,
  buildApiUrl,
  getApiBaseCandidates,
  http,
} from "../../../services/http/client";

const recordingFilePath = (callId) => `/api/calls/${callId}/recording-file`;

const buildRecordingFileUrl = (callId, base) =>
  buildApiUrl(recordingFilePath(callId), undefined, base);

const listQuery = ({
  page = 1,
  limit = 100,
  agentId,
  leadId,
  source,
  from,
  to,
  search,
  hasFilter,
} = {}) => ({
  page,
  limit,
  agentId: agentId || undefined,
  leadId: leadId || undefined,
  source: source || undefined,
  from: from || undefined,
  to: to || undefined,
  search: search || undefined,
  hasFilter: hasFilter === undefined ? undefined : Boolean(hasFilter),
});

const fetchRecordingBlob = async (callId) => {
  const token = getAccessToken();
  const bases = getApiBaseCandidates();
  let lastNetworkError = null;

  for (const base of bases) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(buildRecordingFileUrl(callId, base), {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const data = await res.json();
          message = data?.message || message;
        } catch {
          // ignore non-json body
        }
        throw new ApiError(message, { status: res.status });
      }

      return await res.blob();
    } catch (error) {
      if (error instanceof ApiError) throw error;
      lastNetworkError = error?.name === "AbortError" ? new Error("Request timeout") : error;
    } finally {
      clearTimeout(timer);
    }
  }

  throw new ApiError(lastNetworkError?.message || "Network error", {
    status: 0,
    code: "NETWORK_ERROR",
  });
};

export const recordingsApi = {
  list: async (params = {}) => {
    return http.get("/api/recordings", {
      query: listQuery(params),
    });
  },
  upload: async (callId, file, meta = {}) => {
    const form = new FormData();
    form.append("recording", file);

    for (const [key, value] of Object.entries(meta || {})) {
      if (value === undefined || value === null || value === "") continue;
      form.append(key, String(value));
    }

    return http.post(`/api/calls/${callId}/recording-upload`, form);
  },
  getForCall: async (callId) => {
    return http.get(`/api/calls/${callId}/recording`);
  },
  listForLead: async (leadId) => {
    return http.get(`/api/leads/${leadId}/recordings`);
  },
  listForAgent: async (agentId, params = {}) => {
    return http.get(`/api/agents/${agentId}/recordings`, {
      query: listQuery(params),
    });
  },
  buildPlaybackUrl: (callId) => {
    return buildRecordingFileUrl(callId, getApiBaseCandidates()[0]);
  },
  createPlaybackObjectUrl: async (callId) => {
    const blob = await fetchRecordingBlob(callId);
    return URL.createObjectURL(blob);
  },
  downloadForCall: async (callId, fileName = "recording") => {
    const blob = await fetchRecordingBlob(callId);
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  },
};
