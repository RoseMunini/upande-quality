import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { useSettingsStore } from '@/src/core/features/settings/store';

const sources = {
  beep: require('@/assets/sounds/beep.wav'),
  submit: require('@/assets/sounds/submit.wav'),
  error: require('@/assets/sounds/error.wav'),
} as const;

type SoundKey = keyof typeof sources;

const players: Partial<Record<SoundKey, AudioPlayer>> = {};

function getPlayer(key: SoundKey): AudioPlayer {
  let p = players[key];
  if (!p) {
    p = createAudioPlayer(sources[key]);
    players[key] = p;
  }
  return p;
}

function enabled(): boolean {
  return useSettingsStore.getState().soundEnabled;
}

function play(key: SoundKey) {
  if (!enabled()) return;
  try {
    const p = getPlayer(key);
    p.seekTo(0);
    p.play();
  } catch {
    // Playback isn't critical to any flow — never let it interrupt a scan/submit.
  }
}

export const audio = {
  beep: () => play('beep'),
  submit: () => play('submit'),
  error: () => play('error'),
};
