import { traceabilityApi, type RawCurrent } from './api';

export type HistoryEvent = {
  stockEntry: string;
  event: string;
  eventTime: string;
  who: string;
  remarks: string;
  itemCode: string;
  qty: number;
  fromWarehouse: string;
  toWarehouse: string;
};

export type History = {
  kind: 'bucket' | 'bunch';
  refId: string;
  current: RawCurrent;
  events: HistoryEvent[];
};

export type HistoryOutcome = { kind: 'ok'; history: History } | { kind: 'error'; message: string };

function isFailure(res: { error?: string; http_status_code?: number }): boolean {
  return !!res.error || (typeof res.http_status_code === 'number' && res.http_status_code >= 400);
}

export const traceabilityRepository = {
  async getHistory(refId: string): Promise<HistoryOutcome> {
    try {
      const res = await traceabilityApi.getHistory(refId);
      if (isFailure(res)) return { kind: 'error', message: res.error || 'Lookup failed.' };
      if (res.exists === false || !res.current || !res.kind) {
        return { kind: 'error', message: res.message || `${refId} not found.` };
      }
      return {
        kind: 'ok',
        history: {
          kind: res.kind,
          refId: res.ref_id ?? refId,
          current: res.current,
          events: (res.events ?? []).map((e) => ({
            stockEntry: e.stock_entry,
            event: e.event,
            eventTime: e.event_time,
            who: e.graded_by_name || e.graded_by || e.owner,
            remarks: e.remarks ?? '',
            itemCode: e.item_code ?? '',
            qty: e.qty ?? 0,
            fromWarehouse: e.from_warehouse ?? '',
            toWarehouse: e.to_warehouse ?? '',
          })),
        },
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Lookup failed.' };
    }
  },
};
