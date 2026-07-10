import { intakeQcInspectionApi, type InspectionSubmitPayload, type RawPendingIsolation, type RawSibling } from './api';

export type LotInfo = {
  bucketId: string;
  variety: string;
  farm: string;
  greenhouse: string;
};

export type Decision = 'approve' | 'reject';

export type Sibling = {
  name: string;
  bucketId: string;
  decision: string;
};

export type PendingIsolation = {
  name: string;
  bucketId: string;
  farm: string;
  variety: string;
  sourceBucketId: string;
  requestedAt: string;
};

export type SubmitOutcome = { kind: 'ok'; name: string } | { kind: 'error'; message: string };

/**
 * FCM=0 -> approve, FCM>1 -> reject, per the Xpressions Flora Intake QC SOP.
 * FCM===1 is left genuinely undefined by the SOP's own wording, so this
 * returns null rather than guessing — the form shows no pre-selected
 * suggestion and the inspector's choice doesn't count as an override.
 */
export function suggestDecision(fcm: number): Decision | null {
  if (fcm === 0) return 'approve';
  if (fcm > 1) return 'reject';
  return null;
}

export const intakeQcInspectionRepository = {
  async loadLot(bucketId: string): Promise<{ kind: 'ok'; lot: LotInfo } | { kind: 'error'; message: string }> {
    try {
      const raw = await intakeQcInspectionApi.getBucketDetails(bucketId);
      if (raw.error) return { kind: 'error', message: raw.error };
      if (raw.found === false) return { kind: 'error', message: 'Bucket not found.' };
      return {
        kind: 'ok',
        lot: {
          bucketId: raw.bucket_id ?? bucketId,
          variety: raw.variety ?? '',
          farm: raw.farm ?? '',
          greenhouse: raw.greenhouse ?? '',
        },
      };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to load bucket.' };
    }
  },

  async submitInspection(payload: InspectionSubmitPayload): Promise<SubmitOutcome> {
    try {
      const res = await intakeQcInspectionApi.submitInspection(payload);
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name: res.name ?? '' };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Submit failed.' };
    }
  },

  async findSiblings(args: {
    farm: string;
    greenhouse?: string;
    variety: string;
    inspectionDate: string;
    excludeBucketId: string;
  }): Promise<Sibling[]> {
    try {
      const res = await intakeQcInspectionApi.findSiblings(args);
      return (res.message ?? []).map((s: RawSibling) => ({
        name: s.name,
        bucketId: s.bucket_id,
        decision: s.decision,
      }));
    } catch {
      return [];
    }
  },

  async requestIsolationCascade(sourceInspection: string, siblingNames: string[]): Promise<SubmitOutcome> {
    try {
      const res = await intakeQcInspectionApi.requestIsolationCascade(sourceInspection, siblingNames);
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name: sourceInspection };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to request isolation.' };
    }
  },

  async listPendingIsolations(): Promise<PendingIsolation[]> {
    try {
      const res = await intakeQcInspectionApi.listPendingIsolations();
      return (res.message ?? []).map((r: RawPendingIsolation) => ({
        name: r.name,
        bucketId: r.bucket_id,
        farm: r.farm ?? '',
        variety: r.variety ?? '',
        sourceBucketId: r.source_bucket_id ?? '',
        requestedAt: r.isolation_requested_at ?? '',
      }));
    } catch {
      return [];
    }
  },

  async approveIsolation(names: string[], action: 'approve' | 'dismiss'): Promise<SubmitOutcome> {
    try {
      const res = await intakeQcInspectionApi.approveIsolation(names, action);
      if (res.error) return { kind: 'error', message: res.error };
      return { kind: 'ok', name: names.join(',') };
    } catch (err) {
      return { kind: 'error', message: err instanceof Error ? err.message : 'Failed to update isolation.' };
    }
  },
};
