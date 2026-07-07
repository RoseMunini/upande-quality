import { create } from 'zustand';

type ProfileDrawerState = {
  visible: boolean;
  open: () => void;
  close: () => void;
};

export const useProfileDrawerStore = create<ProfileDrawerState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));
