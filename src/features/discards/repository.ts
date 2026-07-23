import { discardsApi } from './api';

export type DiscardOutcome =
  | { kind: 'ok'; bucketId: string; variety: string; stems: number }
  | { kind: 'error'; message: string };

export const discardsRepository = {
  async discardBucket(bucketId: string): Promise<DiscardOutcome> {
    try {
      const res = await discardsApi.discardBucket(bucketId);
      if (res.error) return { kind: 'error', message: res.error };
      const data = res.data;
      if (!data || data.status !== 'success') {
        return { kind: 'error', message: data?.message ?? 'Failed to discard bucket.' };
      }
      const payload = data.payload ?? {};
      return {
        kind: 'ok',
        bucketId: payload.bucket_id ?? bucketId,
        variety: payload.variety ?? '',
        stems: payload.stems ?? 0,
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to discard bucket.' };
    }
  },
};
