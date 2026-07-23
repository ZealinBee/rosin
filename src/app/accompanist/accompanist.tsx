"use client";

import { useCallback, useRef, useState } from "react";
import type { Accompaniment } from "@/lib/youtube";

type Status = "idle" | "searching" | "done" | "error";

export default function Accompanist() {
  const [song, setSong] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [results, setResults] = useState<Accompaniment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  // The video currently expanded into an inline player.
  const [playing, setPlaying] = useState<string | null>(null);

  // Guards against an in-flight search overwriting a newer one.
  const reqIdRef = useRef(0);

  const search = useCallback(async (term: string) => {
    const query = term.trim();
    if (!query) return;

    const reqId = ++reqIdRef.current;
    setStatus("searching");
    setError(null);
    setPlaying(null);
    setLastQuery(query);

    try {
      const res = await fetch(
        `/api/accompanist?song=${encodeURIComponent(query)}`,
      );
      const data = await res.json();
      if (reqId !== reqIdRef.current) return; // superseded by a newer search

      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setResults([]);
        setStatus("error");
        return;
      }
      setResults(data.results ?? []);
      setStatus("done");
    } catch {
      if (reqId !== reqIdRef.current) return;
      setError("Couldn't reach the server. Check your connection.");
      setResults([]);
      setStatus("error");
    }
  }, []);

  return (
    <div className="flex w-full max-w-[820px] flex-col items-center gap-[var(--sp-6)]">
      <div className="flex flex-col items-center gap-[var(--sp-2)] text-center">
        <p className="font-mono text-xs uppercase tracking-[0.14em] text-gold">
          Piano Accompanist
        </p>
        <h1 className="text-3xl font-semibold tracking-[-0.02em]">
          Find your accompaniment
        </h1>
        <p className="max-w-[46ch] text-text-mid">
          Enter a song and we&apos;ll pull piano accompaniment and backing
          tracks from YouTube to play along with.
        </p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(song);
        }}
        className="flex w-full max-w-[560px] items-center gap-[var(--sp-3)]"
      >
        <input
          type="text"
          value={song}
          onChange={(e) => setSong(e.target.value)}
          placeholder="e.g. Csárdás, Monti"
          aria-label="Song name"
          autoFocus
          className="flex-1 rounded-[var(--r-md)] border border-border bg-surface px-[var(--sp-4)] py-[var(--sp-3)] text-text-hi placeholder:text-text-lo transition-colors duration-[var(--dur-1)] focus:border-gold focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!song.trim() || status === "searching"}
          className="rounded-[var(--r-md)] bg-gold px-[var(--sp-6)] py-[var(--sp-3)] font-semibold text-[#17130a] transition-all duration-[var(--dur-1)] hover:-translate-y-px hover:bg-gold-bright disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {status === "searching" ? "Searching…" : "Find"}
        </button>
      </form>

      {status === "error" && error && (
        <p className="text-sm text-off">{error}</p>
      )}

      {status === "searching" && (
        <p className="text-sm text-text-lo">
          Searching YouTube for “{lastQuery}”…
        </p>
      )}

      {status === "done" && results.length === 0 && (
        <p className="text-sm text-text-lo">
          No accompaniments found for “{lastQuery}”. Try another title.
        </p>
      )}

      {results.length > 0 && (
        <ul className="grid w-full grid-cols-1 gap-[var(--sp-4)] sm:grid-cols-2">
          {results.map((r) => (
            <li
              key={r.videoId}
              className="flex flex-col overflow-hidden rounded-[var(--r-lg)] border border-border bg-surface"
              style={{ boxShadow: "var(--shadow)" }}
            >
              <div className="relative aspect-video w-full bg-raised">
                {playing === r.videoId ? (
                  <iframe
                    className="absolute inset-0 h-full w-full"
                    src={`https://www.youtube.com/embed/${r.videoId}?autoplay=1`}
                    title={r.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setPlaying(r.videoId)}
                    aria-label={`Play ${r.title}`}
                    className="group absolute inset-0 h-full w-full cursor-pointer"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={r.thumbnail}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-[var(--dur-1)] group-hover:bg-black/40">
                      <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gold text-[#17130a] transition-transform duration-[var(--dur-1)] group-hover:scale-110">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </span>
                    </span>
                    {r.duration && (
                      <span className="absolute bottom-[var(--sp-2)] right-[var(--sp-2)] rounded-[var(--r-sm)] bg-black/75 px-[var(--sp-2)] py-[2px] font-mono text-xs text-white">
                        {r.duration}
                      </span>
                    )}
                  </button>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-[var(--sp-2)] p-[var(--sp-4)]">
                <p className="line-clamp-2 font-medium leading-snug text-text-hi">
                  {r.title}
                </p>
                <p className="text-sm text-text-lo">{r.channel}</p>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto w-fit font-mono text-xs uppercase tracking-[0.06em] text-text-mid transition-colors duration-[var(--dur-1)] hover:text-gold"
                >
                  Open on YouTube ↗
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
