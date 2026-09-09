import axios, { isAxiosError, type AxiosError, type AxiosInstance, type AxiosRequestConfig } from 'axios';
import { storage, StorageKeys } from '@/src/core/storage';
import { useNetworkStore } from '@/src/core/network/store';
import { attachStartTime, elapsed, logError, logRequest, logResponse } from './log';

let client: AxiosInstance | null = null;

function buildClient(): AxiosInstance {
  const instance = axios.create({ timeout: 30000 });
  instance.interceptors.request.use(async (config) => {
    const baseUrl = await storage.get(StorageKeys.instanceUrl);
    const cookie = await storage.get(StorageKeys.cookie);
    if (baseUrl) config.baseURL = baseUrl;
    config.headers = config.headers ?? {};
    if (cookie) (config.headers as Record<string, string>).Cookie = cookie;
    if (!config.headers['Content-Type']) {
      (config.headers as Record<string, string>)['Content-Type'] = 'application/json';
    }
    attachStartTime(config);
    logRequest(config);
    return config;
  });
  instance.interceptors.response.use(
    (response) => {
      logResponse(response, elapsed(response.config));
      try { useNetworkStore.getState().notifyApiSuccess(); } catch {}
      return response;
    },
    (error) => {
      if (isAxiosError(error)) {
        logError(error, elapsed(error.config));
        // No response means the request never landed — treat as a network
        // failure so the offline banner can flip on.
        if (!error.response) {
          try { useNetworkStore.getState().notifyApiFailure(); } catch {}
        }
      } else {
        console.log('[API] ✗ non-axios error:', error);
      }
      return Promise.reject(error);
    },
  );
  return instance;
}

export function apiClient(): AxiosInstance {
  if (!client) client = buildClient();
  return client;
}

export async function api<T = unknown>(config: AxiosRequestConfig): Promise<T> {
  const res = await apiClient().request<T>(config);
  return res.data;
}

export class HttpError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** A connectivity failure — the request never reached the server. */
function isNetworkError(err: AxiosError): boolean {
  if (err.response) return false;
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') return true;
  if (typeof err.message === 'string' && /network\s*error|failed to fetch|timeout/i.test(err.message)) {
    return true;
  }
  return false;
}

/** Frappe's `_server_messages` is a JSON-encoded array of JSON-encoded
 *  message objects (each usually `{ message, title, indicator }`) — the
 *  human-readable text set via `frappe.throw`/`msgprint`. Returns the first
 *  message found, or null if the field is absent or fails to parse. */
function firstServerMessage(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  try {
    const entries = JSON.parse(raw) as unknown[];
    for (const entry of entries) {
      const parsed = typeof entry === 'string' ? JSON.parse(entry) : entry;
      if (parsed && typeof parsed === 'object' && typeof (parsed as { message?: string }).message === 'string') {
        return (parsed as { message: string }).message;
      }
    }
  } catch {
    // Malformed/unexpected shape — fall through to other sources.
  }
  return null;
}

const STATUS_FALLBACKS: Record<number, string> = {
  401: 'Your session has expired. Please log in again.',
  403: "You don't have permission to do this. Contact your administrator.",
  404: 'Not found.',
  500: 'Something went wrong on the server. Please try again.',
};

export function mapAxiosError(err: unknown): HttpError {
  if (isAxiosError(err)) {
    if (isNetworkError(err)) {
      return new HttpError(
        0,
        "You're offline. Check your network connection and try again.",
        null,
      );
    }
    const status = err.response?.status ?? 0;
    const body = err.response?.data;
    let message = err.message;
    if (body && typeof body === 'object') {
      const exc = body as { exc_type?: string; exception?: string; _server_messages?: string; message?: string };
      const serverMessage = firstServerMessage(exc._server_messages);
      if (serverMessage) {
        message = serverMessage;
      } else if (exc.message) {
        message = exc.message;
      } else if (exc.exception) {
        // "frappe.exceptions.PermissionError: You do not have enough permissions..."
        // — strip the leading "SomeException: " prefix, keep the readable part.
        message = exc.exception.replace(/^[\w.]+:\s*/, '') || exc.exception;
      } else {
        message = STATUS_FALLBACKS[status] ?? exc.exc_type ?? message;
      }
    }
    return new HttpError(status, message, body);
  }
  return new HttpError(0, err instanceof Error ? err.message : 'Unknown error', null);
}
