import { create } from 'zustand';
import type { InspectionSubmitPayload } from './api';
import {
  intakeQcInspectionRepository,
  suggestDecision,
  type Decision,
  type LotInfo,
  type PendingIsolation,
  type Sibling,
  type SubmitOutcome,
} from './repository';

export type InspectionForm = {
  duponchela: string;
  helicoverpa: string;
  spodoptera: string;
  fcm: string;
  maturityStage: string;
  chemicalResidueStatus: 'Pass' | 'Fail' | '';
  chemicalResidueNotes: string;
  blackening: string;
  damages: string;
  bentStems: string;
  brokenStems: string;
  livePestOrDisease: boolean;
  livePestOrDiseaseNotes: string;
  leafChlorosis: boolean;
  leafChlorosisNotes: string;
  isHighRisk: boolean;
};

export const emptyInspectionForm: InspectionForm = {
  duponchela: '',
  helicoverpa: '',
  spodoptera: '',
  fcm: '',
  maturityStage: '',
  chemicalResidueStatus: '',
  chemicalResidueNotes: '',
  blackening: '',
  damages: '',
  bentStems: '',
  brokenStems: '',
  livePestOrDisease: false,
  livePestOrDiseaseNotes: '',
  leafChlorosis: false,
  leafChlorosisNotes: '',
  isHighRisk: false,
};

function toInt(value: string): number {
  return parseInt(value || '0', 10) || 0;
}

type State = {
  lot: LotInfo | null;
  lotLoading: boolean;

  siblings: Sibling[];
  siblingsLoading: boolean;

  submitting: boolean;

  pendingIsolations: PendingIsolation[];
  pendingIsolationsLoading: boolean;
  approving: boolean;

  loadLot: (bucketId: string) => Promise<{ ok: boolean; message?: string }>;
  clearLot: () => void;

  findSiblingsForReject: () => Promise<Sibling[]>;

  submitInspection: (
    form: InspectionForm,
    decision: Decision,
    overrideReason: string | undefined,
  ) => Promise<SubmitOutcome>;
  requestIsolationCascade: (sourceInspection: string, siblingNames: string[]) => Promise<SubmitOutcome>;

  loadPendingIsolations: () => Promise<void>;
  approveIsolation: (names: string[], action: 'approve' | 'dismiss') => Promise<SubmitOutcome>;
};

export const useIntakeQcInspectionStore = create<State>((set, get) => ({
  lot: null,
  lotLoading: false,
  siblings: [],
  siblingsLoading: false,
  submitting: false,
  pendingIsolations: [],
  pendingIsolationsLoading: false,
  approving: false,

  loadLot: async (bucketId) => {
    set({ lotLoading: true });
    const outcome = await intakeQcInspectionRepository.loadLot(bucketId);
    if (outcome.kind === 'ok') {
      set({ lot: outcome.lot, lotLoading: false, siblings: [] });
      return { ok: true };
    }
    set({ lotLoading: false });
    return { ok: false, message: outcome.message };
  },

  clearLot: () => set({ lot: null, siblings: [] }),

  findSiblingsForReject: async () => {
    const { lot } = get();
    if (!lot) return [];
    set({ siblingsLoading: true });
    const siblings = await intakeQcInspectionRepository.findSiblings({
      farm: lot.farm,
      greenhouse: lot.greenhouse,
      variety: lot.variety,
      inspectionDate: new Date().toISOString().slice(0, 10),
      excludeBucketId: lot.bucketId,
    });
    set({ siblings, siblingsLoading: false });
    return siblings;
  },

  submitInspection: async (form, decision, overrideReason) => {
    const { lot } = get();
    if (!lot) return { kind: 'error', message: 'No lot loaded.' };
    set({ submitting: true });

    const fcm = toInt(form.fcm);
    const suggested = suggestDecision(fcm);
    const overridden = suggested !== null && suggested !== decision;

    const payload: InspectionSubmitPayload = {
      bucket_id: lot.bucketId,
      farm: lot.farm,
      greenhouse: lot.greenhouse,
      variety: lot.variety,
      is_high_risk: form.isHighRisk,
      duponchela: toInt(form.duponchela),
      helicoverpa: toInt(form.helicoverpa),
      spodoptera: toInt(form.spodoptera),
      fcm,
      maturity_stage: form.maturityStage,
      chemical_residue_status: form.chemicalResidueStatus || undefined,
      chemical_residue_notes: form.chemicalResidueNotes,
      blackening: toInt(form.blackening),
      damages: toInt(form.damages),
      bent_stems: toInt(form.bentStems),
      broken_stems: toInt(form.brokenStems),
      live_pest_or_disease: form.livePestOrDisease,
      live_pest_or_disease_notes: form.livePestOrDiseaseNotes,
      leaf_chlorosis: form.leafChlorosis,
      leaf_chlorosis_notes: form.leafChlorosisNotes,
      decision: decision === 'approve' ? 'Approved' : 'Rejected',
      decision_overridden: overridden,
      override_reason: overridden ? overrideReason : undefined,
    };

    const outcome = await intakeQcInspectionRepository.submitInspection(payload);
    set({ submitting: false });
    return outcome;
  },

  requestIsolationCascade: async (sourceInspection, siblingNames) => {
    return intakeQcInspectionRepository.requestIsolationCascade(sourceInspection, siblingNames);
  },

  loadPendingIsolations: async () => {
    set({ pendingIsolationsLoading: true });
    const rows = await intakeQcInspectionRepository.listPendingIsolations();
    set({ pendingIsolations: rows, pendingIsolationsLoading: false });
  },

  approveIsolation: async (names, action) => {
    set({ approving: true });
    const outcome = await intakeQcInspectionRepository.approveIsolation(names, action);
    set({ approving: false });
    if (outcome.kind === 'ok') {
      set((s) => ({ pendingIsolations: s.pendingIsolations.filter((p) => !names.includes(p.name)) }));
    }
    return outcome;
  },
}));
