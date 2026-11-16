import { api } from '@/src/core/api/client';

export type RawDiscardPayload = {
  bucket_id?: string;
  variety?: string;
  greenhouse?: string;
  stems?: number;
  discard_entry?: string;
  shelved_at?: string;
  eligible_from?: string;
  hours_on_shelf?: number;
  hours_remaining?: number;
};

export type RawDiscardResponse = {
  data?: {
    // 'discarded' — the Discard stock entry was posted. Buckets under 24h on
    // the shelf come back as 'failed' with reason 'under_72h' (code kept from the old 72h rule).
    status?: 'discarded' | 'failed' | 'error';
    reason?: string;
    message?: string;
    payload?: RawDiscardPayload;
  };
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const discardsApi = {
  discardBucket(bucketId: string): Promise<MethodResponse<RawDiscardResponse>> {
    return api({
      method: 'POST',
      url: '/api/method/qc_discard_entry',
      data: { bucket_id: bucketId },
      validateStatus: () => true,
    });
  },
};
