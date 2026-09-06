export type AwardsEmptyStateProps = {
  message: string;
};

/**
 * Fail-open placeholder rendered instead of the nav + 6 sections when
 * `awards.length === 0` (Supabase unreachable — clarifications.md § Supabase
 * fail thì trang hiển thị gì). The rest of the page chrome (hero, header,
 * Kudos, footer) still renders around it; this never throws and the route
 * never 500s. No dedicated design exists for this state — the layout below
 * is the minimal necessary inference to keep the page from looking broken.
 */
export function AwardsEmptyState({ message }: AwardsEmptyStateProps) {
  return (
    <div className="flex w-full flex-col items-center gap-4 rounded-2xl border border-login-divider px-6 py-16 text-center">
      <p className="font-montserrat text-lg leading-7 font-bold text-white">
        {message}
      </p>
    </div>
  );
}
