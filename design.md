# Rosin — Design System

> A practice companion for the returning violinist.
> **Feel:** precision instrument. Sharp, quiet, gold.

Rosin helps a rusty violinist show up again. The interface is quiet, sharp, and honest — built to be read at arm's length from a propped-up phone, and to reward you only when it actually hears you play in tune.

**Principles**
- A precision instrument, not a practice toy.
- Gold is the constant; green is earned.
- Boldness is spent on the gauge; everything else stays quiet.
- Dark is the default (the instrument panel); light is cool and clean, never cream.

---

## Color

Rosin gold is the brand constant across both themes — the exact amber of violin rosin. Green is disciplined: it appears **only** when a note is dead in tune, so it always means one thing.

### Accent — Rosin Gold (theme-independent)

| Token | Value | Role |
|---|---|---|
| `--gold` | `#E4A22B` | Primary actions, needle |
| `--gold-bright` | `#F2B845` | Hover / active |
| `--gold-deep` | `#B87E17` | Pressed / hairlines |
| `--gold-tint` | `#FBF3E2` | Light-mode wash |

### Pitch states — semantic

| Token | Value | Role |
|---|---|---|
| In tune | `#34C77B` | Reserved: ≤ 5 cents |
| Near (`--gold`) | `#E4A22B` | Within 20 cents |
| Off (`--off`) | `#E5544B` | Sharp / flat |

The needle and readout color are driven by cents off pitch:
- `abs(cents) ≤ 5` → **in tune** (green)
- `abs(cents) ≤ 20` → **near** (gold)
- otherwise → **off** (red)

### Neutrals

| Token | Dark | Light | Role |
|---|---|---|---|
| `--bg` | `#0D0D0F` | `#F6F6F7` | Page |
| `--surface` | `#16161A` | `#FFFFFF` | Panels, cards |
| `--raised` | `#1F1F24` | `#FFFFFF` | Chips, wells |
| `--border` | `#2C2C33` | `#E4E4E8` | Hairlines |
| `--border-strong` | `#3A3A42` | `#D2D2D8` | Emphasized borders |
| `--text-hi` | `#F4F4F5` | `#17171A` | Primary text |
| `--text-mid` | `#B7B7BE` | `#4E4E56` | Secondary text |
| `--text-lo` | `#78787F` | `#83838C` | Meta, labels |
| `--intune` | `#3FD988` | `#1FA85F` | In-tune state (per theme) |
| `--gauge-track` | `#26262C` | `#EAEAEE` | Gauge arc track |

**Shadow** — Dark: `0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35)` · Light: `0 1px 2px rgba(20,20,25,.06), 0 8px 24px rgba(20,20,25,.06)`

---

## Typography

Geist carries the interface — clean, modern, quietly technical. **Geist Mono** handles every number the tuner produces, so measured values read like a real instrument's display.

- `--font-sans`: `"Geist", system-ui, -apple-system, sans-serif`
- `--font-mono`: `"Geist Mono", ui-monospace, "SF Mono", monospace`

### Type scale

| Token | Size | Use |
|---|---|---|
| `--fs-caption` | 0.75rem / 12 | Labels, meta, eyebrows |
| `--fs-small` | 0.875rem / 14 | Secondary UI |
| `--fs-body` | 1rem / 16 | Base |
| `--fs-lg` | 1.125rem / 18 | Lead paragraphs |
| `--fs-h3` | 1.375rem / 22 | H3 |
| `--fs-h2` | 1.875rem / 30 | H2 |
| `--fs-h1` | 2.5rem / 40 | H1 |
| `--fs-readout` | `clamp(3rem, 9vw, 4.5rem)` | The tuner number |

### Line height & tracking

- `--lh-tight`: 1.1 · `--lh-snug`: 1.3 · `--lh-body`: 1.6
- `--tracking-label`: 0.14em (eyebrows / labels, uppercase)
- `--tracking-tight`: -0.02em (large display)

Headings are `font-weight: 600` with tight tracking. Eyebrows are mono, uppercase, gold, letter-spaced.

---

## Spacing & shape

A 4px base with generous steps — the layout breathes so a glance from across the room lands cleanly. Radii stay tight; nothing is rounder than 6px.

### Spacing scale

| Token | Value |
|---|---|
| `--sp-1` | 0.25rem / 4 |
| `--sp-2` | 0.5rem / 8 |
| `--sp-3` | 0.75rem / 12 |
| `--sp-4` | 1rem / 16 |
| `--sp-5` | 1.5rem / 24 |
| `--sp-6` | 2rem / 32 |
| `--sp-8` | 3rem / 48 |
| `--sp-10` | 4rem / 64 |
| `--sp-12` | 6rem / 96 |
| `--sp-16` | 8rem / 128 |

### Radius

- `--r-sm`: 2px · `--r-md`: 4px · `--r-lg`: 6px

### Borders

- `--border-hair`: 1px (all hairlines)

Layout container (`.wrap`): `max-width: 960px`, centered, `padding: 0 var(--sp-5)`.

---

## Motion

Smooth and subtle. Nothing bounces. The needle eases into place, states cross-fade, and everything is disabled under `prefers-reduced-motion`.

