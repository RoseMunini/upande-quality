// TEMPORARY STUB — the extracted zip has no beep.mp3/submit.mp3/error.mp3
// assets, so this can't require() them (Metro resolves require() at bundle
// time, so it can't be conditional). All three call sites (Toast success/
// error, ScanField beep) still work, they just play no sound.
//
// To restore real audio feedback: pull beep.mp3, submit.mp3, error.mp3 from
// the upande-quality repo's assets folder into this project's /assets, then
// replace this file with:
//
//   import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
//   const sources = {
//     beep: require('@/assets/beep.mp3'),
//     submit: require('@/assets/submit.mp3'),
//     error: require('@/assets/error.mp3'),
//   } as const;
//   type SoundKey = keyof typeof sources;
//   const players: Partial<Record<SoundKey, AudioPlayer>> = {};
//   function getPlayer(key: SoundKey): AudioPlayer {
//     let p = players[key];
//     if (!p) { p = createAudioPlayer(sources[key]); players[key] = p; }
//     return p;
//   }
//   function play(key: SoundKey) {
//     try { const p = getPlayer(key); p.seekTo(0); p.play(); } catch {}
//   }
//   export const audio = {
//     beep: () => play('beep'),
//     submit: () => play('submit'),
//     error: () => play('error'),
//   };

export const audio = {
  beep: () => {},
  submit: () => {},
  error: () => {},
};
