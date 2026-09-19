// Lightweight Web Audio synthesis — no audio files to ship. A single
// shared AudioContext is created lazily on first use (browsers block audio
// until a user gesture has happened, which every caller here is already
// downstream of — a button click, a save attempt, etc).
let sharedAudioCtx = null;
export function getAudioCtx() {
  if (!sharedAudioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    sharedAudioCtx = new Ctx();
  }
  if (sharedAudioCtx.state === "suspended") sharedAudioCtx.resume();
  return sharedAudioCtx;
}
export function playTone(freq, startOffset, duration, type, peakGain) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + startOffset;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(peakGain, t0 + 0.015);
  gain.gain.linearRampToValueAtTime(0, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}
// Alarm popup: a two-note ascending chime, like a doorbell.
export function playAlarmChime() {
  playTone(880, 0, 0.15, "sine", 0.18);
  playTone(1108, 0.13, 0.22, "sine", 0.18);
}
// Toast notification: a single soft, quick pop — lighter than the alarm.
export function playToastPop() {
  playTone(660, 0, 0.1, "sine", 0.12);
}
// Invalid input / failed save: a low double-beep, distinct "no" sound.
export function playErrorBeep() {
  playTone(220, 0, 0.08, "triangle", 0.15);
  playTone(220, 0.12, 0.08, "triangle", 0.15);
}
