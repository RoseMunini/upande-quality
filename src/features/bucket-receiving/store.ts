import { create } from 'zustand';
import { bucketReceivingRepository, type FoundBucket, type QuarantinedBucket } from './repository';

type Outcome = { ok: true } | { ok: false; message: string };

type State = {
  searching: boolean;
  found: FoundBucket | null;
  searchBucket: (bucketId: string) => Promise<Outcome>;
  clearFound: () => void;

  rejecting: boolean;
  submitFoundReject: (entries: { reason: string; quantity: number }[], notes?: string) => Promise<Outcome>;

  quarantining: boolean;
  quarantineFoundBucket: () => Promise<Outcome>;

  // Quarantine Review — independent of the search above; can review buckets
  // quarantined in a previous session too.
  transferring: boolean;
  usedDestinationBucketIds: string[];
  quarantineList: QuarantinedBucket[];
  quarantineListLoading: boolean;
  loadQuarantineList: () => Promise<void>;
  releaseAsTransfer: (bucketId: string, qty: number, destinationBucketId: string) => Promise<Outcome>;
  releaseAsReject: (
    bucketId: string,
    entries: { reason: string; quantity: number }[],
    notes?: string,
  ) => Promise<Outcome>;
};

export const useBucketReceivingStore = create<State>((set, get) => ({
  searching: false,
  found: null,

  rejecting: false,
  quarantining: false,

  transferring: false,
  usedDestinationBucketIds: [],
  quarantineList: [],
  quarantineListLoading: false,

  searchBucket: async (bucketId) => {
    set({ searching: true, found: null });
    const outcome = await bucketReceivingRepository.searchRecentBucket(bucketId);
    set({ searching: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set({ found: outcome.bucket });
    return { ok: true };
  },

  clearFound: () => set({ found: null }),

  submitFoundReject: async (entries, notes) => {
    const { found } = get();
    if (!found) return { ok: false, message: 'No bucket selected.' };
    set({ rejecting: true });
    for (const entry of entries) {
      const outcome = await bucketReceivingRepository.rejectBucket({
        bucketId: found.bucketId,
        quantity: entry.quantity,
        reason: entry.reason,
        notes,
      });
      if (outcome.kind === 'error') {
        set({ rejecting: false });
        return { ok: false, message: outcome.message };
      }
    }
    set({ rejecting: false, found: null });
    return { ok: true };
  },

  quarantineFoundBucket: async () => {
    const { found } = get();
    if (!found) return { ok: false, message: 'No bucket selected.' };
    set({ quarantining: true });
    const outcome = await bucketReceivingRepository.quarantineBucket(found.bucketId);
    set({ quarantining: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set({ found: null });
    return { ok: true };
  },

  loadQuarantineList: async () => {
    set({ quarantineListLoading: true });
    const quarantineList = await bucketReceivingRepository.listQuarantinedBuckets();
    set({ quarantineList, quarantineListLoading: false });
  },

  releaseAsTransfer: async (bucketId, qty, destinationBucketId) => {
    if (get().usedDestinationBucketIds.includes(destinationBucketId)) {
      return { ok: false, message: `${destinationBucketId} was already used as a destination — scan a different one.` };
    }
    set({ transferring: true });
    const outcome = await bucketReceivingRepository.transferBucket({ sourceBucketId: bucketId, destinationBucketId, qty });
    set({ transferring: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({
      quarantineList: s.quarantineList.filter((q) => q.bucketId !== bucketId),
      usedDestinationBucketIds: [...s.usedDestinationBucketIds, destinationBucketId],
    }));
    return { ok: true };
  },

  releaseAsReject: async (bucketId, entries, notes) => {
    const item = get().quarantineList.find((q) => q.bucketId === bucketId);
    if (!item) return { ok: false, message: 'Bucket not found in quarantine list.' };
    set({ rejecting: true });
    for (const entry of entries) {
      const outcome = await bucketReceivingRepository.submitQuarantineReject({
        bucketId,
        greenhouse: item.greenhouse,
        variety: item.itemCode,
        quantity: entry.quantity,
        reason: entry.reason,
        notes,
      });
      if (outcome.kind === 'error') {
        set({ rejecting: false });
        return { ok: false, message: outcome.message };
      }
    }
    set((s) => ({
      rejecting: false,
      quarantineList: s.quarantineList.filter((q) => q.bucketId !== bucketId),
    }));
    return { ok: true };
  },
}));
