import { shelvingApi } from './api';

export type ShelveOutcome =
  | { kind: 'ok'; bucketId: string; variety: string; stems: number }
  | { kind: 'error'; message: string };

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

function errorMessage(res: { error?: string; message?: string }, fallback: string): string {
  return res.error || res.message || fallback;
}

export const shelvingRepository = {
  async shelveBucket(params: { shelfId: string; farm: string; bucketId: string }): Promise<ShelveOutcome> {
    try {
      const res = await shelvingApi.shelveBucket(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to shelve bucket.') };
      return {
        kind: 'ok',
        bucketId: res.bucket_id ?? params.bucketId,
        variety: res.variety ?? '',
        stems: res.stems ?? 0,
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to shelve bucket.' };
    }
  },
};
