import { gradingApi } from './api';

export type Variety = { name: string; itemName: string };

export type PassOutcome =
  | { kind: 'ok'; stockEntry: string; qty: number; variety: string }
  | { kind: 'error'; message: string };

export type RejectEntryResult = { reason: string; kind: 'ok' } | { reason: string; kind: 'error'; message: string };

export type VarietiesOutcome = { kind: 'ok'; varieties: Variety[] } | { kind: 'error'; message: string };

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

function errorMessage(res: { error?: string; message?: string }, fallback: string): string {
  return res.error || res.message || fallback;
}

export const gradingRepository = {
  async listVarieties(): Promise<VarietiesOutcome> {
    try {
      const res = await gradingApi.listVarieties();
      if (isFailure(res)) return { kind: 'error', message: res.error || 'Failed to load varieties.' };
      const varieties = (res.message ?? []).map((v) => ({ name: v.name, itemName: v.item_name || v.name }));
      return { kind: 'ok', varieties };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to load varieties.' };
    }
  },

  async passGrading(bunchId: string, gradedBy: string): Promise<PassOutcome> {
    try {
      const res = await gradingApi.passGrading({ bunchId, gradedBy });
      if (isFailure(res)) return { kind: 'error', message: errorMessage(res, 'Failed to pass grading.') };
      return { kind: 'ok', stockEntry: res.stock_entry ?? '', qty: res.qty ?? 0, variety: res.variety ?? '' };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to pass grading.' };
    }
  },

  /** Submits one reject Stock Entry per reason, sequentially, so a mid-batch
   *  failure doesn't lose track of which reasons already went through. */
  async submitRejects(
    variety: string,
    entries: { reason: string; quantity: number }[],
    notes: string,
  ): Promise<RejectEntryResult[]> {
    const results: RejectEntryResult[] = [];
    for (const entry of entries) {
      try {
        const res = await gradingApi.submitReject({
          variety,
          quantity: entry.quantity,
          reason: entry.reason,
          notes,
        });
        if (isFailure(res)) {
          results.push({ reason: entry.reason, kind: 'error', message: errorMessage(res, 'Failed to record reject.') });
        } else {
          results.push({ reason: entry.reason, kind: 'ok' });
        }
      } catch (err) {
        results.push({
          reason: entry.reason,
          kind: 'error',
          message: err instanceof Error ? err.message : 'Failed to record reject.',
        });
      }
    }
    return results;
  },
};
