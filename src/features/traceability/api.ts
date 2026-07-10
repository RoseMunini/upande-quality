import { api } from '@/src/core/api/client';

export type RawCurrent = {
  item_code?: string | null;
  greenhouse?: string | null;
  status?: string | null;
  farm?: string | null;
  bunch_size?: number | null;
  stem_length?: string | null;
};

export type RawEvent = {
  stock_entry: string;
  event: string;
  event_time: string;
  owner: string;
  graded_by?: string | null;
  graded_by_name?: string | null;
  remarks?: string | null;
  farm?: string | null;
  greenhouse?: string | null;
  item_code?: string | null;
  qty?: number | null;
  from_warehouse?: string | null;
  to_warehouse?: string | null;
};

export type RawTraceability = {
  exists?: boolean;
  message?: string;
  kind?: 'bucket' | 'bunch';
  ref_id?: string;
  current?: RawCurrent;
  events?: RawEvent[];
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const traceabilityApi = {
  getHistory(refId: string): Promise<MethodResponse<RawTraceability>> {
    return api({
      method: 'POST',
      url: '/api/method/get_traceability_history',
      data: { ref_id: refId },
      validateStatus: () => true,
    });
  },
};
