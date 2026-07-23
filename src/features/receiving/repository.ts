import { receivingApi } from './api';

export type ReceiveOutcome =
  | { kind: 'ok'; variety: string; greenhouse: string; qty: number }
  | { kind: 'error'; message: string };

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

function errorMessage(res: { error?: string; message?: string }, fallback: string): string {
  return res.error || res.message || fallback;
}

export const receivingRepository = {
  async receiveBucket(params: {
    bucketId: string;
    isBunched: boolean;
    bunchSize?: number;
    numberOfBunches?: number;
  }): Promise<ReceiveOutcome> {
    try {
      const res = await receivingApi.receiveBucket(params);
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to receive bucket.') };
      return { kind: 'ok', variety: res.variety ?? '', greenhouse: res.greenhouse ?? '', qty: res.qty ?? 0 };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to receive bucket.' };
    }
  },
};
