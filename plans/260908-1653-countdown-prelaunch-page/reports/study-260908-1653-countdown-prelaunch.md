# Study — Countdown Prelaunch Page (F011 / SCR009)

MoMorph: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
Frame `2268:35127` · design=done · spec=done · dev=none · revision `488626317569a3c31c7bd5caf890174c`

## Design material

Specs: 5 items. Test cases: 17 (4 ACCESSING = auto-generated boilerplate w/ `---` expected, no real
requirement; 7 GUI; 6 FUNCTION).

Node tree — flat, 4 real layers:

```
2268:35127 Countdown - Prelaunch page (FRAME)
├── 2268:35129 MM_MEDIA_BG Image (RECTANGLE)   full-bleed background
├── 2268:35130 Cover            (RECTANGLE)   dark translucent overlay
└── 2268:35131 Bìa → 35132 → 35135 → 35136 Countdown time
    ├── 2268:35137 TEXT  "Sự kiện sẽ bắt đầu sau"
    └── 2268:35138 Time
        ├── 2268:35139 1_Days     → Frame 485 (Group 5 + Group 4) + 35143 "DAYS"
        ├── 2268:35144 2_Hours    → Frame 485 (Group 5 + Group 4) + 35148 "HOURS"
        └── 2268:35149 3_Minutes  → Frame 485 (Group 5 + Group 4) + 35153 "MINUTES"
```

The `Frame 485 / Group 5 / Group 4 / LABEL` sub-tree is **byte-identical in shape** to the homepage
hero countdown (`mm:2167:9037`), already built as `CountdownTiles`.

## What the repo already has (reuse, do not rebuild)

| Concern | Existing artifact | Verdict |
|---|---|---|
| days/hours/min math, clamp-at-zero, `pad2` | `src/app/(public)/(home)/_utils/countdown.ts` | reuse as-is, covers FUNCTION TCs |
| 1s tick + SSR-seeded hydration | `src/app/(public)/(home)/_hooks/use-countdown.ts` | reuse |
| LED digit tiles + labels | `src/app/(public)/(home)/_components/countdown-tiles.tsx` | reuse |
| target datetime | `EVENT_START_AT` env, validated in `(home)/page.tsx:152` | reuse — resolves the spec's `TODO: thiết kế API endpoint` |

`remaining()` already returns `reached`, and already clamps negatives to 0 — TCs `50fc4021`
(all-zero on complete), `b373626d` (DAYS 00 under one day), `f98adad8`/`724e6e17` (HOURS/MINUTES
out-of-range → 00) pass against the existing pure function without a line of new math.

## The one genuinely new thing: the navigation lock

Spec item `1` (`2268:35139`), `transitionNote`:

> Khi countdown về 0: người dùng được phép điều hướng đến các trang khác.
> Khi chưa về 0: toàn bộ điều hướng đến các trang khác bị khóa.

"Toàn bộ" includes direct URL entry, so a client-side guard is not an implementation of this — it
must be `src/middleware.ts`. No middleware exists in the repo today.

### Hazard found (drives D3)

`playwright.config.ts:70` pins `EVENT_START_AT: "2099-12-31T18:30:00+07:00"` for the e2e web server,
and `.env.local:4` holds `2026-12-26T18:30:00+07:00`. Both are in the future. A middleware that locks
purely on "target not yet reached" would redirect **every route** to `/prelaunch` in local dev and in
CI — all 135 existing e2e tests go red and the app becomes unreachable on a dev machine.

The lock therefore needs its own explicit opt-in switch, defaulting OFF.

## Unresolved questions

- None blocking. The spec's API-endpoint TODO is resolved by the existing `EVENT_START_AT` pattern
  (D2); revisit only if the event date must become editable at runtime.
