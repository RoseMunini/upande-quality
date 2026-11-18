import { discardsApi, type MethodResponse, type RawDiscardPayload, type RawDiscardResponse } from './api';

export type DiscardOutcome =
  | {
      kind: 'ok';
      bucketId: string;
      variety: string;
      stems: number;
      hoursOnShelf: number;
    }
  | { kind: 'error'; message: string };

export type BunchDiscardOutcome =
  | { kind: 'ok'; bunchId: string; variety: string; stems: number }
  | { kind: 'error'; message: string };

/** Bunch labels are BUNCH-<n>; coldroom bucket labels are plain numbers. */
export const isBunchId = (code: string) => /^BUNCH-/i.test(code.trim());

type Discarded = { error: string } | { payload: RawDiscardPayload };

const readDiscarded = (res: MethodResponse<RawDiscardResponse>, fallback: string): Discarded => {
  if (res.error) return { error: res.error };
  const data = res.data;
  if (!data || data.status !== 'discarded') {
    return { error: data?.message ?? fallback };
  }
  return { payload: data.payload ?? {} };
};

export const discardsRepository = {
  async discardBucket(bucketId: string): Promise<DiscardOutcome> {
    try {
      const r = readDiscarded(await discardsApi.discardBucket(bucketId), 'Failed to discard bucket.');
      if ('error' in r) return { kind: 'error', message: r.error };
      const payload = r.payload;
      return {
        kind: 'ok',
        bucketId: payload.bucket_id ?? bucketId,
        variety: payload.variety ?? '',
        stems: payload.stems ?? 0,
        hoursOnShelf: payload.hours_on_shelf ?? 0,
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to discard bucket.' };
    }
  },

  async discardBunch(bunchId: string): Promise<BunchDiscardOutcome> {
    try {
      const r = readDiscarded(await discardsApi.discardBunch(bunchId), 'Failed to discard bunch.');
      if ('error' in r) return { kind: 'error', message: r.error };
      const payload = r.payload;
      return {
        kind: 'ok',
        bunchId: payload.bunch_id ?? bunchId,
        variety: payload.variety ?? '',
        stems: payload.stems ?? 0,
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to discard bunch.' };
    }
  },
};
