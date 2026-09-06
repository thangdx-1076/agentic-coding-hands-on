---
name: separate-hook-logic-from-components
description: "WHICH LAYER a piece of React code belongs to: pure logic (no React), hook (state/effect/ref/transition), or component (JSX only). Activate every time you create or edit any .tsx client component under src/app/** or src/components/**, write useState/useEffect/useRef/useTransition inside a component, see a component pass 150 lines, or when the user says 'extract hook', 'split logic', 'refactor component', 'tách hook', 'tách logic'. Answers only the layer question: where the file lives → nextjs-route-colocation-architecture; what ships next to it → write-unit-tests-and-storybook-stories."
---

# Separate logic from components: which layer is this code?

A component is the **presentation layer**. It receives props and returns JSX. It holds no business rule, calls no API, manages no lifecycle. This rule is mandatory, not a suggestion: every touch of a `.tsx` file applies it.

## Three skills, one question each

| Question | Skill |
|---|---|
| **Which layer is this code: pure logic, hook, or component?** | this skill |
| Where does the file live? | [nextjs-route-colocation-architecture](../nextjs-route-colocation-architecture/SKILL.md) |
| What ships next to it: test, story, MSW handler? | [write-unit-tests-and-storybook-stories](../write-unit-tests-and-storybook-stories/SKILL.md) |

Answer them in that order. This skill decides the *kind*; the location skill's scope ladder decides the *folder*. Paths below are the real, landed `src/` layout.

## Scope: client code only

Server Components (`page.tsx`, `layout.tsx`, async components in `_components/`) have no hooks. They read through `src/dal`, guard access and pass plain props down. This skill applies from the first `"use client"` boundary downward.

## The three layers

| Layer | Lives in (by the scope ladder) | May contain | Must not contain |
|---|---|---|---|
| **Pure logic** | segment `_utils/` when it knows the feature; `src/utils/<topic>/` when generic; `src/domain/<entity>/` when it is a shared business rule; `src/api/` / `src/dal/` when it talks to the backend | Pure functions: validate, format, parse, map, call an SDK. No React import. | `useState`, JSX, direct `window` / `document` access |
| **Hook** | segment `_hooks/use-*.ts`; `src/hooks/` only when it carries no domain knowledge | `useState` / `useEffect` / `useRef` / `useTransition`, event handlers, side effects. Delegates every real computation to the pure layer. | JSX, `className`, design values (colors, spacing) |
| **Component** | segment `_components/`; `src/components/` only for design-system primitives and business-free widgets | JSX, `className`, layout, a11y attributes. Calls exactly **one** hook of its own. | `useEffect`, business conditionals, `fetch`, SDK calls |

## Boundary test: which layer does this statement belong to?

Answer in order and stop at the first "yes":

1. **Does it run without React?** → pure logic. Examples: `isAppLocale()`, `nextPath()`, `signInWithGoogle()`.
2. **Does it need React state, effect or ref?** → hook. Examples: open/close a menu, roving focus, `useTransition` around a Server Action.
3. **Does it only decide how things look?** → component. Example: `open ? "rotate-180" : ""`.

A line that both computes and renders is the exact line to split.

## Mandatory procedure when writing a component

1. **Before typing JSX**, list every state and side effect the component needs.
2. Whatever runs without React → write it in the pure layer first, with its `*.test.ts` beside it.
3. The rest → `use-<name>.ts` returning one clearly named object.
4. The component imports that hook, destructures, renders. No scattered `useState`.
5. Run `pnpm lint && pnpm typecheck`.

## What a hook returns

Return **one named object**, not a positional array. Adding a field later breaks no call site, and the component picks only what it uses.

Two hard constraints come from the React Compiler (enabled through `eslint-plugin-react-hooks`):

**1. Destructure at the call site. Never keep the object.**

```tsx
// RIGHT
const { open, registerRoot, handleMenuKeyDown } = useMenuKeyboardNav({ itemCount });
<div ref={registerRoot}>{open && …}</div>

// WRONG: 10 `react-hooks/refs` errors
const menu = useMenuKeyboardNav({ itemCount });
<div ref={menu.registerRoot}>{menu.open && …}</div>
```

The compiler cannot prove the object returned by a custom hook is not a ref, so it treats **every** `menu.x` read during render as `ref.current` and blocks it, including `menu.open` in `aria-expanded`. This is a real `pnpm lint` error, hit while refactoring `LanguageSelector`, not a warning to skip.

**2. Never expose a `RefObject`. Return a ref callback.**

```ts
const rootRef = useRef<HTMLDivElement>(null);
const registerRoot = useCallback((node: HTMLDivElement | null) => {
  rootRef.current = node;
}, []);
return { registerRoot /* … */ };
```

The ref stays inside the hook, which is the correct layering: a component has no business with `.current`. Wrap in `useCallback` for a stable identity so React does not detach and re-attach the ref on every render.

Exception: an **indexed** ref callback (`registerItem(index)`) must create a new closure per render. Harmless, because React detaches and attaches refs synchronously during commit, before any effect reads `itemRefs.current`. For long lists or constant re-render, cache with `Map<number, RefCallback>`.

## Signs a component is hoarding logic

- A `useEffect` inside a `.tsx` file.
- More than two `useState` in one component.
- A `handle*` function longer than five lines.
- `try/catch`, or a `fetch` / SDK client call.
- A `.tsx` file past 150 lines (the repo hard limit is 200; see `~/.claude/rules/development-rules.md`).
- The same block of logic in two components.

## Example from this repo: `LanguageSelector`

**Before**, 100+ lines of state, effects and keyboard handling mixed with JSX:

```tsx
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => { /* close on outside click */ }, [open]);
  useEffect(() => { itemRefs.current[activeIndex]?.focus(); }, [open, activeIndex]);

  function handleMenuKeyDown(event) { switch (event.key) { /* 6 branches */ } }
  // … then the JSX
}
```

**After**: the roving-index arithmetic (`nextIndex`, `prevIndex`) is pure logic in `src/utils/a11y/roving-index.ts`, tested with vitest and no DOM; the lifecycle is the generic hook `src/hooks/use-menu-keyboard-nav.ts`; the component in `src/app/(public)/_components/language-selector/` only renders:

```tsx
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const {
    open, activeIndex, registerRoot, registerButton, registerItem,
    close, handleButtonClick, handleButtonKeyDown, handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: OPTIONS.length });

  return (
    <div ref={registerRoot} className="relative flex h-14 w-[108px] items-center">
      <button ref={registerButton} aria-expanded={open} onClick={handleButtonClick} onKeyDown={handleButtonKeyDown}>
        …
      </button>
      {open && (
        <div role="menu" onKeyDown={handleMenuKeyDown}>
          …
        </div>
      )}
    </div>
  );
}
```

Destructured immediately, ref callbacks attached, no `menu.rootRef`: the two constraints above, applied for real.

## Why the pure-logic boundary matters in this repo

Logic left inside a `.tsx` file is logic **nobody measures**: components are outside the coverage allowlist on purpose. Pushing it into `_utils/`, `src/utils/`, `src/dal/` or a hook is the only way it enters the report. Which companion files that then requires (colocated test, story, coverage threshold, runner) is the testing skill's job; the configuration is written there and not repeated here.

## Does not apply when

- A purely presentational component with no state. Do not invent a hook for it.
- A single boolean `useState` that only toggles a class (hover, for example). Leave it.
- Icon components and `*-copy.ts` files holding static strings.

Do not split for the sake of splitting. Split when there is real logic.
