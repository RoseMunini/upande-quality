import { api } from '@/src/core/api/client';

export type RawBucketReceivingStatus = {
  exists?: boolean;
  status?: string;
  item_code?: string | null;
  greenhouse?: string | null;
  farm?: string | null;
  received_qty?: number;
  message?: string;
};

export type RawReceiveResult = {
  stock_entry_name?: string;
  variety?: string;
  greenhouse?: string;
  qty?: number;
  is_bunched?: boolean;
  message?: string;
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

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const bucketReceivingApi = {
  getBucketReceivingStatus(bucketId: string): Promise<MethodResponse<RawBucketReceivingStatus>> {
    return api({
      method: 'POST',
      url: '/api/method/get_bucket_receiving_status',
      data: { bucket_id: bucketId },
      validateStatus: () => true,
    });
  },

  receiveBucket(params: {
    bucketId: string;
    isBunched: boolean;
    bunchSize?: number;
    numberOfBunches?: number;
  }): Promise<MethodResponse<RawReceiveResult>> {
    return api({
      method: 'POST',
      url: '/api/method/receiving_entry',
      data: {
        bucket_id: params.bucketId,
        is_bunched: params.isBunched,
        bunch_size: params.bunchSize,
        number_of_bunches: params.numberOfBunches,
      },
      validateStatus: () => true,
    });
  },

  submitReject(params: {
    bucketId: string;
    farm?: string;
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
        section: 'receiving_reject',
        quantity: params.quantity,
        reason: params.reason,
        notes: params.notes,
        farm: params.farm,
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
};
