import { create } from 'zustand';
import { shelvingRepository } from './repository';

type Outcome = { ok: true; variety: string; stems: number } | { ok: false; message: string };

type State = {
  shelfId: string | null;
  setShelf: (shelfId: string) => void;
  clearShelf: () => void;

  shelving: boolean;
  shelveBucket: (bucketId: string, farm: string) => Promise<Outcome>;
};

export const useShelvingStore = create<State>((set, get) => ({
  shelfId: null,
  setShelf: (shelfId) => set({ shelfId }),
  clearShelf: () => set({ shelfId: null }),

  shelving: false,
  shelveBucket: async (bucketId, farm) => {
    const { shelfId } = get();
    if (!shelfId) return { ok: false, message: 'Scan the shelf first.' };
    set({ shelving: true });
    const outcome = await shelvingRepository.shelveBucket({ shelfId, farm, bucketId });
    set({ shelving: false });
    if (outcome.kind === 'error') return { ok: false, message: outcome.message };
    return { ok: true, variety: outcome.variety, stems: outcome.stems };
  },
}));
