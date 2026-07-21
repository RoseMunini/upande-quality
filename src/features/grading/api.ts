import { api } from '@/src/core/api/client';

export type RawPassResult = {
  stock_entry?: string;
  qty?: number;
  variety?: string;
  message?: string;
};

export type RawRejectResult = {
  stock_entry?: string;
  message?: string;
};

export type RawVariety = {
  name: string;
  item_name: string;
};

export type RawEmployeeLookup = {
  exists?: boolean;
  employee_id?: string;
  employee_name?: string;
  message?: string;
};

export type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const gradingApi = {
  listVarieties(): Promise<MethodResponse<{ message?: RawVariety[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/list_item_varieties',
      validateStatus: () => true,
    });
  },

  lookupEmployee(employeeId: string): Promise<MethodResponse<RawEmployeeLookup>> {
    return api({
      method: 'POST',
      url: '/api/method/lookup_employee',
      data: { employee_id: employeeId },
      validateStatus: () => true,
    });
  },

  passGrading(params: { bunchId: string; gradedBy: string }): Promise<MethodResponse<RawPassResult>> {
    return api({
      method: 'POST',
      url: '/api/method/mobile_grading_entry',
      data: { bunch_id: params.bunchId, graded_by: params.gradedBy },
      validateStatus: () => true,
    });
  },

  submitReject(params: {
    variety: string;
    quantity: number;
    reason: string;
    notes?: string;
  }): Promise<MethodResponse<RawRejectResult>> {
    return api({
      method: 'POST',
      url: '/api/method/create_quality_entry',
      data: {
        section: 'grading_reject',
        quantity: params.quantity,
        reason: params.reason,
        notes: params.notes,
        variety: params.variety,
      },
      validateStatus: () => true,
    });
  },
};
