import { bucketReceivingApi } from './api';

export type BucketStatus = {
  status: string;
  itemCode: string;
  greenhouse: string;
  farm: string;
  receivedQty: number;
};

export type SubmitOutcome = { kind: 'ok'; message?: string } | { kind: 'error'; message: string };

/** The qty to hand transfer_bucket — what actually remains after rejects. */
export function computeRemainingQty(receivedQty: number, rejectQty: number): number {
  return Math.max(receivedQty - rejectQty, 0);
}

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

function errorMessage(res: { error?: string; message?: string }, fallback: string): string {
  return res.error || res.message || fallback;
}

export const bucketReceivingRepository = {
  async loadStatus(
    bucketId: string,
  ): Promise<{ kind: 'ok'; status: BucketStatus } | { kind: 'error'; message: string }> {
    try {
      const raw = await bucketReceivingApi.getBucketReceivingStatus(bucketId);
      if (isFailure(raw)) return { kind: 'error', message: errorMessage(raw, 'Bucket lookup failed.') };
      if (raw.exists === false) return { kind: 'error', message: raw.message ?? 'Bucket not found.' };
      return {
        kind: 'ok',
        status: {
          status: raw.status ?? '',
          itemCode: raw.item_code ?? '',
          greenhouse: raw.greenhouse ?? '',
          farm: raw.farm ?? '',
          receivedQty: raw.received_qty ?? 0,
        },
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to look up bucket.' };
    }
  },

  async receiveBucket(params: {
    bucketId: string;
    isBunched: boolean;
    bunchSize?: number;
    numberOfBunches?: number;
  }): Promise<{ kind: 'ok'; qty: number; variety: string; greenhouse: string } | { kind: 'error'; message: string }> {
    try {
      const res = await bucketReceivingApi.receiveBucket(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to receive bucket.') };
      return { kind: 'ok', qty: res.qty ?? 0, variety: res.variety ?? '', greenhouse: res.greenhouse ?? '' };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to receive bucket.' };
    }
  },

  async submitReject(params: {
    bucketId: string;
    farm?: string;
    greenhouse?: string;
    variety?: string;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<SubmitOutcome> {
    try {
      const res = await bucketReceivingApi.submitReject(params);
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
};
