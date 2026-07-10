import { create } from 'zustand';
import { AppState, type AppStateStatus } from 'react-native';
import * as Network from 'expo-network';

/**
 * Network-status store. OS connectivity + API-failure escalation. After
 * `FAILURE_THRESHOLD` consecutive failures, flips to offline regardless of
 * what the OS reports — practical signal is whether OUR server is reachable.
 */

const FAILURE_THRESHOLD = 2;
const ONLINE_POLL_MS = 15_000;
const OFFLINE_POLL_MS = 6_000;

interface NetworkState {
  online: boolean;
  checking: boolean;
  consecutiveFailures: number;
  ready: boolean;
  /** Timestamp (ms) of the last successful API response, for a Settings-screen
   *  "last synced" readout. Null until the first successful call this session. */
  lastSuccessAt: number | null;

  init: () => void;
  forceCheck: () => Promise<void>;
  notifyApiSuccess: () => void;
  notifyApiFailure: () => void;
  setOnline: (online: boolean) => void;
}

let pollTimer: ReturnType<typeof setTimeout> | null = null;
let appStateSub: { remove: () => void } | null = null;

async function checkConnectivity(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return !!(state.isConnected && state.isInternetReachable !== false);
  } catch {
    return false;
  }
}

export const useNetworkStore = create<NetworkState>((set, get) => ({
  online: true,
  checking: false,
  consecutiveFailures: 0,
  ready: false,
  lastSuccessAt: null,

  init: () => {
    if (get().ready) return;
    set({ ready: true });
    const scheduleNext = () => {
      if (pollTimer) clearTimeout(pollTimer);
      const delay = get().online ? ONLINE_POLL_MS : OFFLINE_POLL_MS;
      pollTimer = setTimeout(() => {
        get().forceCheck().finally(scheduleNext);
      }, delay);
    };
    appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') get().forceCheck();
    });
    get().forceCheck().finally(scheduleNext);
  },

  forceCheck: async () => {
    if (get().checking) return;
    set({ checking: true });
    try {
      const online = await checkConnectivity();
      if (online && get().consecutiveFailures === 0) {
        if (!get().online) set({ online: true });
      } else if (!online) {
        if (get().online) set({ online: false });
      }
    } finally {
      set({ checking: false });
    }
  },

  notifyApiSuccess: () => {
    if (get().consecutiveFailures > 0) set({ consecutiveFailures: 0 });
    if (!get().online) set({ online: true });
    set({ lastSuccessAt: Date.now() });
  },

  notifyApiFailure: () => {
    const next = get().consecutiveFailures + 1;
    set({ consecutiveFailures: next });
    if (next >= FAILURE_THRESHOLD && get().online) {
      set({ online: false });
      get().forceCheck();
    }
  },

  setOnline: (online) => set({ online }),
}));
