import { create } from 'zustand';
import { discardsRepository } from './repository';

type Outcome = { ok: true; variety: string; stems: number } | { ok: false; message: string };

type State = {
  discardedCount: number;
  discarding: boolean;
  discardBucket: (bucketId: string) => Promise<Outcome>;
};

export const useDiscardsStore = create<State>((set) => ({
  discardedCount: 0,
  discarding: false,
  discardBucket: async (bucketId) => {
    set({ discarding: true });
    const outcome = await discardsRepository.discardBucket(bucketId);
    set({ discarding: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({ discardedCount: s.discardedCount + 1 }));
    return { ok: true, variety: outcome.variety, stems: outcome.stems };
  },
}));
