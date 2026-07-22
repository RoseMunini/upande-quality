import { api } from '@/src/core/api/client';

export type RawSearchResult = {
  exists?: boolean;
  message?: string;
  bucket_id?: string;
  item_code?: string | null;
  farm?: string | null;
  greenhouse?: string | null;
  qty?: number;
  stock_entry_type?: string;
  current_warehouse?: string;
};

export type RawRejectResult = {
  stock_entry?: string;
  message?: string;
};

export type RawTransferResult = {
  stock_entry_name?: string;
  from_bucket?: string;
  to_bucket?: string;
  variety?: string;
  greenhouse?: string;
  item_code?: string;
  qty?: number;
  message?: string;
};

export type RawQuarantineResult = {
  stock_entry_name?: string;
  bucket_id?: string;
  variety?: string;
  greenhouse?: string;
  item_code?: string;
  qty?: number;
  message?: string;
};

export type RawQuarantinedBucket = {
  bucket_id: string;
  stock_entry: string;
  quarantined_at: string;
  item_code: string;
  qty: number;
  greenhouse: string | null;
  variety: string | null;
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const bucketReceivingApi = {
  searchRecentBucket(bucketId: string): Promise<MethodResponse<RawSearchResult>> {
    return api({
      method: 'POST',
      url: '/api/method/search_recent_bucket',
      data: { bucket_id: bucketId },
      validateStatus: () => true,
    });
  },

  rejectBucket(params: {
    bucketId: string;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<MethodResponse<RawRejectResult>> {
    return api({
      method: 'POST',
      url: '/api/method/reject_bucket_qc',
      data: {
        bucket_id: params.bucketId,
        quantity: params.quantity,
        reason: params.reason,
        notes: params.notes,
      },
      validateStatus: () => true,
    });
  },

  /** Used only by Quarantine Review's reject-release — the bucket is known
   *  to be sitting in the quarantine warehouse at that point. */
  submitQuarantineReject(params: {
    bucketId: string;
    greenhouse?: string;
    variety?: string;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<MethodResponse<RawRejectResult>> {
    return api({
      method: 'POST',
      url: '/api/method/create_quality_entry',
      data: {
        section: 'quarantine_reject',
        quantity: params.quantity,
        reason: params.reason,
        notes: params.notes,
        greenhouse: params.greenhouse,
        variety: params.variety,
        ref_id: params.bucketId,
      },
      validateStatus: () => true,
    });
  },

  transferBucket(params: {
    sourceBucketId: string;
    destinationBucketId: string;
    qty: number;
  }): Promise<MethodResponse<RawTransferResult>> {
    return api({
      method: 'POST',
      url: '/api/method/transfer_bucket',
      data: {
        source_bucket_id: params.sourceBucketId,
        destination_bucket_id: params.destinationBucketId,
        qty: params.qty,
      },
      validateStatus: () => true,
    });
  },

  quarantineBucket(sourceBucketId: string, qty?: number): Promise<MethodResponse<RawQuarantineResult>> {
    return api({
      method: 'POST',
      url: '/api/method/quarantine_bucket',
      data: { source_bucket_id: sourceBucketId, qty },
      validateStatus: () => true,
    });
  },

  listQuarantinedBuckets(): Promise<MethodResponse<{ message?: RawQuarantinedBucket[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/list_quarantined_buckets',
      validateStatus: () => true,
    });
  },
};
