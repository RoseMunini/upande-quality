import { create } from 'zustand';
import { authRepository } from './repository';
import { storage, StorageKeys } from '@/src/core/storage';

// Single-farm build: password-only login. No biometric module, no
// biometric-lock route. If biometric login comes back later, restore from
// the upande-quality history — the hooks (biometricEnabled/biometricLocked)
// were removed here rather than stubbed so nothing pretends to work.
type AuthState = {
  status: 'idle' | 'loading' | 'success' | 'error';
  error: string | null;
  fullName: string | null;
  email: string | null;
  instanceUrl: string | null;
  hasSession: boolean;
  hydrated: boolean;
  roles: string[];

  hydrate: () => Promise<void>;
  login: (email: string, password: string, url: string) => Promise<boolean>;
  /** Soft logout — clear the in-memory session view. */
  logout: () => Promise<void>;
  /** Hard logout — wipe everything. Used on 401 / "Forget device". */
  forgetDevice: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'idle',
  error: null,
  fullName: null,
  email: null,
  instanceUrl: null,
  hasSession: false,
  hydrated: false,
  roles: [],

  hydrate: async () => {
    // eslint-disable-next-line no-console
    console.log('[boot] auth.hydrate: start');
    const [hasSession, roles, email, instanceUrl, fullName] = await Promise.all([
      authRepository.hasSession().then((v) => (console.log('[boot] auth.hydrate: hasSession done'), v)),
      authRepository.loadRoles().then((v) => (console.log('[boot] auth.hydrate: loadRoles done'), v)),
      storage.get(StorageKeys.emailBackup).then((v) => (console.log('[boot] auth.hydrate: emailBackup done'), v)),
      storage.get(StorageKeys.instanceUrl).then((v) => (console.log('[boot] auth.hydrate: instanceUrl done'), v)),
      storage.get(StorageKeys.fullName).then((v) => (console.log('[boot] auth.hydrate: fullName done'), v)),
    ]);
    // eslint-disable-next-line no-console
    console.log('[boot] auth.hydrate: Promise.all resolved, calling set()');
    set({ hasSession, hydrated: true, roles, email, instanceUrl, fullName });
    // eslint-disable-next-line no-console
    console.log('[boot] auth.hydrate: done');
  },

  login: async (email, password, url) => {
    set({ status: 'loading', error: null });
    const result = await authRepository.login(email, password, url);
    if (result.ok) {
      set({
        status: 'success',
        fullName: result.fullName,
        email,
        instanceUrl: result.instanceUrl,
        hasSession: true,
        roles: result.roles,
        error: null,
      });
      return true;
    }
    set({ status: 'error', error: result.error, hasSession: false });
    return false;
  },

  logout: async () => {
    set({ status: 'idle', error: null, hasSession: false });
  },

  forgetDevice: async () => {
    await authRepository.logout();
    set({
      status: 'idle',
      error: null,
      fullName: null,
      email: null,
      instanceUrl: null,
      hasSession: false,
      roles: [],
    });
  },

  hasRole: (role) => get().roles.includes(role) || get().roles.includes('Administrator'),
}));
