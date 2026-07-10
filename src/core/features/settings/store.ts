import { create } from 'zustand';
import { storage, StorageKeys } from '@/src/core/storage';

type State = {
  soundEnabled: boolean;
  loaded: boolean;
  hydrate: () => Promise<void>;
  setSoundEnabled: (next: boolean) => Promise<void>;
};

export const useSettingsStore = create<State>((set) => ({
  soundEnabled: true,
  loaded: false,

  hydrate: async () => {
    const raw = await storage.get(StorageKeys.soundEnabled);
    set({ soundEnabled: raw !== 'false', loaded: true });
  },

  setSoundEnabled: async (next) => {
    await storage.set(StorageKeys.soundEnabled, next ? 'true' : 'false');
    set({ soundEnabled: next });
  },
}));
