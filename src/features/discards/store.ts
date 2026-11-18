import { create } from 'zustand';
import { discardsRepository } from './repository';

type Outcome =
  | { ok: true; variety: string; stems: number; hoursOnShelf: number }
  | { ok: false; message: string };

type BunchOutcome = { ok: true; variety: string; stems: number } | { ok: false; message: string };

type State = {
  discardedCount: number;
  discardedBunchCount: number;
  discarding: boolean;
  discardBucket: (bucketId: string) => Promise<Outcome>;
  discardBunch: (bunchId: string) => Promise<BunchOutcome>;
};

export const useDiscardsStore = create<State>((set) => ({
  discardedCount: 0,
  discardedBunchCount: 0,
  discarding: false,
  discardBucket: async (bucketId) => {
    set({ discarding: true });
    const outcome = await discardsRepository.discardBucket(bucketId);
    set({ discarding: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({ discardedCount: s.discardedCount + 1 }));
    return {
      ok: true,
      variety: outcome.variety,
      stems: outcome.stems,
      hoursOnShelf: outcome.hoursOnShelf,
    };
  },
  discardBunch: async (bunchId) => {
    set({ discarding: true });
    const outcome = await discardsRepository.discardBunch(bunchId);
    set({ discarding: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({ discardedBunchCount: s.discardedBunchCount + 1 }));
    return { ok: true, variety: outcome.variety, stems: outcome.stems };
  },
}));
