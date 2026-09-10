import { api } from '@/src/core/api/client';

export type RawDiscardPayload = {
  bucket_id?: string;
  age_days?: number;
  variety?: string;
  greenhouse?: string;
  stems?: number;
  discard_entry?: string;
};

export type RawDiscardResponse = {
  data?: {
    status?: 'success' | 'failed' | 'error';
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
