"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { lastIndex, nextIndex, prevIndex } from "@/utils/a11y/roving-index";

export type MenuKeyboardNavOptions = {
  /** Số item trong menu. Quyết định biên chạy vòng của con trỏ. */
  itemCount: number;
};

export type MenuKeyboardNav = {
  /** Menu đang mở hay không. */
  open: boolean;
  /** Item đang giữ focus (roving tabindex). */
  activeIndex: number;
  /**
   * Ref callback cho phần tử bao ngoài — dùng để phát hiện click ra ngoài.
   *
   * Hook lộ ra *callback* chứ không lộ `RefObject`: một object trả về có
   * chứa ref khiến React Compiler coi mọi truy cập field lúc render là đọc
   * ref (`react-hooks/refs`). Giữ ref kín trong hook cũng đúng phân lớp hơn.
   */
  registerRoot: (node: HTMLDivElement | null) => void;
  /** Ref callback cho nút mở menu — dùng để trả focus khi đóng. */
  registerButton: (node: HTMLButtonElement | null) => void;
  /**
   * Ref callback cho từng item, theo chỉ số. Item có thể là `<button>` hoặc
   * `<a role="menuitem">` — hook chỉ cần `.focus()` và `tabIndex`, đều có
   * trên `HTMLElement`. `itemCount` vẫn được coi là cố định trong một lần
   * mount (menu tài khoản có 2 hoặc 3 item tuỳ role, nhưng role không đổi
   * giữa các lần render của cùng một phiên).
   */
  registerItem: (index: number) => (node: HTMLElement | null) => void;
  /** Đóng menu. `returnFocus` mặc định true — trả focus về nút mở. */
  close: (returnFocus?: boolean) => void;
  handleButtonClick: () => void;
  handleButtonKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
  handleMenuKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

/**
 * Vòng đời và điều hướng bàn phím của một menu-button theo ARIA APG:
 * ArrowDown/ArrowUp (và Enter/Space) mở menu vào item đầu/cuối, mũi tên
 * chạy vòng qua các item, Home/End nhảy về hai đầu, Escape hoặc Tab đóng.
 * Focus là roving — chỉ item đang active mới tabbable, nên Tab luôn rời
 * khỏi menu thay vì đi lần lượt từng item.
 *
 * Hook giữ state + effect + handler. Phần tính chỉ số nằm ở
 * `lib/ui/roving-index.ts`; phần JSX, class và a11y attribute thuộc về
 * component gọi nó.
 *
 * Giới hạn hiện tại: `itemCount` được coi là cố định trong suốt vòng đời
 * component (caller duy nhất `LanguageSelector` truyền một hằng số module).
 * Nếu về sau có caller truyền danh sách động, hook cần thêm phần cắt bớt
 * slot thừa trong `itemRefs` và kẹp `activeIndex` khi `itemCount` giảm.
 */
export function useMenuKeyboardNav({
  itemCount,
}: MenuKeyboardNavOptions): MenuKeyboardNav {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  // Đưa focus DOM thật lên item đang active mỗi khi nó đổi trong lúc menu mở,
  // để screen reader đọc đúng item mà phím mũi tên vừa nhảy tới.
  useEffect(() => {
    if (!open) return;
    itemRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  const registerRoot = useCallback((node: HTMLDivElement | null) => {
    rootRef.current = node;
  }, []);

  const registerButton = useCallback((node: HTMLButtonElement | null) => {
    buttonRef.current = node;
  }, []);

  function registerItem(index: number) {
    return (node: HTMLElement | null) => {
      itemRefs.current[index] = node;
    };
  }

  function close(returnFocus = true) {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }

  function openMenuAt(index: number) {
    setActiveIndex(index);
    setOpen(true);
  }

  // Mở bằng chuột cũng đi qua openMenuAt(0), không phải toggle trần: effect
  // focus chạy ở mọi lần mở, nên một activeIndex còn sót từ phiên bàn phím
  // trước (ArrowUp → Escape → click) sẽ âm thầm đặt focus sai item.
  function handleButtonClick() {
    if (open) {
      setOpen(false);
    } else {
      openMenuAt(0);
    }
  }

  function handleButtonKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openMenuAt(0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openMenuAt(lastIndex(itemCount));
    }
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((prev) => nextIndex(prev, itemCount));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((prev) => prevIndex(prev, itemCount));
        break;
      case "Home":
        event.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        event.preventDefault();
        setActiveIndex(lastIndex(itemCount));
        break;
      case "Escape":
        event.preventDefault();
        close();
        break;
      case "Tab":
        close(false);
        break;
    }
  }

  return {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  };
}
