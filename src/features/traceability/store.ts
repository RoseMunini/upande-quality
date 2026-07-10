import { create } from 'zustand';
import { traceabilityRepository, type History } from './repository';

type Outcome = { ok: true } | { ok: false; message: string };

type State = {
  history: History | null;
  loading: boolean;

  lookup: (refId: string) => Promise<Outcome>;
  clear: () => void;
};

export const useTraceabilityStore = create<State>((set) => ({
  history: null,
  loading: false,

  lookup: async (refId) => {
    set({ loading: true });
    const outcome = await traceabilityRepository.getHistory(refId);
    set({ loading: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set({ history: outcome.history });
    return { ok: true };
  },

  clear: () => set({ history: null }),
}));
