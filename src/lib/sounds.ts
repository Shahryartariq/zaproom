import type { SoundId } from "./settings";

/**
 * Notification sounds are synthesised with the Web Audio API: no audio files to
 * download and no licences to worry about. Each is under half a second.
 */

type Note = { freq: number; at: number; dur: number; type?: OscillatorType; gain?: number; to?: number };

const RECIPES: Record<Exclude<SoundId, "none">, Note[]> = {
  ting: [
    { freq: 1568, at: 0, dur: 0.45, type: "sine", gain: 0.5 },
    { freq: 3136, at: 0, dur: 0.25, type: "sine", gain: 0.12 },
  ],
  pop: [{ freq: 720, to: 240, at: 0, dur: 0.09, type: "sine", gain: 0.7 }],
  chime: [
    { freq: 880, at: 0, dur: 0.35, type: "triangle", gain: 0.45 },
    { freq: 1320, at: 0.12, dur: 0.4, type: "triangle", gain: 0.4 },
  ],
  bubble: [
    { freq: 320, to: 980, at: 0, dur: 0.12, type: "sine", gain: 0.55 },
    { freq: 420, to: 1240, at: 0.1, dur: 0.1, type: "sine", gain: 0.35 },
  ],
  marimba: [
    { freq: 784, at: 0, dur: 0.16, type: "sine", gain: 0.5 },
    { freq: 988, at: 0.08, dur: 0.16, type: "sine", gain: 0.45 },
    { freq: 1175, at: 0.16, dur: 0.24, type: "sine", gain: 0.45 },
  ],
  knock: [
    { freq: 190, to: 120, at: 0, dur: 0.07, type: "triangle", gain: 0.9 },
    { freq: 190, to: 120, at: 0.14, dur: 0.07, type: "triangle", gain: 0.9 },
  ],
};

let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined" || typeof AudioContext === "undefined") return null;
  ctx ??= new AudioContext();
  return ctx;
}

export function playSound(sound: SoundId, volume: number): void {
  if (sound === "none" || volume <= 0) return;
  const ac = context();
  if (!ac) return;
  // Browsers start audio suspended until the person has interacted with the page.
  if (ac.state === "suspended") void ac.resume().catch(() => {});
  const start = ac.currentTime + 0.01;
  const master = ac.createGain();
  master.gain.value = Math.min(1, Math.max(0, volume)) * 0.6;
  master.connect(ac.destination);

  for (const n of RECIPES[sound]) {
    const osc = ac.createOscillator();
    const env = ac.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.freq, start + n.at);
    if (n.to) osc.frequency.exponentialRampToValueAtTime(n.to, start + n.at + n.dur);
    env.gain.setValueAtTime(0.0001, start + n.at);
    env.gain.exponentialRampToValueAtTime(n.gain ?? 0.5, start + n.at + 0.008);
    env.gain.exponentialRampToValueAtTime(0.0001, start + n.at + n.dur);
    osc.connect(env).connect(master);
    osc.start(start + n.at);
    osc.stop(start + n.at + n.dur + 0.02);
  }
}

export function soundRecipes() {
  return RECIPES;
}
