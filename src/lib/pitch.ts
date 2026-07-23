// The "hearing" layer for Rosin.
//
// The browser's Web Audio API is our hearing library: getUserMedia opens the
// mic, an AnalyserNode hands us raw samples, and autocorrelation turns those
// samples into a fundamental frequency (Hz). From Hz we derive the nearest
// note and how many cents sharp or flat the player is.

export const A4 = 440;

const NOTE_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const;

export type PitchState = "in-tune" | "near" | "off";

export interface PitchReading {
  /** Detected fundamental frequency in Hz. */
  hz: number;
  /** Nearest note name, e.g. "A", "F♯". */
  note: string;
  /** Octave number in scientific pitch notation. */
  octave: number;
  /** Frequency of the nearest in-tune note, in Hz. */
  targetHz: number;
  /** Cents off from the nearest note: negative = flat, positive = sharp. */
  cents: number;
  /** Bucketed tuning state driving the UI color. */
  state: PitchState;
}

/**
 * Pitch direction + degree, used to color notes: green in tune, then a soft
 * and a strong shade for each of flat (under) and sharp (over).
 */
export type Tone =
  | "in-tune"
  | "slight-flat"
  | "flat"
  | "slight-sharp"
  | "sharp";

/**
 * Classify by direction and degree: in tune (±5¢), slightly off (within 20¢),
 * or clearly off (beyond 20¢).
 */
export function toneFromCents(cents: number): Tone {
  if (cents >= -5 && cents <= 5) return "in-tune";
  if (cents < 0) return cents < -20 ? "flat" : "slight-flat";
  return cents > 20 ? "sharp" : "slight-sharp";
}

/** Map cents-off-pitch to a semantic state (see design.md). */
export function stateFromCents(cents: number): PitchState {
  const abs = Math.abs(cents);
  if (abs <= 5) return "in-tune";
  if (abs <= 20) return "near";
  return "off";
}

/** Real-valued MIDI note number for a frequency; 69 == A4 == 440 Hz. */
export function midiFromHz(hz: number): number {
  return 12 * Math.log2(hz / A4) + 69;
}

/** Note name and octave (scientific pitch notation) for a MIDI number. */
export function noteName(midi: number): { note: string; octave: number } {
  return {
    note: NOTE_NAMES[((midi % 12) + 12) % 12],
    octave: Math.floor(midi / 12) - 1,
  };
}

/** Convert a detected frequency into note, octave, and cents off. */
export function analyseFrequency(hz: number): PitchReading {
  const noteFloat = midiFromHz(hz);
  const nearest = Math.round(noteFloat);
  const cents = Math.round((noteFloat - nearest) * 100);
  const { note, octave } = noteName(nearest);
  const targetHz = A4 * Math.pow(2, (nearest - 69) / 12);

  return { hz, note, octave, targetHz, cents, state: stateFromCents(cents) };
}

/** A single sample captured during a recording. */
export interface RawFrame {
  hz: number; // -1 when no pitch was detected (silence/rest)
  t: number; // timestamp in ms
}

/** One sustained note extracted from a recording. */
export interface PlayedNote {
  note: string;
  octave: number;
  midi: number;
  /** Average cents off across the note: negative = flat, positive = sharp. */
  cents: number;
  state: PitchState;
  durationMs: number;
  samples: number;
}

/** An entry in the flat/sharp leaderboard, aggregated by note + octave. */
export interface SummaryEntry {
  note: string; // note with octave, e.g. "F♯5", "G4"
  count: number; // how many times this note was played off in that direction
  avgCents: number; // average deviation across those plays
}

export interface RecordingAnalysis {
  notes: PlayedNote[];
  mostFlat: SummaryEntry[];
  mostSharp: SummaryEntry[];
}

/**
 * Turn a stream of per-frame pitch samples into discrete played notes. A note
 * is a contiguous run of frames that round to the same pitch; silence (hz ≤ 0)
 * or a change of pitch ends the current note. Runs shorter than the minimums
 * are dropped as transients (bow noise, slides between notes).
 */
export function segmentNotes(
  frames: RawFrame[],
  minSamples = 5,
  minDurationMs = 80,
): PlayedNote[] {
  const notes: PlayedNote[] = [];
  let midi: number | null = null;
  let bucket: { midiFloat: number; t: number }[] = [];

  const flush = () => {
    if (midi !== null && bucket.length >= minSamples) {
      const durationMs = bucket[bucket.length - 1].t - bucket[0].t;
      if (durationMs >= minDurationMs) {
        const avgCents = Math.round(
          bucket.reduce((s, f) => s + (f.midiFloat - midi!) * 100, 0) /
            bucket.length,
        );
        const { note, octave } = noteName(midi);
        notes.push({
          note,
          octave,
          midi,
          cents: avgCents,
          state: stateFromCents(avgCents),
          durationMs,
          samples: bucket.length,
        });
      }
    }
    bucket = [];
  };

  for (const f of frames) {
    if (f.hz <= 0) {
      flush();
      midi = null;
      continue;
    }
    const midiFloat = midiFromHz(f.hz);
    const rounded = Math.round(midiFloat);
    if (rounded !== midi) {
      flush();
      midi = rounded;
    }
    bucket.push({ midiFloat, t: f.t });
  }
  flush();

  return notes;
}

