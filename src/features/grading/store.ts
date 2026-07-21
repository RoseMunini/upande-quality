import { create } from 'zustand';
import { gradingRepository, type RejectEntryResult, type Variety } from './repository';

type PassResult = { ok: true; qty: number; variety: string } | { ok: false; message: string };
type Outcome = { ok: true } | { ok: false; message: string };

type State = {
  passing: boolean;
  rejecting: boolean;

  varieties: Variety[];
  varietiesLoading: boolean;
  varietiesError: string | null;
  loadVarieties: () => Promise<void>;

  graderName: string | null;
  graderLookupLoading: boolean;
  lookupGrader: (employeeId: string) => Promise<Outcome>;
  clearGrader: () => void;

  passGrading: (bunchId: string, gradedBy: string) => Promise<PassResult>;
  submitRejects: (
    variety: string,
    entries: { reason: string; quantity: number }[],
    notes: string,
  ) => Promise<RejectEntryResult[]>;
};

export const useGradingStore = create<State>((set, get) => ({
  passing: false,
  rejecting: false,

  varieties: [],
  varietiesLoading: false,
  varietiesError: null,

  graderName: null,
  graderLookupLoading: false,

  loadVarieties: async () => {
    if (get().varieties.length > 0 || get().varietiesLoading) return;
    set({ varietiesLoading: true, varietiesError: null });
    const outcome = await gradingRepository.listVarieties();
    if (outcome.kind === 'error') {
      set({ varietiesLoading: false, varietiesError: outcome.message });
      return;
    }
    set({ varieties: outcome.varieties, varietiesLoading: false, varietiesError: null });
  },

  lookupGrader: async (employeeId) => {
    set({ graderLookupLoading: true });
    const outcome = await gradingRepository.lookupEmployee(employeeId);
    set({ graderLookupLoading: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    set({ graderName: outcome.employeeName });
    return { ok: true };
  },

  clearGrader: () => set({ graderName: null }),

  passGrading: async (bunchId, gradedBy) => {
    set({ passing: true });
    const outcome = await gradingRepository.passGrading(bunchId, gradedBy);
    set({ passing: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    return { ok: true, qty: outcome.qty, variety: outcome.variety };
  },

  submitRejects: async (variety, entries, notes) => {
    set({ rejecting: true });
    const results = await gradingRepository.submitRejects(variety, entries, notes);
    set({ rejecting: false });
    return results;
  },
}));
