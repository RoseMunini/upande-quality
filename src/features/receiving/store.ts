import { create } from 'zustand';
import { receivingRepository } from './repository';

type Outcome =
  | { kind: 'ok'; variety: string; greenhouse: string; qty: number; overrideApplied: boolean }
  | { kind: 'needs_manual_qty'; variety: string; greenhouse: string }
  | { kind: 'error'; message: string };

type State = {
  // Settings below always persist across scans so the QC can scan bucket
  // after bucket without re-entering them — cleared only when the QC
  // changes them (or turns the toggle off) themselves.
  isBunched: boolean;
  setIsBunched: (v: boolean) => void;
  bunchSize: string;
  setBunchSize: (v: string) => void;
  numberOfBunches: string;
  setNumberOfBunches: (v: string) => void;

  // Balance: an end-of-harvest bucket carrying less than the item's standard
  // bucket rate. Only applies to unbunched receiving — mutually exclusive
  // with isBunched, since the backend override_qty path only runs there.
  isBalance: boolean;
  setIsBalance: (v: boolean) => void;
  balanceQty: string;
  setBalanceQty: (v: string) => void;

  receiving: boolean;
  /** manualQty, when passed, forces that exact stem count (uncapped) —
   *  used to resubmit a Spray Roses bucket after the backend reports it
   *  needs a manual count instead of using a fixed bucket rate. */
  receiveBucket: (bucketId: string, manualQty?: number) => Promise<Outcome>;
};

export const useReceivingStore = create<State>((set, get) => ({
  isBunched: false,
  setIsBunched: (v) => set(v ? { isBunched: true, isBalance: false, balanceQty: '' } : { isBunched: false }),
  bunchSize: '',
  setBunchSize: (v) => set({ bunchSize: v }),
  numberOfBunches: '',
  setNumberOfBunches: (v) => set({ numberOfBunches: v }),

  isBalance: false,
  setIsBalance: (v) => set(v ? { isBalance: true, isBunched: false } : { isBalance: false }),
  balanceQty: '',
  setBalanceQty: (v) => set({ balanceQty: v }),

  receiving: false,
  receiveBucket: async (bucketId, manualQty) => {
    const { isBunched, bunchSize, numberOfBunches, isBalance, balanceQty } = get();
    set({ receiving: true });
    const outcome = await receivingRepository.receiveBucket({
      bucketId,
      isBunched,
      bunchSize: isBunched ? parseFloat(bunchSize) : undefined,
      numberOfBunches: isBunched ? parseFloat(numberOfBunches) : undefined,
      overrideQty: manualQty ?? (!isBunched && isBalance ? parseFloat(balanceQty) : undefined),
    });
    set({ receiving: false });
    if (outcome.kind === 'error') return { kind: 'error', message: outcome.message };
    if (outcome.kind === 'needs_manual_qty') {
      return { kind: 'needs_manual_qty', variety: outcome.variety, greenhouse: outcome.greenhouse };
    }
    return {
      kind: 'ok',
      variety: outcome.variety,
      greenhouse: outcome.greenhouse,
      qty: outcome.qty,
      overrideApplied: outcome.overrideApplied,
    };
  },
}));
