"use client";

import type { StandardsCopy } from "../_shared/standards-copy";
import { useStandardsClose } from "../_hooks/use-standards-close";

import { StandardsScreen } from "./standards-screen";

export type StandardsClientProps = {
  copy: StandardsCopy;
};

/**
 * Client boundary of `/standards` — mirrors `/awards/_components/awards-client.tsx`.
 * `onClose` is a plain function prop and can't cross a Server Component
 * render, so this is where `useStandardsClose` (phase 03) gets wired to
 * `StandardsScreen` (phase 04). Destructured immediately at the call site
 * rather than held as an object, per the hook's own doc comment (avoids
 * tripping the React Compiler's `react-hooks/refs` rule).
 */
export function StandardsClient({ copy }: StandardsClientProps) {
  const { handleClose } = useStandardsClose();

  return <StandardsScreen copy={copy} onClose={handleClose} />;
}
