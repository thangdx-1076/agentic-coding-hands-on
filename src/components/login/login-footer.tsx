export type LoginFooterProps = {
  copyright: string;
};

/**
 * Fixed bottom bar with the copyright notice (mm:662:14447). Not
 * interactive (TC 33a1dacf).
 */
export function LoginFooter({ copyright }: LoginFooterProps) {
  return (
    /* mm:662:14447 */
    <footer className="fixed inset-x-0 bottom-0 z-20 flex w-full items-center justify-center border-t border-login-divider bg-login-background px-6 py-6 sm:px-12 sm:py-8 lg:px-[90px] lg:py-10">
      {/* mm:I662:14447;342:1413 */}
      <p className="font-montserrat-alternates text-center text-base leading-6 font-bold tracking-normal text-white">
        {copyright}
      </p>
    </footer>
  );
}
