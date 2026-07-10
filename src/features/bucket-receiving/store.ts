import { create } from 'zustand';
import { bucketReceivingRepository, computeRemainingQty, type BucketStatus } from './repository';

type Outcome = { ok: true } | { ok: false; message: string };

export type QueueItem = {
  bucketId: string;
  itemCode: string;
  greenhouse: string;
  farm: string;
  receivedQty: number;
  rejectQty: number;
  transferred: boolean;
};

type Phase = 'receiving' | 'rejecting' | 'transferring' | 'done';

type State = {
  phase: Phase;
  queue: QueueItem[];
  activeIndex: number;

  scanStatus: BucketStatus | null;
  scannedBucketId: string;
  lookupLoading: boolean;

  receiving: boolean;
  rejecting: boolean;
  transferring: boolean;

  /** Destination buckets already transferred into this batch. Cleared on
   *  reset() — this only stops reusing one twice within the same batch,
   *  not across batches, since coldroom buckets are physically reusable. */
  usedDestinationBucketIds: string[];

  scanBucket: (bucketId: string) => Promise<Outcome>;
  clearScanStatus: () => void;
  receive: (params: { isBunched: boolean; bunchSize?: number; numberOfBunches?: number }) => Promise<Outcome>;
  enqueueInUse: () => void;

  /** Move from receiving into the reject pass over the whole queue. */
  startRejecting: () => void;
  reject: (params: { quantity: number; reason: string; notes?: string }) => Promise<Outcome>;
  /** Advance past the current item's reject step (whether or not a reject
   *  was recorded). Rolls the whole queue into the transfer pass once every
   *  item has had its reject decision made. */
  advanceReject: () => void;

  transfer: (destinationBucketId: string) => Promise<Outcome>;

  reset: () => void;
};

const initialState = {
  phase: 'receiving' as Phase,
  queue: [] as QueueItem[],
  activeIndex: 0,
  scanStatus: null as BucketStatus | null,
  scannedBucketId: '',
  lookupLoading: false,
  receiving: false,
  rejecting: false,
  transferring: false,
  usedDestinationBucketIds: [] as string[],
};

export const useBucketReceivingStore = create<State>((set, get) => ({
  ...initialState,

  scanBucket: async (bucketId) => {
    if (get().queue.some((q) => q.bucketId === bucketId)) {
      return { ok: false, message: `${bucketId} is already in the queue.` };
    }
    set({ lookupLoading: true });
    const outcome = await bucketReceivingRepository.loadStatus(bucketId);
    set({ lookupLoading: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set({ scannedBucketId: bucketId, scanStatus: outcome.status });
    return { ok: true };
  },

  clearScanStatus: () => set({ scanStatus: null, scannedBucketId: '' }),

  receive: async (params) => {
    const { scannedBucketId, scanStatus } = get();
    set({ receiving: true });
    const outcome = await bucketReceivingRepository.receiveBucket({ bucketId: scannedBucketId, ...params });
    set({ receiving: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({
      queue: [
        ...s.queue,
        {
          bucketId: scannedBucketId,
          itemCode: outcome.variety || scanStatus?.itemCode || '',
          greenhouse: outcome.greenhouse || scanStatus?.greenhouse || '',
          farm: scanStatus?.farm || '',
          receivedQty: outcome.qty,
          rejectQty: 0,
          transferred: false,
        },
      ],
      scanStatus: null,
      scannedBucketId: '',
    }));
    return { ok: true };
  },

  enqueueInUse: () => {
    const { scannedBucketId, scanStatus } = get();
    if (!scanStatus) return;
    set((s) => ({
      queue: [
        ...s.queue,
        {
          bucketId: scannedBucketId,
          itemCode: scanStatus.itemCode,
          greenhouse: scanStatus.greenhouse,
          farm: scanStatus.farm,
          receivedQty: scanStatus.receivedQty,
          rejectQty: 0,
          transferred: false,
        },
      ],
      scanStatus: null,
      scannedBucketId: '',
    }));
  },

  startRejecting: () => {
    if (get().queue.length === 0) return;
    set({ phase: 'rejecting', activeIndex: 0 });
  },

  reject: async (params) => {
    const { queue, activeIndex } = get();
    const item = queue[activeIndex];
    if (!item) return { ok: false, message: 'No active bucket.' };
    set({ rejecting: true });
    const outcome = await bucketReceivingRepository.submitReject({
      bucketId: item.bucketId,
      farm: item.farm,
      greenhouse: item.greenhouse,
      variety: item.itemCode,
      quantity: params.quantity,
      reason: params.reason,
      notes: params.notes,
    });
    set({ rejecting: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({
      queue: s.queue.map((q, i) => (i === activeIndex ? { ...q, rejectQty: q.rejectQty + params.quantity } : q)),
    }));
    return { ok: true };
  },

  advanceReject: () => {
    set((s) => {
      const nextIndex = s.activeIndex + 1;
      const done = nextIndex >= s.queue.length;
      return {
        activeIndex: done ? 0 : nextIndex,
        phase: done ? 'transferring' : 'rejecting',
      };
    });
  },

  transfer: async (destinationBucketId) => {
    const { queue, activeIndex, usedDestinationBucketIds } = get();
    const item = queue[activeIndex];
    if (!item) return { ok: false, message: 'No active bucket.' };
    if (usedDestinationBucketIds.includes(destinationBucketId)) {
      return {
        ok: false,
        message: `${destinationBucketId} was already used as a destination in this batch — scan a different one.`,
      };
    }
    set({ transferring: true });
    const outcome = await bucketReceivingRepository.transferBucket({
      sourceBucketId: item.bucketId,
      destinationBucketId,
      qty: computeRemainingQty(item.receivedQty, item.rejectQty),
    });
    set({ transferring: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => {
      const nextIndex = s.activeIndex + 1;
      return {
        queue: s.queue.map((q, i) => (i === s.activeIndex ? { ...q, transferred: true } : q)),
        activeIndex: nextIndex,
        phase: nextIndex >= s.queue.length ? 'done' : 'transferring',
        usedDestinationBucketIds: [...s.usedDestinationBucketIds, destinationBucketId],
      };
    });
    return { ok: true };
  },

  reset: () => set({ ...initialState, queue: [], usedDestinationBucketIds: [] }),
}));
