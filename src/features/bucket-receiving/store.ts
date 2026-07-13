import { create } from 'zustand';
import { bucketReceivingRepository, type BucketStatus, type QuarantinedBucket } from './repository';

type Outcome = { ok: true } | { ok: false; message: string };

export type QueueItem = {
  bucketId: string;
  itemCode: string;
  greenhouse: string;
  farm: string;
  receivedQty: number;
  /** Set once transfer runs for this item — what was actually moved. */
  transferQty: number;
  /** Derived at transfer time: receivedQty - transferQty. The fixed total
   *  the reject-reasons step for this item must account for. */
  rejectQty: number;
  transferred: boolean;
  rejected: boolean;
  /** Sent to quarantine instead of transferred/rejected — its fate is
   *  decided later in Quarantine Review, so it skips the reject step here. */
  quarantined: boolean;
};

type Phase = 'receiving' | 'transferring' | 'rejecting' | 'done';

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
  quarantining: boolean;

  /** Destination buckets already transferred into this batch. Cleared on
   *  reset() — this only stops reusing one twice within the same batch,
   *  not across batches, since coldroom buckets are physically reusable. */
  usedDestinationBucketIds: string[];

  scanBucket: (bucketId: string) => Promise<Outcome>;
  clearScanStatus: () => void;
  receive: (params: { isBunched: boolean; bunchSize?: number; numberOfBunches?: number }) => Promise<Outcome>;
  enqueueInUse: () => void;

  /** Move from receiving into the transfer pass over the whole queue. */
  startTransferring: () => void;
  /** transferQty is what's physically moved for the active item — decided
   *  by the QC, since rejects were already set aside before the move.
   *  qty === 0 skips the destination scan entirely (whole bucket rejected). */
  transfer: (transferQty: number, destinationBucketId?: string) => Promise<Outcome>;
  /** Sends the whole active item to quarantine instead of transferring or
   *  rejecting it now — its accept/reject fate is decided later. */
  quarantineActiveItem: () => Promise<Outcome>;

  /** Submits one reject entry per reason for the active item, then advances.
   *  Always shown for every item — pass an empty array to move on with
   *  nothing to report. */
  submitItemRejects: (entries: { reason: string; quantity: number }[], notes?: string) => Promise<Outcome>;

  // Quarantine Review — independent of the batch queue above; can review
  // buckets quarantined in a previous session too.
  quarantineList: QuarantinedBucket[];
  quarantineListLoading: boolean;
  loadQuarantineList: () => Promise<void>;
  releaseAsTransfer: (bucketId: string, qty: number, destinationBucketId: string) => Promise<Outcome>;
  releaseAsReject: (
    bucketId: string,
    entries: { reason: string; quantity: number }[],
    notes?: string,
  ) => Promise<Outcome>;

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
  quarantining: false,
  usedDestinationBucketIds: [] as string[],
  quarantineList: [] as QuarantinedBucket[],
  quarantineListLoading: false,
};

function advanceQueueIndex(activeIndex: number, queueLength: number, currentPhase: Phase): { activeIndex: number; phase: Phase } {
  const nextIndex = activeIndex + 1;
  if (nextIndex < queueLength) return { activeIndex: nextIndex, phase: currentPhase };
  if (currentPhase === 'transferring') return { activeIndex: 0, phase: 'rejecting' };
  return { activeIndex: 0, phase: 'done' };
}

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
          transferQty: 0,
          rejectQty: 0,
          transferred: false,
          rejected: false,
          quarantined: false,
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
          transferQty: 0,
          rejectQty: 0,
          transferred: false,
          rejected: false,
          quarantined: false,
        },
      ],
      scanStatus: null,
      scannedBucketId: '',
    }));
  },

  startTransferring: () => {
    if (get().queue.length === 0) return;
    set({ phase: 'transferring', activeIndex: 0 });
  },

  transfer: async (transferQty, destinationBucketId) => {
    const { queue, activeIndex, usedDestinationBucketIds } = get();
    const item = queue[activeIndex];
    if (!item) return { ok: false, message: 'No active bucket.' };
    const rejectQty = Math.max(item.receivedQty - transferQty, 0);

    if (transferQty <= 0) {
      set((s) => ({
        queue: s.queue.map((q, i) => (i === activeIndex ? { ...q, transferQty: 0, rejectQty: item.receivedQty, transferred: true } : q)),
        ...advanceQueueIndex(activeIndex, s.queue.length, 'transferring'),
      }));
      return { ok: true };
    }

    if (!destinationBucketId) return { ok: false, message: 'Scan a destination bucket.' };
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
      qty: transferQty,
    });
    set({ transferring: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({
      queue: s.queue.map((q, i) => (i === activeIndex ? { ...q, transferQty, rejectQty, transferred: true } : q)),
      usedDestinationBucketIds: [...s.usedDestinationBucketIds, destinationBucketId],
      ...advanceQueueIndex(activeIndex, s.queue.length, 'transferring'),
    }));
    return { ok: true };
  },

  quarantineActiveItem: async () => {
    const { queue, activeIndex } = get();
    const item = queue[activeIndex];
    if (!item) return { ok: false, message: 'No active bucket.' };
    set({ quarantining: true });
    const outcome = await bucketReceivingRepository.quarantineBucket(item.bucketId);
    set({ quarantining: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set((s) => ({
      queue: s.queue.map((q, i) =>
        i === activeIndex ? { ...q, quarantined: true, transferred: true, rejected: true, rejectQty: 0 } : q,
      ),
      ...advanceQueueIndex(activeIndex, s.queue.length, 'transferring'),
    }));
    return { ok: true };
  },

  submitItemRejects: async (entries, notes) => {
    const { queue, activeIndex } = get();
    const item = queue[activeIndex];
    if (!item) return { ok: false, message: 'No active bucket.' };
    set({ rejecting: true });
    for (const entry of entries) {
      const outcome = await bucketReceivingRepository.submitReject({
        bucketId: item.bucketId,
        farm: item.farm,
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
      queue: s.queue.map((q, i) => (i === activeIndex ? { ...q, rejected: true } : q)),
      ...advanceQueueIndex(activeIndex, s.queue.length, 'rejecting'),
    }));
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
      const outcome = await bucketReceivingRepository.submitReject({
        bucketId,
        greenhouse: item.greenhouse,
        variety: item.itemCode,
        quantity: entry.quantity,
        reason: entry.reason,
        notes,
        section: 'quarantine_reject',
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

  reset: () => set({ ...initialState, queue: [], usedDestinationBucketIds: [] }),
}));
