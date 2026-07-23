"use client";

import { useEffect, useRef } from "react";
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";
import type { PitchState, PlayedNote } from "@/lib/pitch";

/** Map a played note to a VexFlow key like "f#/4". */
function vexKey(note: PlayedNote): { key: string; sharp: boolean } {
  const letter = note.note[0].toLowerCase();
  const sharp = note.note.includes("♯");
  return { key: `${letter}${sharp ? "#" : ""}/${note.octave}`, sharp };
}

/** Signed cents with a trailing accidental when off pitch. */
function centsText(cents: number): string {
  const sign = cents > 0 ? "+" : "";
  const accidental = cents > 5 ? " ♯" : cents < -5 ? " ♭" : "";
  return `${sign}${cents}¢${accidental}`;
}

const LINE_HEIGHT = 132;
const STAVE_TOP = 16;
const SIDE_PAD = 12;
const CLEF_WIDTH = 56;
const NOTE_WIDTH = 48;

export default function SheetMusic({ notes }: { notes: PlayedNote[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || notes.length === 0) return;

    const render = () => {
      el.innerHTML = "";

      const css = getComputedStyle(document.documentElement);
      const cvar = (n: string) => css.getPropertyValue(n).trim() || "#000";
      const ink = cvar("--text-hi");
      const stateColor: Record<PitchState, string> = {
        "in-tune": cvar("--intune"),
        near: cvar("--gold"),
        off: cvar("--off"),
      };

      const width = Math.max(320, el.clientWidth);
      const usable = width - SIDE_PAD * 2;
      const perLine = Math.max(
        2,
        Math.floor((usable - CLEF_WIDTH) / NOTE_WIDTH),
      );

      const lines: PlayedNote[][] = [];
      for (let i = 0; i < notes.length; i += perLine) {
        lines.push(notes.slice(i, i + perLine));
      }

      const renderer = new Renderer(el, Renderer.Backends.SVG);
      renderer.resize(width, STAVE_TOP + lines.length * LINE_HEIGHT + 8);
      const context = renderer.getContext();
      context.setFillStyle(ink);
      context.setStrokeStyle(ink);

      lines.forEach((lineNotes, li) => {
        const y = STAVE_TOP + li * LINE_HEIGHT;
        const stave = new Stave(SIDE_PAD, y, usable);
        stave.addClef("treble");
        stave.setContext(context).draw();

        const staveNotes = lineNotes.map((n) => {
          const { key, sharp } = vexKey(n);
          const sn = new StaveNote({ keys: [key], duration: "q" });
          if (sharp) sn.addModifier(new Accidental("#"), 0);
          const col = stateColor[n.state];
          sn.setStyle({ fillStyle: col, strokeStyle: col });
          return sn;
        });

        const voice = new Voice({
          numBeats: lineNotes.length,
          beatValue: 4,
        }).setStrict(false);
        voice.addTickables(staveNotes);

        // Don't justify a short final line across the full width.
        const formatWidth = Math.min(
          usable - CLEF_WIDTH,
          lineNotes.length * NOTE_WIDTH,
        );
        new Formatter().joinVoices([voice]).format([voice], formatWidth);
        voice.draw(context, stave);

        // Cents deviation under each note, colored by tuning state.
        context.save();
        context.setFont("ui-monospace, monospace", 11);
        lineNotes.forEach((n, i) => {
          const label = centsText(n.cents);
          const x = staveNotes[i].getAbsoluteX();
          const w = context.measureText(label).width;
          context.setFillStyle(stateColor[n.state]);
          context.fillText(label, x - w / 2 + 5, y + LINE_HEIGHT - 26);
        });
        context.restore();
      });
    };

    render();

    // Re-render on container resize so line breaks stay sensible.
    const ro = new ResizeObserver(render);
    ro.observe(el);
    return () => ro.disconnect();
  }, [notes]);

  if (notes.length === 0) return null;

  return <div ref={containerRef} className="w-full" />;
}