| Token | Value | Use |
|---|---|---|
| `--dur-1` | 160ms | Hover, focus, taps |
| `--dur-2` | 240ms | Color / theme shifts |
| `--dur-3` | 340ms | Needle travel |
| `--ease` | `cubic-bezier(0.4, 0, 0.2, 1)` | General |
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Needle, entrances |

Under `prefers-reduced-motion: reduce`, all transitions and smooth scrolling are disabled.

---

## The Gauge — signature element

The tuning gauge is the one bold moment in the interface. An SVG arc with a needle that rotates ±60° across a ±50 cent range, a large mono readout, and a demo slider.

- **Arc**: 120px radius semicircle, `--gauge-track` stroke, 6px, rounded caps.
- **Needle**: rotates `(cents / 50) * 60` degrees; `transform-origin` at the pivot; color follows the pitch-state logic.
- **Readout**: `--fs-readout`, mono, weight 500; shows note name with ♯/♭ when off.
- **Ticks**: center tick + two side ticks in `--text-lo`.

Panel: `--surface` background, hairline border, `--r-lg`, `--shadow`, centered.

---

## Components

Built from the tokens above.

### Buttons

- **Primary** — `background: --gold`, dark text (`#17130A`); hover → `--gold-bright`.
- **Secondary** — `--surface`, `--border-strong`; hover → gold border + gold text.
- **Ghost** — transparent, `--text-mid`; hover → `--text-hi` on `--raised`.
- **Start (primary call)** — larger (`--fs-lg`, weight 600, `--sp-4 var(--sp-8)`), gold, lifts `translateY(-1px)` on hover.

All buttons: `--r-md`, `transition: all var(--dur-1) var(--ease)`.

### Streak — the honest reward

Big mono number in gold with an uppercase mono label ("Days heard"). The counter only advances on a **verified** session — the mic has to actually hear you play in tune. It can't be faked by opening the app.

### Pitch chip & states

- **Note chip** — mono, weight 600, `--fs-h3`, on `--raised`; octave number as small `--text-lo`.
- **State pills** — mono, small, with a 10px colored dot: In tune (`--intune`), Near (`--near`/gold, e.g. `+12¢`), Sharp/Off (`--off`, e.g. `+34¢`).

### Input

- `--surface` background, `--border-strong` hairline, `--r-md`; focus → gold border.
- Field: column layout, `--sp-2` gap, label in `--fs-small` / `--text-mid`, max-width 320px.

### Card

- `--surface`, hairline border, `--r-lg`, `--sp-5` padding.
- Typical: eyebrow → H3 → muted body.

---

## Global / base

- `::selection` — gold background, near-black text.
- `:focus-visible` — 2px gold outline, 2px offset, `--r-sm`.
- Links — gold, no underline.
- Body — `--bg` / `--text-hi`, sans, 16/1.6, antialiased; theme transitions on background & color.

### Top bar

Sticky, `z-index: 50`, translucent `--bg` (88%) with `backdrop-filter: blur(12px)`, hairline bottom border. Brand mark is a 22px gold gradient square (`--gold-bright` → `--gold-deep`).

---

## CSS tokens

Copy straight into the project. Dark is the default; light overrides only what changes.

```css
/* Brand + type — theme-independent */
:root {
  --font-sans: "Geist", system-ui, sans-serif;
  --font-mono: "Geist Mono", ui-monospace, monospace;

  --gold: #E4A22B;  --gold-bright: #F2B845;
  --gold-deep: #B87E17;  --gold-tint: #FBF3E2;
  --off: #E5544B;

  --r-sm: 2px; --r-md: 4px; --r-lg: 6px;
  --ease: cubic-bezier(.4,0,.2,1);
  --ease-out: cubic-bezier(.16,1,.3,1);
  --dur-1: 160ms; --dur-2: 240ms; --dur-3: 340ms;
  --sp-1:.25rem; --sp-2:.5rem; --sp-3:.75rem; --sp-4:1rem;
  --sp-5:1.5rem; --sp-6:2rem; --sp-8:3rem; --sp-10:4rem;
  --sp-12:6rem; --sp-16:8rem;
}

/* Dark — the instrument panel (default) */
[data-theme="dark"] {
  --bg:#0D0D0F; --surface:#16161A; --raised:#1F1F24;
  --border:#2C2C33; --border-strong:#3A3A42;
  --text-hi:#F4F4F5; --text-mid:#B7B7BE; --text-lo:#78787F;
  --intune:#3FD988; --gauge-track:#26262C;
  --shadow: 0 1px 2px rgba(0,0,0,.4), 0 8px 24px rgba(0,0,0,.35);
}

/* Light — cool & clean, never cream */
[data-theme="light"] {
  --bg:#F6F6F7; --surface:#FFFFFF; --raised:#FFFFFF;
  --border:#E4E4E8; --border-strong:#D2D2D8;
  --text-hi:#17171A; --text-mid:#4E4E56; --text-lo:#83838C;
  --intune:#1FA85F; --gauge-track:#EAEAEE;
  --shadow: 0 1px 2px rgba(20,20,25,.06), 0 8px 24px rgba(20,20,25,.06);
}
```

---

*Rosin — design system draft. Gold is the constant; green is earned. Built for the player coming back.*
