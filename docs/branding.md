# Branding

The source of truth for how Antumbra looks and how it speaks. When this document and the code disagree, the code is wrong.

## The name

**Antumbra.** One word, capital A, the rest lower case — in prose, in the window title, in the wordmark, and in headings. Never `antumbra`, never
`ANTUMBRA`, never `AntUmbra`. The package scope `@antumbra/*` and the repo name are lower case because npm and git are; that is a namespace, not the
name.

There is no tagline locked to the wordmark. Where a line of positioning is needed, use the one from the README: _a place to stand for the long view._

The name is pronounced _an-TUM-bra_ and is worth spelling out once for a new reader, because the geometry is the whole identity.

## The identity

In eclipse geometry the antumbra is the pale outer shadow — the region past the tip of the umbra, where the blocking body no longer covers the star
but sits inside its disc. From in there you see a ring of light around the obstacle.

The interface is that picture. The ground goes to near-black. Everything the app knows sits on quiet steps just above it. Exactly one warm light does
the pointing, and it is used sparingly enough that when it appears you look at it.

Three rules follow, and they are the ones to hold on to:

1. **Dark only.** There is no light theme and no theme switch. The tokens are defined once, on `:root`, and `color-scheme: dark` is declared so native
   controls and scrollbars follow. A light mode is a product decision nobody has made; do not add the scaffolding for one on spec.
2. **Elevation is light, not shadow.** A surface reads as nearer because it is a step lighter, not because it casts something. Shadows exist only
   under things that genuinely float over the app — dialogs, popovers, tooltips.
3. **One accent, spent carefully.** The warm ring light marks the primary action, the focus ring, and links. It is not decoration. If a screen has
   three things in the accent colour, two of them are wrong.

## Colour

Tokens live in `packages/renderer/src/styles/tokens.css` and are exposed to Tailwind in `packages/renderer/src/styles/bridge.css`. Values are authored
in OKLCH so lightness steps are perceptually even; the hex beside each is for comparing against a design tool, not for use in code.

### The ladder

The identity tier. These are the only literal colours in the system.

| Token           | Value                    | Hex       | Meaning                                                   |
| --------------- | ------------------------ | --------- | --------------------------------------------------------- |
| `--ground`      | `oklch(16.5% 0.009 266)` | `#0c0e12` | The window itself. The deepest step; nothing is under it. |
| `--surface`     | `oklch(20.5% 0.01 266)`  | `#15171c` | Panes and cards — content that sits on the ground.        |
| `--raised`      | `oklch(25% 0.012 266)`   | `#1f2228` | Things above the page: popovers, hover fills.             |
| `--sunk`        | `oklch(23% 0.012 264)`   | `#1a1d23` | Fields you type into. Recessed, not raised.               |
| `--ink`         | `oklch(92.5% 0.008 85)`  | `#e9e6e0` | Body text. Warm off-white, never pure white.              |
| `--ink-muted`   | `oklch(67% 0.012 262)`   | `#91959d` | Labels and secondary text.                                |
| `--ink-faint`   | `oklch(58% 0.012 262)`   | `#767a82` | Chips and metadata a reader goes looking for.             |
| `--rule`        | `oklch(30% 0.014 264)`   | `#2a2e35` | The default hairline. One border colour everywhere.       |
| `--rule-strong` | `oklch(37% 0.017 264)`   | `#3b4049` | A border that has been hovered or wants noticing.         |
| `--ring-light`  | `oklch(85% 0.075 80)`    | `#e8c996` | The ring. The single accent.                              |

The ink is warm and the ground is cool. That is deliberate: it keeps a near-black screen from reading as blue-grey and gives long sessions of reading
a slightly softer surface than a neutral pairing would.

### The roles

The contract tier. Components address these, never the ladder, so a step can be retuned in one place. `--secondary`, `--accent` and `--popover` all
resolve to `--raised`, which is the system saying they are the same step.

`--background` `--foreground` `--card` `--card-foreground` `--popover` `--popover-foreground` `--primary` `--primary-foreground` `--secondary`
`--secondary-foreground` `--muted` `--muted-foreground` `--accent` `--accent-foreground` `--border` `--border-strong` `--input` `--ring` `--link`

### Status

