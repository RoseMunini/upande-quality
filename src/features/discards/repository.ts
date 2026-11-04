import { discardsApi } from './api';

export type DiscardOutcome =
  | {
      kind: 'ok';
      bucketId: string;
      variety: string;
      stems: number;
      // true once the bucket has 72h in the coldroom and is waiting on the
      // approver; false while it's still counting down to 72h.
      pendingApproval: boolean;
      hoursRemaining: number;
    }
  | { kind: 'error'; message: string };

export const discardsRepository = {
  async discardBucket(bucketId: string): Promise<DiscardOutcome> {
    try {
      const res = await discardsApi.discardBucket(bucketId);
      if (res.error) return { kind: 'error', message: res.error };
      const data = res.data;
      if (!data || data.status !== 'requested') {
        return { kind: 'error', message: data?.message ?? 'Failed to mark bucket as a low-market reject.' };
      }
      const payload = data.payload ?? {};
      return {
        kind: 'ok',
        bucketId: payload.bucket_id ?? bucketId,
        variety: payload.variety ?? '',
        stems: payload.stems ?? 0,
        pendingApproval: payload.request_status === 'Pending Approval',
        hoursRemaining: payload.hours_remaining ?? 0,
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to mark bucket as a low-market reject.' };
    }
  },
};
