import Image from "next/image";
import { LanguageSelector } from "./language-selector";

export type LoginHeaderProps = {
  logoAlt: string;
  languageLabel: "VN" | "EN";
  onSelectLocale?: (locale: "vi" | "en") => void;
};

/**
 * Sticky top navigation bar (mm:662:14391): static brand logo + language
 * switcher. Not interactive beyond the language selector (logo has no link).
 */
export function LoginHeader({ logoAlt, languageLabel, onSelectLocale }: LoginHeaderProps) {
  return (
    /* mm:662:14391 */
    <header className="sticky top-0 z-20 flex w-full items-center justify-between bg-[rgba(11,15,18,0.8)] px-6 py-3 sm:px-12 lg:px-36">
      {/* mm:I662:14391;186:2166 */}
      <div className="flex h-14 w-[52px] items-center">
        {/* mm:I662:14391;178:1033 */}
        {/* mm:I662:14391;178:1033;178:1030 */}
        <Image
          src="/login/Logo.png"
          alt={logoAlt}
          width={52}
          height={48}
          priority
          className="h-12 w-[52px] object-contain"
        />
      </div>
      {/* mm:I662:14391;186:1601 */}
      <LanguageSelector label={languageLabel} onSelect={onSelectLocale} />
    </header>
  );
}
