import { api } from '@/src/core/api/client';

export type RawReceiveResult = {
  stock_entry_name?: string;
  variety?: string;
  greenhouse?: string;
  qty?: number;
  is_bunched?: boolean;
  message?: string;
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const receivingApi = {
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
};
