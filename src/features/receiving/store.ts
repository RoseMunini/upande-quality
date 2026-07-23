import { create } from 'zustand';
import { receivingRepository } from './repository';

type Outcome = { ok: true; variety: string; greenhouse: string; qty: number } | { ok: false; message: string };

type State = {
  // Batch mode: settings below persist across scans so the QC can scan
  // bucket after bucket without re-entering them. Single mode: settings
  // reset back to defaults after each receive.
  batchMode: boolean;
  setBatchMode: (v: boolean) => void;

  isBunched: boolean;
  setIsBunched: (v: boolean) => void;
  bunchSize: string;
  setBunchSize: (v: string) => void;
  numberOfBunches: string;
  setNumberOfBunches: (v: string) => void;
  resetBunchSettings: () => void;

  receiving: boolean;
  receiveBucket: (bucketId: string) => Promise<Outcome>;
};

export const useReceivingStore = create<State>((set, get) => ({
  batchMode: false,
  setBatchMode: (v) => set({ batchMode: v }),

  isBunched: false,
  setIsBunched: (v) => set({ isBunched: v }),
  bunchSize: '',
  setBunchSize: (v) => set({ bunchSize: v }),
  numberOfBunches: '',
  setNumberOfBunches: (v) => set({ numberOfBunches: v }),
  resetBunchSettings: () => set({ isBunched: false, bunchSize: '', numberOfBunches: '' }),

  receiving: false,
  receiveBucket: async (bucketId) => {
    const { isBunched, bunchSize, numberOfBunches } = get();
    set({ receiving: true });
    const outcome = await receivingRepository.receiveBucket({
      bucketId,
      isBunched,
      bunchSize: isBunched ? parseFloat(bunchSize) : undefined,
      numberOfBunches: isBunched ? parseFloat(numberOfBunches) : undefined,
    });
    set({ receiving: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    if (!get().batchMode) get().resetBunchSettings();
    return { ok: true, variety: outcome.variety, greenhouse: outcome.greenhouse, qty: outcome.qty };
  },
}));
