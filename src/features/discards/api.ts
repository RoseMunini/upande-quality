import { api } from '@/src/core/api/client';

export type RawDiscardRequestStatus = 'Waiting' | 'Pending Approval';

export type RawDiscardPayload = {
  bucket_id?: string;
  variety?: string;
  greenhouse?: string;
  stems?: number;
  request?: string;
  request_status?: RawDiscardRequestStatus;
  coldroom_entry?: string;
  eligible_from?: string;
  hours_remaining?: number;
};

export type RawDiscardResponse = {
  data?: {
    // 'requested' — a QC Discard Request was raised; the actual discard only
    // happens once it's approved in the ERP after 72h in the coldroom.
    status?: 'requested' | 'failed' | 'error';
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