Status colours have no identity tier — their meaning _is_ their name. Each is used as a tinted fill with a matching border and text, never as a solid
block.

| Token           | Hex       | Meaning                                             |
| --------------- | --------- | --------------------------------------------------- |
| `--destructive` | `#f17070` | Something is broken, or an action cannot be undone. |
| `--warning`     | `#f2a548` | Something needs attention but nothing is lost yet.  |
| `--success`     | `#71c791` | Something finished the way it was meant to.         |
| `--info`        | `#7ba3f6` | Neutral fact worth marking. Carries no urgency.     |

Every foreground token clears WCAG AA against `--ground` (body text at 15.5:1, muted at 6.4:1, the faintest at 4.4:1, and each status colour above
6.7:1). If you introduce a colour, check it before you commit it.

### Radius

`--radius` is `0.375rem` and everything else derives from it: `--radius-sm` is 2px tighter, `--radius-lg` 2px looser, `--radius-xl` 6px looser. Pills
use `rounded-full`. Do not hard-code a radius.

## Typography

**Inter Variable**, self-hosted through `@fontsource-variable/inter` so the app ships its own font and never reaches the network. `--font-sans` is
`"Inter Variable", system-ui, sans-serif`; the fallback is real, so a failed font load degrades rather than breaks.

`--font-mono` is the platform mono stack. Use it for identifiers a human should recognise as stored, verbatim text — branch names, session ids, paths
— and for nothing else.

Antumbra is a dense desktop tool, not a page. The scale is Tailwind's, with one addition:

- `text-2xs` (0.6875rem) — chips, badges, metadata.
- `text-xs` — the working size for most controls and rows.
- `text-sm` — body text and the document default.
- `text-base` and up — reserved for headings; there are very few.

Weight does the emphasis: `font-medium` for anything that leads. Headings carry 600 by a base rule, because Tailwind's preflight otherwise flattens
them to the surrounding weight; any `font-*` utility still overrides it. Bold is essentially unused, and italics are not part of the system.

Agent-authored Markdown — Reports and Artifacts — is a primary surface, not an afterthought. Its treatment lives in
`packages/renderer/src/styles/prose.css` under a single `.markdown` class, which restores the heading ladder, list markers, code fills and table rules
that preflight strips. Anything that renders Markdown should wear that class.

## Components

Components are vendored, not installed. They live in `packages/renderer/src/components/ui/`, written in the shadcn idiom — a `cva` variant table, a
Radix primitive underneath where behaviour is involved, and `cn()` from `#lib/utils.ts` merging the caller's classes last. `components.json` records
the conventions so the layout stays predictable.

Vendored means you may edit them. When a component needs to change, change it here rather than wrapping it somewhere else.

Two house rules constrain how they are written:

- Every source file stays under 150 lines. A component that outgrows the cap is split by responsibility — `dialog.tsx` and `dialog-sections.tsx`,
  `select.tsx` and `select-parts.tsx` — never compressed to fit.
- Motion is defined in `packages/renderer/src/styles/motion.css`, not pulled from an animation library. Overlay surfaces fade and scale by 3% over
  about 120ms, and `prefers-reduced-motion` collapses that to nothing.

Sizes are deliberately small: the default control height is 28px (`h-7`), which is the density this kind of tool wants. Reach for `lg` only when a
control is genuinely the point of the screen.

## Copy

Antumbra's product language is defined in the glossary; this is only about register.

Write plain, specific, lower-stakes English. Prefer the concrete noun to the abstract one and the short sentence to the qualified one.

- **Sentence case** for every heading, button and label. Not Title Case.
- **No terminal punctuation** on labels, buttons or single-line empty states. Full sentences in prose take full stops.
- **Say what happened, not how you feel about it.** "Three files changed" beats "Great — we found 3 changes!". No exclamation marks. No emoji in the
  product.
- **Name the thing that failed and the next move.** "Could not reach the repository — check the remote and try again", not "Something went wrong".
- **Second person for instructions, never first person for the app.** The app does not say "I". It also does not apologise.
- **Never invent vocabulary.** If a concept has a glossary term, use exactly that word; if it does not, it probably needs a glossary entry rather than
  a synonym.

Empty states say what would be here and what puts it here — one line, no illustration, no encouragement.
