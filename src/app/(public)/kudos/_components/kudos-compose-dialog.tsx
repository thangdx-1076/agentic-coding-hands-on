import type { ReactNode } from "react";

export type KudosComposeDialogProps = {
  /** Wired to the native `cancel` event (Escape key on a modal dialog, C07). */
  onCancel: () => void;
  /** Ref callback for the underlying `<dialog>` node — phase-07's hook reads
   * it to call `showModal()`/`close()`. This component owns no ref itself. */
  registerDialog: (node: HTMLDialogElement | null) => void;
  /** mm:I520:11647;520:9870 (A) — dialog heading, copy-sourced. */
  title: string;
  /** R2: phases 09-12's fields render here, in the scrollable region. */
  children: ReactNode;
  /** R3: this phase's own `KudosComposeFooter`, static (never scrolls). */
  footer: ReactNode;
};

/**
 * mm:520:11647 "Viết KUDO" instance
 * (https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 *
 * Native `<dialog>` shell only — no `useState`/`useEffect`/`showModal()`
 * here (clarifications.md § "Dựng modal bằng gì"; lifecycle belongs to
 * phase-07's hook). Three static regions per the phase's architecture notes:
 * the title (R1), a scrollable `children` slot (R2 — flex-1/min-h-0/
 * overflow-y-auto so a body taller than the viewport scrolls instead of
 * pushing the footer off-screen, see the `LongBody` story), and a static
 * `footer` slot (R3, this phase's `KudosComposeFooter`).
 *
 * Contract: this component NEVER renders the `open` attribute itself —
 * there is deliberately no `open` prop. The caller opens the dialog by
 * calling `.showModal()` (and closes it with `.close()`) on the node
 * `registerDialog` hands back — that's phase-07's `use-kudos-compose-dialog`
 * hook, reacting to its own `open` state. A prior version of this file
 * bound an `open` boolean prop straight onto the JSX `open` attribute; that
 * is unsafe with `<dialog>`: React commits the attribute during render,
 * so by the time the hook's effect runs, `node.open` already reads `true`
 * and the effect's `if (!node.open) node.showModal()` guard skips the call
 * entirely — the dialog ends up merely `open`, never `show-modal`-ed, so it
 * renders NON-modal: no `::backdrop`, no top-layer, no focus trap, no
 * Escape-triggers-`cancel`. That defeats the exact reason clarifications.md
 * chose native `<dialog>` in the first place. Only `.showModal()`/`.close()`
 * may ever touch the `open` attribute; this file must stay uninvolved.
 *
 * The dim background is the native `::backdrop` pseudo-element (Tailwind's
 * `backdrop:` variant) at the exact color/opacity of the design's `Mask`
 * node (`520:11646`, `rgba(0,16,26,0.8)` = `login-background` at 80%) — NOT
 * a separate mask `<div>`; `showModal()` already produces the equivalent
 * stacking context.
 *
 * `open:flex` (not a bare `flex`) is deliberate: a closed native `<dialog>`
 * is `display:none` via the UA stylesheet, and an unconditional author
 * `display:flex` utility would beat that UA rule (author origin > user-agent
 * origin), permanently showing the closed dialog. Scoping `flex` to the
 * `[open]` attribute selector keeps the UA's own hide-when-closed behavior
 * intact — and still works with zero React involvement in the attribute,
 * since `showModal()` is what actually sets `[open]` on the DOM node.
 *
 * `m-auto` is required, not decorative: the UA centers a `showModal()`ed
 * dialog via `dialog:modal { position: fixed; inset: 0; margin: auto; }`,
 * but Tailwind's own Preflight (`@layer base`) resets `margin: 0` on the
 * universal selector — an AUTHOR-origin rule that beats the UA's `margin:
 * auto` outright, which is exactly why this rendered pinned to the
 * viewport's top-left instead of centered. `m-auto` is a Tailwind
 * `@layer utilities` rule, and utilities is declared after base, so it wins
 * back the centering regardless of selector specificity. `position`/`inset`
 * are left alone deliberately — nothing in this class list sets either, so
 * the UA's `fixed`/`inset: 0` are confirmed intact (verified: no
 * `position-*`/`inset-*`/`top-*`/`left-*` utility appears anywhere above).
 *
 * `max-h-[calc(100vh-12px)]`: measured from the frame's own panel
 * (`get_node` on `520:11647`, 1012px tall inside a 1440×1024 canvas —
 * `520:11602`) against its canvas height (1024 − 1012 = 12px total
 * vertical gutter), not a guessed `90vh`. A `calc()` gutter travels better
 * across real viewport heights than replaying that ratio as a raw
 * percentage; combined with `m-auto` the gutter splits evenly top/bottom
 * (unlike the mock's own asymmetric 10px/2px split, which centering by
 * definition can't reproduce and isn't the point of centering).
 */
export function KudosComposeDialog({
  onCancel,
  registerDialog,
  title,
  children,
  footer,
}: KudosComposeDialogProps) {
  return (
    // mm:520:11647
    <dialog
      ref={registerDialog}
      data-testid="kudos-compose-dialog"
      aria-labelledby="kudos-compose-title"
      onCancel={onCancel}
      className="m-auto max-h-[calc(100vh-12px)] w-[752px] flex-col gap-8 rounded-3xl bg-[#FFF8E1] p-10 text-login-button-text open:flex backdrop:bg-login-background/80"
    >
      {/* mm:I520:11647;520:9870 (A) */}
      <h2
        id="kudos-compose-title"
        data-testid="kudos-compose-title"
        className="shrink-0 text-center font-montserrat text-[32px] leading-10 font-bold"
      >
        {title}
      </h2>
      <div className="flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto">
        {children}
      </div>
      {footer}
    </dialog>
  );
}
