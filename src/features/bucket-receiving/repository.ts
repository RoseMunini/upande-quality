import { bucketReceivingApi } from './api';

export type FoundBucket = {
  bucketId: string;
  itemCode: string;
  farm: string;
  greenhouse: string;
  qty: number;
  stockEntryType: string;
};

export type SubmitOutcome = { kind: 'ok'; message?: string } | { kind: 'error'; message: string };

export type QuarantinedBucket = {
  bucketId: string;
  itemCode: string;
  greenhouse: string;
  qty: number;
  quarantinedAt: string;
};

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

function errorMessage(res: { error?: string; message?: string }, fallback: string): string {
  return res.error || res.message || fallback;
}

export const bucketReceivingRepository = {
  async searchRecentBucket(
    bucketId: string,
  ): Promise<{ kind: 'ok'; bucket: FoundBucket } | { kind: 'error'; message: string }> {
    try {
      const raw = await bucketReceivingApi.searchRecentBucket(bucketId);
      if (isFailure(raw)) return { kind: 'error', message: errorMessage(raw, 'Bucket search failed.') };
      if (raw.exists === false) return { kind: 'error', message: raw.message ?? 'Bucket not found.' };
      return {
        kind: 'ok',
        bucket: {
          bucketId: raw.bucket_id ?? bucketId,
          itemCode: raw.item_code ?? '',
          farm: raw.farm ?? '',
          greenhouse: raw.greenhouse ?? '',
          qty: raw.qty ?? 0,
          stockEntryType: raw.stock_entry_type ?? '',
        },
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to search bucket.' };
    }
  },

  async rejectBucket(params: { bucketId: string; quantity: number; reason: string; notes?: string }): Promise<SubmitOutcome> {
    try {
      const res = await bucketReceivingApi.rejectBucket(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to record reject.') };
      return { kind: 'ok', message: res.message };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to record reject.' };
    }
  },

  async submitQuarantineReject(params: {
    bucketId: string;
    greenhouse?: string;
    variety?: string;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<SubmitOutcome> {
    try {
      const res = await bucketReceivingApi.submitQuarantineReject(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to record reject.') };
      return { kind: 'ok', message: res.message };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to record reject.' };
    }
  },

  async transferBucket(params: {
    sourceBucketId: string;
    destinationBucketId: string;
    qty: number;
  }): Promise<SubmitOutcome> {
    try {
      const res = await bucketReceivingApi.transferBucket(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to transfer bucket.') };
      return { kind: 'ok', message: res.message };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to transfer bucket.' };
    }
  },

  async quarantineBucket(sourceBucketId: string): Promise<SubmitOutcome> {
    try {
      const res = await bucketReceivingApi.quarantineBucket(sourceBucketId);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to quarantine bucket.') };
      return { kind: 'ok', message: res.message };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to quarantine bucket.' };
    }
  },

  async listQuarantinedBuckets(): Promise<QuarantinedBucket[]> {
    try {
      const res = await bucketReceivingApi.listQuarantinedBuckets();
      return (res.message ?? []).map((q) => ({
        bucketId: q.bucket_id,
        itemCode: q.item_code ?? '',
        greenhouse: q.greenhouse ?? '',
        qty: q.qty ?? 0,
        quarantinedAt: q.quarantined_at,
      }));
    } catch {
      return [];
    }
  },
};
