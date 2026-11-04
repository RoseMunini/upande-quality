import { create } from 'zustand';
import { discardsRepository } from './repository';

type Outcome =
  | { ok: true; variety: string; stems: number; pendingApproval: boolean; hoursRemaining: number }
  | { ok: false; message: string };

type State = {
  markedCount: number;
  discarding: boolean;
  discardBucket: (bucketId: string) => Promise<Outcome>;
};

export const useDiscardsStore = create<State>((set) => ({
  markedCount: 0,
  discarding: false,
  discardBucket: async (bucketId) => {
    set({ discarding: true });
    const outcome = await discardsRepository.discardBucket(bucketId);
    set({ discarding: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({ markedCount: s.markedCount + 1 }));
    return {
      ok: true,
      variety: outcome.variety,
      stems: outcome.stems,
      pendingApproval: outcome.pendingApproval,
      hoursRemaining: outcome.hoursRemaining,
    };
  },
}));