/**
 * Rank notes by how often they were played too flat or too sharp (beyond the
 * ±5-cent in-tune band), most frequent first. Notes are distinguished by
 * octave, so G3 and G4 are ranked separately.
 */
export function summarize(notes: PlayedNote[]): {
  mostFlat: SummaryEntry[];
  mostSharp: SummaryEntry[];
} {
  const flat = new Map<string, { count: number; total: number }>();
  const sharp = new Map<string, { count: number; total: number }>();

  for (const n of notes) {
    const key = `${n.note}${n.octave}`; // e.g. "G4", "F♯5"
    if (n.cents < -5) {
      const e = flat.get(key) ?? { count: 0, total: 0 };
      flat.set(key, { count: e.count + 1, total: e.total + n.cents });
    } else if (n.cents > 5) {
      const e = sharp.get(key) ?? { count: 0, total: 0 };
      sharp.set(key, { count: e.count + 1, total: e.total + n.cents });
    }
  }

  const rank = (m: Map<string, { count: number; total: number }>) =>
    [...m.entries()]
      .map(([note, e]) => ({
        note,
        count: e.count,
        avgCents: Math.round(e.total / e.count),
      }))
      .sort((a, b) => b.count - a.count || Math.abs(b.avgCents) - Math.abs(a.avgCents));

  return { mostFlat: rank(flat), mostSharp: rank(sharp) };
}

/** Full pipeline: raw frames → segmented notes + flat/sharp summary. */
export function analyseRecording(frames: RawFrame[]): RecordingAnalysis {
  const notes = segmentNotes(frames);
  return { notes, ...summarize(notes) };
}

/**
 * Estimate the fundamental frequency of a buffer of time-domain samples using
 * normalized autocorrelation. Returns -1 when the signal is too quiet or too
 * noisy to call a pitch (silence, breath, bow noise between notes).
 */
// Frequency band we bother searching (viola/cello C up through violin E
// harmonics). Lags are derived from these so we never chase sub-/ultra-sonic
// noise.
const MIN_HZ = 60;
const MAX_HZ = 2000;

export function detectPitch(buffer: Float32Array, sampleRate: number): number {
  const size = buffer.length;

  // Energy at lag 0 doubles as a quiet-signal gate. This is intentionally low:
  // a violin at a normal practice distance is nowhere near full-scale.
  let energy = 0;
  for (let i = 0; i < size; i++) energy += buffer[i] * buffer[i];
  const rms = Math.sqrt(energy / size);
  if (rms < 0.003) return -1;

  const minLag = Math.max(2, Math.floor(sampleRate / MAX_HZ));
  const maxLag = Math.min(size - 1, Math.floor(sampleRate / MIN_HZ));

  // Autocorrelation across the plausible lag range, normalized against the
  // zero-lag energy so the peak is a 0..1 confidence rather than an amplitude.
  let bestLag = -1;
  let bestCorr = 0;
  let prevCorr = 1;
  let descending = true;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = 0; i < size - lag; i++) sum += buffer[i] * buffer[i + lag];
    const corr = sum / energy;

    // Skip the correlation's initial descent from lag 0 so we lock onto the
    // fundamental period, not the trivial peak at lag ≈ 0.
    if (descending) {
      if (corr < prevCorr) {
        prevCorr = corr;
        continue;
      }
      descending = false;
    }

    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
    prevCorr = corr;
  }

  // Require a periodic-enough signal; bowed noise and room hum stay below this.
  if (bestLag < 0 || bestCorr < 0.5) return -1;

  // Parabolic interpolation around the peak for sub-sample (sub-cent) accuracy.
  const y0 = recorr(buffer, size, energy, bestLag - 1);
  const y1 = bestCorr;
  const y2 = recorr(buffer, size, energy, bestLag + 1);
  const denominator = 2 * (2 * y1 - y0 - y2);
  const refinedLag =
    denominator !== 0 ? bestLag + (y2 - y0) / denominator : bestLag;

  const frequency = sampleRate / refinedLag;
  if (frequency < MIN_HZ || frequency > MAX_HZ) return -1;

  return frequency;
}

/** Single normalized autocorrelation value at one lag (for peak refinement). */
function recorr(
  buffer: Float32Array,
  size: number,
  energy: number,
  lag: number,
): number {
  if (lag < 1 || lag >= size) return 0;
  let sum = 0;
  for (let i = 0; i < size - lag; i++) sum += buffer[i] * buffer[i + lag];
  return sum / energy;
}
