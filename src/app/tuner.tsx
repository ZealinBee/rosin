"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  analyseFrequency,
  analyseRecording,
  detectPitch,
  type PitchReading,
  type PitchState,
  type RawFrame,
  type RecordingAnalysis,
} from "@/lib/pitch";
import NoteSheet from "./note-sheet";

type Status = "idle" | "listening" | "denied" | "unsupported";

const STATE_COLOR: Record<PitchState, string> = {
  "in-tune": "var(--intune)",
  near: "var(--gold)",
  off: "var(--off)",
};

const STATE_LABEL: Record<PitchState, string> = {
  "in-tune": "In tune",
  near: "Near",
  off: "Off",
};

// Gauge geometry.
const CX = 160;
const CY = 150;
const R = 120;
const MAX_DEG = 60; // needle travel at ±50 cents

function polar(angleDeg: number, radius = R) {
  // 0° points straight up; positive angles swing clockwise (sharp).
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

export default function Tuner() {
  const [status, setStatus] = useState<Status>("idle");
  const [reading, setReading] = useState<PitchReading | null>(null);
  // True while the mic is on but no clear pitch is coming through.
  const [silent, setSilent] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [analysis, setAnalysis] = useState<RecordingAnalysis | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const bufferRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  // Smoothed Hz to keep the needle from twitching between frames.
  const smoothedHzRef = useRef<number | null>(null);
  // Recording capture state, read inside the animation loop.
  const recordingRef = useRef(false);
  const framesRef = useRef<RawFrame[]>([]);
  const recStartRef = useRef(0);
  const recSecondRef = useRef(-1);

  const stop = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
    analyserRef.current = null;
    smoothedHzRef.current = null;
    recordingRef.current = false;
    setStatus("idle");
    setSilent(true);
    setRecording(false);
  }, []);

  useEffect(() => stop, [stop]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);

      const buffer = new Float32Array(analyser.fftSize);
      streamRef.current = stream;
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      bufferRef.current = buffer;

      // Read one frame of samples, estimate the pitch, and schedule the next.
      const loop = () => {
        analyser.getFloatTimeDomainData(buffer);
        const hz = detectPitch(buffer, ctx.sampleRate);

        if (hz > 0) {
          // Exponential smoothing; snap if the note jumped far (new note).
          const prev = smoothedHzRef.current;
          const next =
            prev && Math.abs(hz - prev) / prev < 0.1
              ? prev + (hz - prev) * 0.25
              : hz;
          smoothedHzRef.current = next;
          setReading(analyseFrequency(next));
          setSilent(false);
        } else {
          smoothedHzRef.current = null;
          setSilent(true);
        }

        // Capture raw (unsmoothed) frames for the recording analysis. We store
        // silent frames too, so rests break notes apart on the note sheet.
        if (recordingRef.current) {
          const now = performance.now();
          framesRef.current.push({ hz, t: now });
          const sec = Math.floor((now - recStartRef.current) / 1000);
          if (sec !== recSecondRef.current) {
            recSecondRef.current = sec;
            setRecSeconds(sec);
          }
        }

        rafRef.current = requestAnimationFrame(loop);
      };

      setStatus("listening");
      rafRef.current = requestAnimationFrame(loop);
    } catch {
      setStatus("denied");
    }
  }, []);

  const startRecording = useCallback(async () => {
    // Make sure the mic pipeline is up; auto-start it if the user jumped
    // straight to recording.
    if (!analyserRef.current) await start();
    if (!analyserRef.current) return; // start failed (denied/unsupported)

    framesRef.current = [];
    recStartRef.current = performance.now();
    recSecondRef.current = -1;
    setAnalysis(null);
    setRecSeconds(0);
    recordingRef.current = true;
    setRecording(true);
  }, [start]);

  const stopRecording = useCallback(() => {
    recordingRef.current = false;
    setRecording(false);
    setAnalysis(analyseRecording(framesRef.current));
  }, []);

  const active = status === "listening" && !silent && reading !== null;
  const state = active ? reading!.state : null;
  const color = state ? STATE_COLOR[state] : "var(--text-lo)";
  const cents = active ? Math.max(-50, Math.min(50, reading!.cents)) : 0;
  const needleDeg = (cents / 50) * MAX_DEG;

  const centerTick = polar(0);
  const leftTick = polar(-MAX_DEG);
  const rightTick = polar(MAX_DEG);
  const needleTip = polar(needleDeg, R - 14);

  const recLabel = `${Math.floor(recSeconds / 60)}:${String(
    recSeconds % 60,
  ).padStart(2, "0")}`;

  return (
    <div className="flex w-full max-w-[720px] flex-col items-center gap-[var(--sp-6)]">
      <div
        className="flex w-full max-w-[560px] flex-col items-center gap-[var(--sp-6)] rounded-[var(--r-lg)] border border-border bg-surface p-[var(--sp-8)]"
        style={{ boxShadow: "var(--shadow)" }}
      >
        <div className="flex items-center gap-[var(--sp-3)]">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">
            Tuner
          </p>
          {recording && (
            <span className="flex items-center gap-[var(--sp-2)] font-mono text-xs uppercase tracking-[0.14em] text-off">
              <span className="inline-block h-[8px] w-[8px] animate-pulse rounded-full bg-off" />
              Rec {recLabel}
            </span>
          )}
        </div>

      {/* The gauge */}
      <svg
        viewBox="0 0 320 180"
        className="w-full max-w-[360px]"
        role="img"
        aria-label={
          active
            ? `${reading!.note}${reading!.octave}, ${reading!.cents} cents`
            : "Waiting for sound"
        }
      >
        {/* Arc track */}
        <path
          d={`M ${polar(-90).x} ${polar(-90).y} A ${R} ${R} 0 0 1 ${
            polar(90).x
          } ${polar(90).y}`}
          fill="none"
          stroke="var(--gauge-track)"
          strokeWidth={6}
          strokeLinecap="round"
        />

        {/* Ticks */}
        {[leftTick, centerTick, rightTick].map((t, i) => {
          const inner = polar(
            i === 0 ? -MAX_DEG : i === 2 ? MAX_DEG : 0,
            R - 16,
          );
          return (
            <line
              key={i}
              x1={t.x}
              y1={t.y}
              x2={inner.x}
              y2={inner.y}
              stroke="var(--text-lo)"
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}

        {/* Needle */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          style={{ transition: "all var(--dur-3) var(--ease-out)" }}
        />
        <circle cx={CX} cy={CY} r={6} fill={color} />
      </svg>

      {/* Readout */}
      <div className="flex flex-col items-center gap-[var(--sp-2)]">
        <div
          className="font-mono font-medium leading-none tracking-[-0.02em]"
          style={{
            fontSize: "clamp(3rem, 9vw, 4.5rem)",
            color,
            transition: "color var(--dur-2) var(--ease)",
          }}
        >
          {active ? (
            <>
              {reading!.note}
              <span className="align-top text-[0.4em] text-text-lo">
                {reading!.octave}
              </span>
            </>
          ) : (
            "—"
          )}
        </div>

        {/* Hz indicator */}
        <div className="font-mono text-sm text-text-mid">
          {active ? `${reading!.hz.toFixed(1)} Hz` : "0.0 Hz"}
        </div>
      </div>

      {/* State pill */}
      <StatePill active={active} reading={reading} />

        {/* Controls — two independent toggles: listening, and recording. */}
        <div className="flex flex-wrap items-center justify-center gap-[var(--sp-3)]">
          {/* Listening toggle */}
          {status === "listening" ? (
            <button
              onClick={stop}
              disabled={recording}
              className="rounded-[var(--r-md)] border border-border-strong bg-surface px-[var(--sp-8)] py-[var(--sp-4)] text-lg font-semibold text-text-hi transition-all duration-[var(--dur-1)] hover:-translate-y-px hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:border-border-strong disabled:hover:text-text-hi"
            >
              Stop
            </button>
          ) : (
            <button
              onClick={start}
              className="rounded-[var(--r-md)] bg-gold px-[var(--sp-8)] py-[var(--sp-4)] text-lg font-semibold text-[#17130a] transition-all duration-[var(--dur-1)] hover:-translate-y-px hover:bg-gold-bright"
            >
              Start listening
            </button>
          )}

          {/* Recording toggle */}
          {recording ? (
            <button
              onClick={stopRecording}
              className="flex items-center gap-[var(--sp-2)] rounded-[var(--r-md)] bg-off px-[var(--sp-8)] py-[var(--sp-4)] text-lg font-semibold text-white transition-all duration-[var(--dur-1)] hover:-translate-y-px"
            >
              <span className="inline-block h-[10px] w-[10px] rounded-[1px] bg-white" />
              Stop recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="flex items-center gap-[var(--sp-2)] rounded-[var(--r-md)] border border-border-strong bg-surface px-[var(--sp-8)] py-[var(--sp-4)] text-lg font-semibold text-text-hi transition-all duration-[var(--dur-1)] hover:-translate-y-px hover:border-off hover:text-off"
            >
              <span className="inline-block h-[10px] w-[10px] rounded-full bg-off" />
              Record
            </button>
          )}
        </div>

        {status === "denied" && (
          <p className="text-sm text-off">
            Microphone access is needed to hear you play. Allow it and try again.
          </p>
        )}
        {status === "unsupported" && (
          <p className="text-sm text-off">
            This browser can&apos;t access the microphone.
          </p>
        )}
        {status === "listening" && silent && !recording && (
          <p className="text-sm text-text-lo">Play a note…</p>
        )}
      </div>

      {analysis && <NoteSheet analysis={analysis} />}
    </div>
  );
}

function StatePill({
  active,
  reading,
}: {
  active: boolean;
  reading: PitchReading | null;
}) {
  if (!active || !reading) {
    return (
      <div className="flex items-center gap-[var(--sp-2)] rounded-[var(--r-md)] bg-raised px-[var(--sp-3)] py-[var(--sp-2)] font-mono text-sm text-text-lo">
        <span
          className="inline-block h-[10px] w-[10px] rounded-full"
          style={{ background: "var(--text-lo)" }}
        />
        Silent
      </div>
    );
  }

  const { state, cents } = reading;
  const color = STATE_COLOR[state];
  const sign = cents > 0 ? "+" : "";
  const direction =
    state === "in-tune" ? "" : cents > 0 ? " Sharp" : " Flat";
  const label =
    state === "in-tune" ? STATE_LABEL[state] : `${sign}${cents}¢${direction}`;

  return (
    <div
      className="flex items-center gap-[var(--sp-2)] rounded-[var(--r-md)] bg-raised px-[var(--sp-3)] py-[var(--sp-2)] font-mono text-sm"
      style={{ color }}
    >
      <span
        className="inline-block h-[10px] w-[10px] rounded-full"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}
