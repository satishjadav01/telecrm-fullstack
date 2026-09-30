import { clearTokens, getAccessToken } from "../auth/token";

const envBaseUrl = (import.meta.env?.VITE_API_BASE_URL || "").trim();
const normalizeBaseUrl = (value) =>
  String(value || "")
    .trim()
    .replace(/\/+$/, "");
const API_BASE_URL = normalizeBaseUrl(envBaseUrl);
const LOCAL_API_BASE_URL = "http://localhost:8907";

let unauthorizedHandler = null;
let workingBaseUrl = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

export class ApiError extends Error {
  constructor(
    message,
    { status = 0, code = null, details = null, data = null } = {},
  ) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    this.data = data;
  }
}

const unique = (items) => [...new Set(items)];

export const getApiBaseCandidates = () => {
  const candidates = [];

  if (API_BASE_URL) candidates.push(API_BASE_URL);
  if (import.meta.env?.DEV) candidates.push(LOCAL_API_BASE_URL);
  candidates.push("");

  return unique(candidates.map(normalizeBaseUrl));
};

export const buildApiUrl = (path, query, baseOverride) => {
  const isAbsolute = /^https?:\/\//i.test(path);
  const base = isAbsolute ? "" : normalizeBaseUrl(baseOverride ?? API_BASE_URL);
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`, window.location.origin);

  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  // Empty base keeps the request relative, so Vite proxy/deployed same-origin APIs still work.
  return base ? url.toString() : `${normalizedPath}${url.search}`;
};

const isFormData = (value) =>
  typeof FormData !== "undefined" && value instanceof FormData;

const parseResponseBody = async (res) => {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  try {
    return await res.text();
  } catch {
    return null;
  }
};

const normalizeError = (res, data) => {
  const status = res.status;

  if (data && typeof data === "object") {
    // Backend errors typically look like: { message, details?, stack? }
    const message = data.message || `Request failed (${status})`;
    const details = data.details || data.errors || null;
    return new ApiError(message, { status, details, data });
  }

  const message =
    typeof data === "string" && data.trim()
      ? data
      : `Request failed (${status})`;
  return new ApiError(message, { status, data });
};

export const request = async ({
  path,
  method = "GET",
  query,
  body,
  headers,
  signal,
  timeoutMs = 20000,
} = {}) => {
  if (!path) throw new ApiError("Request path is required");

  const controller = signal ? null : new AbortController();
  const effectiveSignal = signal || controller.signal;
  const timer = controller
    ? setTimeout(() => controller.abort(), timeoutMs)
    : null;

  const token = getAccessToken();

  const init = {
    method,
    cache: "no-store",
    headers: {
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
      ...(headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: effectiveSignal,
  };

  if (body !== undefined) {
    if (isFormData(body)) {
      init.body = body;
    } else if (typeof body === "string") {
      init.body = body;
      init.headers["Content-Type"] =
        init.headers["Content-Type"] || "text/plain";
    } else {
      init.body = JSON.stringify(body);
      init.headers["Content-Type"] =
        init.headers["Content-Type"] || "application/json";
    }
  }

  try {
    const isAbsolute = /^https?:\/\//i.test(path);
    let bases = isAbsolute ? [""] : getApiBaseCandidates();
    if (!isAbsolute && workingBaseUrl && bases.includes(workingBaseUrl)) {
      bases = [workingBaseUrl, ...bases.filter((b) => b !== workingBaseUrl)];
    }
    let lastNetworkError = null;

    for (const base of bases) {
      const childController = new AbortController();
      let isAttemptTimeout = false;
      const onParentAbort = () => childController.abort();

      if (effectiveSignal) {
        if (effectiveSignal.aborted) {
          childController.abort();
        } else {
          effectiveSignal.addEventListener("abort", onParentAbort);
        }
      }

      // Individual attempt timeout (e.g. 4000ms)
      const attemptTimeoutMs = 4000;
      const attemptTimer = setTimeout(() => {
        isAttemptTimeout = true;
        childController.abort();
      }, attemptTimeoutMs);

      try {
        const url = buildApiUrl(path, query, base);
        const attemptInit = {
          ...init,
          signal: childController.signal,
        };
        const res = await fetch(url, attemptInit);
        const data = await parseResponseBody(res);

        if (!res.ok) {
          if (res.status === 401) {
            clearTokens();
            try {
              unauthorizedHandler?.();
            } catch {
              // ignore handler failures
            }
          }
          throw normalizeError(res, data);
        }

        if (!isAbsolute) {
          workingBaseUrl = base;
        }
        return data;
      } catch (error) {
        if (error instanceof ApiError) throw error;
        if (error?.name === "AbortError") {
          if (effectiveSignal?.aborted && !isAttemptTimeout) {
            throw error;
          }
          if (base === workingBaseUrl) {
            workingBaseUrl = null;
          }
          lastNetworkError = new ApiError("Candidate attempt timed out", {
            status: 0,
            code: "TIMEOUT",
          });
        } else {
          if (base === workingBaseUrl) {
            workingBaseUrl = null;
          }
          lastNetworkError = error;
        }
      } finally {
        clearTimeout(attemptTimer);
        if (effectiveSignal) {
          effectiveSignal.removeEventListener("abort", onParentAbort);
        }
      }
    }

    throw lastNetworkError || new Error("Network error");
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new ApiError("Request timed out", { status: 0, code: "TIMEOUT" });
    }
    if (error instanceof ApiError) throw error;
    throw new ApiError(error?.message || "Network error", {
      status: 0,
      code: "NETWORK_ERROR",
    });
  } finally {
    if (timer) clearTimeout(timer);
  }
};

export const http = {
  get: (path, options) => request({ ...options, path, method: "GET" }),
  post: (path, body, options) =>
    request({ ...options, path, method: "POST", body }),
  put: (path, body, options) =>
    request({ ...options, path, method: "PUT", body }),
  patch: (path, body, options) =>
    request({ ...options, path, method: "PATCH", body }),
  del: (path, options) => request({ ...options, path, method: "DELETE" }),
};
