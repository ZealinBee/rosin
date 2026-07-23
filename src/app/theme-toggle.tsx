"use client";

import { useCallback, useEffect, useState } from "react";

type Theme = "dark" | "light";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light"
    ? "light"
    : "dark";
}

export default function ThemeToggle() {
  // Lazy initializer reads the same DOM the inline script already set,
  // so React's state matches the pre-paint theme (no flash, no mismatch).
  const [theme, setTheme] = useState<Theme>(() =>
    typeof window === "undefined" ? "dark" : currentTheme(),
  );

  // The inline script runs before hydration; sync once in case SSR guessed dark.
  useEffect(() => setTheme(currentTheme()), []);

  const toggle = useCallback(() => {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    // Persist first, then reflect on the DOM and in state. Reading the live
    // theme from the DOM (rather than closing over `theme`) keeps us correct
    // even if the attribute changed outside React.
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      // localStorage unavailable (e.g. private mode) — the choice won't persist.
    }
    setTheme(next);
  }, []);

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle color theme"
      aria-pressed={theme === "light"}
      className="cursor-pointer rounded-[var(--r-md)] border border-border bg-surface px-[var(--sp-3)] py-[var(--sp-2)] font-mono text-xs uppercase tracking-[0.06em] text-text-mid transition-colors duration-[160ms] ease-[var(--ease)] hover:border-border-strong hover:text-text-hi"
    >
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
