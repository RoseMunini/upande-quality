import { api } from '@/src/core/api/client';

export type RawBucketDetails = {
  bucket_id?: string;
  variety?: string | null;
  greenhouse?: string | null;
  farm?: string | null;
  found?: boolean;
  found_via?: string;
};

export type RawSibling = {
  name: string;
  bucket_id: string;
  decision: string;
  isolation_pending: 0 | 1;
};

export type RawPendingIsolation = {
  name: string;
  bucket_id: string;
  farm: string | null;
  greenhouse: string | null;
  variety: string | null;
  decision: string;
  isolation_source_inspection: string | null;
  isolation_requested_by: string | null;
  isolation_requested_at: string | null;
  source_bucket_id?: string | null;
};

export type InspectionSubmitPayload = {
  bucket_id: string;
  farm?: string;
  greenhouse?: string;
  variety?: string;
  is_high_risk?: boolean;
  duponchela: number;
  helicoverpa: number;
  spodoptera: number;
  fcm: number;
  maturity_stage?: string;
  chemical_residue_status?: 'Pass' | 'Fail';
  chemical_residue_notes?: string;
  blackening: number;
  damages: number;
  bent_stems: number;
  broken_stems: number;
  live_pest_or_disease?: boolean;
  live_pest_or_disease_notes?: string;
  leaf_chlorosis?: boolean;
  leaf_chlorosis_notes?: string;
  decision: 'Approved' | 'Rejected';
  decision_overridden?: boolean;
  override_reason?: string;
};

type MethodResponse<T extends object> = T & { error?: string; http_status_code?: number };

export const intakeQcInspectionApi = {
  getBucketDetails(bucketId: string): Promise<MethodResponse<{ message?: RawBucketDetails }>> {
    return api({
      method: 'POST',
      url: '/api/method/get_bucket_details',
      data: { bucket_id: bucketId },
      validateStatus: () => true,
    });
  },

  submitInspection(
    payload: InspectionSubmitPayload,
  ): Promise<MethodResponse<{ message?: string; name?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/submit_intake_qc_inspection',
      data: payload,
      validateStatus: () => true,
    });
  },

  findSiblings(params: {
    farm: string;
    greenhouse?: string;
    variety: string;
    inspectionDate: string;
    excludeBucketId: string;
  }): Promise<MethodResponse<{ message?: RawSibling[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/find_sibling_intake_inspections',
      data: {
        farm: params.farm,
        greenhouse: params.greenhouse,
        variety: params.variety,
        inspection_date: params.inspectionDate,
        exclude_bucket_id: params.excludeBucketId,
      },
      validateStatus: () => true,
    });
  },

  requestIsolationCascade(
    sourceInspection: string,
    siblingNames: string[],
  ): Promise<MethodResponse<{ message?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/request_isolation_cascade',
      data: { source_inspection: sourceInspection, sibling_names: siblingNames },
      validateStatus: () => true,
    });
  },

  listPendingIsolations(): Promise<MethodResponse<{ message?: RawPendingIsolation[] }>> {
    return api({
      method: 'POST',
      url: '/api/method/list_pending_isolations',
      validateStatus: () => true,
    });
  },

  approveIsolation(
    names: string[],
    action: 'approve' | 'dismiss',
  ): Promise<MethodResponse<{ message?: string }>> {
    return api({
      method: 'POST',
      url: '/api/method/approve_isolation',
      data: { names, action },
      validateStatus: () => true,
    });
  },
};
