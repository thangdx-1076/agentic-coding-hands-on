"use client";

import { useId, useState } from "react";

import { IconDown } from "../../../_components/language-selector/icon-down";
import type { KudosDirection, ProfileCopy } from "../_shared/profile-copy";

import { useMenuKeyboardNav } from "@/hooks/use-menu-keyboard-nav";

export type KudosDirectionSelectProps = {
  /** Server đã quyết định danh sách (self: cả 2 chiều; other: chỉ
   * `["received"]` — SEC_001). Component chỉ map, không tự thêm/bớt option. */
  directions: KudosDirection[];
  copy: ProfileCopy["kudosDirection"];
};

const LABEL_KEY: Record<KudosDirection, "receivedLabel" | "sentLabel"> = {
  received: "receivedLabel",
  sent: "sentLabel",
};

const EMPTY_KEY: Record<KudosDirection, "emptyReceived" | "emptySent"> = {
  received: "emptyReceived",
  sent: "emptySent",
};

/**
 * Kudos direction dropdown (mm:362:5089 `mms_C.3_Button`) — the ONE client
 * leaf of phase 05 (local `useState`, no I/O, no router — deliberate
 * deviation from Track A's usual server-only rule, see Key Insights). ARIA
 * combobox/listbox pattern rather than `LanguageSelector`'s menu pattern,
 * because `tests/e2e/profile.spec.ts` C9 locates
 * `select, [role='combobox'], [role='listbox']` directly. Trigger shows
 * `{Nhãn} ({count})`; count is ALWAYS `0` — the design's own example shows
 * "Đã gửi (5)", but the build always initializes at 0 (FR-303/FR-304).
 */
export function KudosDirectionSelect({
  directions,
  copy,
}: KudosDirectionSelectProps) {
  const listboxId = useId();
  const [selected, setSelected] = useState<KudosDirection>(directions[0]);
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: directions.length });

  function handleSelect(direction: KudosDirection) {
    setSelected(direction);
    close(false);
  }

  return (
    // mm:362:5089
    <div
      ref={registerRoot}
      className="relative flex w-full max-w-[286px] flex-col"
    >
      <button
        ref={registerButton}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded border border-[#998C5F] bg-[rgba(255,234,158,0.10)] px-6 py-4 text-white transition-colors duration-200 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-login-background motion-reduce:transition-none"
      >
        {/* mm:I362:5089;186:2760 */}
        <span className="font-montserrat text-base leading-6 font-bold tracking-[0.15px]">
          {copy[LABEL_KEY[selected]]} (0)
        </span>
        <IconDown
          className={`h-6 w-6 shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          // Roving tabindex: focus lives on the active `option` button (see
          // `useMenuKeyboardNav`), never on this wrapper — same
          // justification as `LanguageSelector`'s menu div.
          tabIndex={-1}
          onKeyDown={handleMenuKeyDown}
          className="animate-login-menu-in absolute top-full left-0 z-30 mt-1 w-full overflow-hidden rounded bg-[#0B0F12] shadow-lg"
        >
          {directions.map((direction, index) => (
            <button
              key={direction}
              ref={registerItem(index)}
              type="button"
              role="option"
              aria-selected={selected === direction}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => handleSelect(direction)}
              className="w-full cursor-pointer px-6 py-2 text-left font-montserrat text-base font-bold text-white transition-colors duration-200 ease-out outline-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white motion-reduce:transition-none"
            >
              {copy[LABEL_KEY[direction]]} (0)
            </button>
          ))}
        </div>
      )}
      {/* mm:362:5091 — empty-state copy for the selected direction, always
          shown (feed rỗng LUÔN, không phải danh sách trống im lặng —
          FR-305/FUN_011/FUN_012). Feed cards themselves stay out of scope
          (mms_D_Post all, F007+). */}
      <p className="font-montserrat mt-6 text-base leading-6 text-white/70">
        {copy[EMPTY_KEY[selected]]}
      </p>
    </div>
  );
}
