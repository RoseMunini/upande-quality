import { create } from 'zustand';
import { receivingRepository } from './repository';

type Outcome =
  | { ok: true; variety: string; greenhouse: string; qty: number; overrideApplied: boolean }
  | { ok: false; message: string };

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

  // Balance: an end-of-harvest bucket carrying less than the item's standard
  // bucket rate. Only applies to unbunched receiving — mutually exclusive
  // with isBunched, since the backend override_qty path only runs there.
  isBalance: boolean;
  setIsBalance: (v: boolean) => void;
  balanceQty: string;
  setBalanceQty: (v: string) => void;
  resetBalanceSettings: () => void;

  receiving: boolean;
  receiveBucket: (bucketId: string) => Promise<Outcome>;
};

export const useReceivingStore = create<State>((set, get) => ({
  batchMode: false,
  setBatchMode: (v) => set({ batchMode: v }),

  isBunched: false,
  setIsBunched: (v) => set(v ? { isBunched: true, isBalance: false, balanceQty: '' } : { isBunched: false }),
  bunchSize: '',
  setBunchSize: (v) => set({ bunchSize: v }),
  numberOfBunches: '',
  setNumberOfBunches: (v) => set({ numberOfBunches: v }),
  resetBunchSettings: () => set({ isBunched: false, bunchSize: '', numberOfBunches: '' }),

  isBalance: false,
  setIsBalance: (v) => set(v ? { isBalance: true, isBunched: false } : { isBalance: false }),
  balanceQty: '',
  setBalanceQty: (v) => set({ balanceQty: v }),
  resetBalanceSettings: () => set({ isBalance: false, balanceQty: '' }),

  receiving: false,
  receiveBucket: async (bucketId) => {
    const { isBunched, bunchSize, numberOfBunches, isBalance, balanceQty } = get();
    set({ receiving: true });
    const outcome = await receivingRepository.receiveBucket({
      bucketId,
      isBunched,
      bunchSize: isBunched ? parseFloat(bunchSize) : undefined,
      numberOfBunches: isBunched ? parseFloat(numberOfBunches) : undefined,
      overrideQty: !isBunched && isBalance ? parseFloat(balanceQty) : undefined,
    });
    set({ receiving: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    if (!get().batchMode) {
      get().resetBunchSettings();
      get().resetBalanceSettings();
    }
    return {
      ok: true,
      variety: outcome.variety,
      greenhouse: outcome.greenhouse,
      qty: outcome.qty,
      overrideApplied: outcome.overrideApplied,
    };
  },
}));
