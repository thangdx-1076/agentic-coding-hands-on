"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import type { SunnerSuggestion } from "@/dal/sunner-search";

/** Opens the "Viết Kudo" dialog, optionally pre-selecting a recipient. */
export type OpenCompose = (recipient: SunnerSuggestion | null) => void;

type KudosComposeContextValue = {
  open: OpenCompose;
  /** `KudosComposeLauncher` calls this on mount with its own opener, and
   * with `null` on unmount. */
  register: (opener: OpenCompose | null) => void;
};

const KudosComposeContext = createContext<KudosComposeContextValue | null>(
  null,
);

/**
 * Lets a kudo CARD open the compose dialog, which is not its ancestor.
 *
 * The dialog belongs to `KudosComposeLauncher`, mounted inside the key-visual
 * band; the cards that need to trigger it live in the Highlight carousel and
 * the feed — siblings, several levels down each. Threading an `onCompose`
 * callback from `kudos-client` through screen → band → carousel → card →
 * person would put a prop on five components that do not otherwise care.
 *
 * The launcher REGISTERS its opener rather than the provider owning the
 * dialog state: the dialog's whole state machine (draft, validation,
 * submission) already lives in that one component, and splitting it would
 * be a much larger change than this indirection. The opener is held in a
 * ref, so registering it never re-renders a consumer.
 *
 * `open` is a no-op until the launcher registers — which is correct rather
 * than merely defensive: `/kudos` renders for signed-out visitors too, and
 * a card must not crash because the compose flow is not available.
 */
export function KudosComposeProvider({ children }: { children: ReactNode }) {
  const openerRef = useRef<OpenCompose | null>(null);

  const register = useCallback((opener: OpenCompose | null) => {
    openerRef.current = opener;
  }, []);

  const open = useCallback<OpenCompose>((recipient) => {
    openerRef.current?.(recipient);
  }, []);

  const value = useMemo(() => ({ open, register }), [open, register]);

  return (
    <KudosComposeContext.Provider value={value}>
      {children}
    </KudosComposeContext.Provider>
  );
}

/** `null` outside the provider — Storybook renders these components alone. */
export function useKudosCompose(): KudosComposeContextValue | null {
  return useContext(KudosComposeContext);
}
