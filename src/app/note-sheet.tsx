import {
  toneFromCents,
  type RecordingAnalysis,
  type SummaryEntry,
  type Tone,
} from "@/lib/pitch";
import SheetMusic from "./sheet-music";

const TONE_COLOR: Record<Tone, string> = {
  "in-tune": "var(--intune)",
  "slight-flat": "var(--flat-soft)",
  flat: "var(--flat)",
  "slight-sharp": "var(--sharp-soft)",
  sharp: "var(--sharp)",
};

export default function NoteSheet({
  analysis,
}: {
  analysis: RecordingAnalysis;
}) {
  const { notes, mostFlat, mostSharp } = analysis;

  return (
    <div
      className="flex w-full flex-col gap-[var(--sp-6)] rounded-[var(--r-lg)] border border-border bg-surface p-[var(--sp-6)]"
      style={{ boxShadow: "var(--shadow)" }}
    >
      <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">
        Recording · Note sheet
      </p>

      {notes.length === 0 ? (
        <p className="text-sm text-text-mid">
          No clear notes were heard. Try again a little louder, with sustained
          bow strokes.
        </p>
      ) : (
        <>
          {/* Sheet music — notes on a treble staff, in the order played */}
          <SheetMusic notes={notes} />

          {/* Flat / sharp summary */}
          <div className="grid gap-[var(--sp-5)] sm:grid-cols-2">
            <SummaryColumn
              title="Most flat notes"
              hint="Played consistently under pitch"
              entries={mostFlat}
              glyph="♭"
              arrow="↓"
              color="var(--flat)"
              emptyText="Nothing consistently flat. Nice."
            />
            <SummaryColumn
              title="Most sharp notes"
              hint="Played consistently over pitch"
              entries={mostSharp}
              glyph="♯"
              arrow="↑"
              color="var(--sharp)"
              emptyText="Nothing consistently sharp. Nice."
            />
          </div>
        </>
      )}
    </div>
  );
}

function SummaryColumn({
  title,
  hint,
  entries,
  glyph,
  arrow,
  color,
  emptyText,
}: {
  title: string;
  hint: string;
  entries: SummaryEntry[];
  glyph: string;
  arrow: string;
  color: string;
  emptyText: string;
}) {
  return (
    <div className="flex flex-col gap-[var(--sp-3)]">
      <div className="flex flex-col gap-[2px]">
        <h3 className="flex items-center gap-[var(--sp-2)] text-[1.125rem] font-semibold tracking-[-0.02em]">
          <span style={{ color }}>{glyph}</span>
          {title}
        </h3>
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-text-lo">
          {hint}
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-text-mid">{emptyText}</p>
      ) : (
        <ul className="flex flex-col gap-[var(--sp-2)]">
          {entries.map((e) => (
            <li
              key={e.note}
              className="flex items-center justify-between gap-[var(--sp-3)] rounded-[var(--r-md)] bg-raised px-[var(--sp-3)] py-[var(--sp-2)]"
            >
              <span className="font-mono text-[1.125rem] font-semibold text-text-hi">
                {e.note}
              </span>
              <span className="flex items-center gap-[var(--sp-3)] font-mono text-sm">
                <span className="text-text-lo">×{e.count}</span>
                <span style={{ color: TONE_COLOR[toneFromCents(e.avgCents)] }}>
                  {arrow} {Math.abs(e.avgCents)}¢
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
