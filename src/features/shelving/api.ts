import { api } from '@/src/core/api/client';

export type RawShelveResult = {
  shelf_id?: string;
  bucket_id?: string;
  item_code?: string;
  variety?: string;
  stem_length?: string;
  greenhouse?: string;
  stems?: number;
  duplicate?: number;
  message?: string;
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const shelvingApi = {
  shelveBucket(params: {
    shelfId: string;
    farm: string;
    bucketId: string;
  }): Promise<MethodResponse<RawShelveResult>> {
    return api({
      method: 'POST',
      url: '/api/method/shelving_entry',
      data: { shelf_id: params.shelfId, farm: params.farm, bucket_id: params.bucketId },
      validateStatus: () => true,
    });
  },
};
