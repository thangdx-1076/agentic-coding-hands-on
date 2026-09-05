import { act, fireEvent, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMenuKeyboardNav } from "./use-menu-keyboard-nav";

/**
 * Không mock gì ở đây: `lib/ui/roving-index.ts` là logic chỉ số thật (đã có
 * bộ test riêng), và hai cơ chế còn lại (outside-click, focus) cần DOM thật
 * để có nghĩa — mock chúng đi thì test không còn kiểm tra gì cả.
 */

/**
 * Dựng root/button/item DOM THẬT, gắn vào `document.body`. jsdom chỉ set
 * `document.activeElement` cho phần tử đã nối vào cây tài liệu (phần tử rời
 * cây không nhận focus), và `Node.contains` cần cây thật để phép so sánh
 * outside/inside-click có nghĩa.
 */
function buildMenuDom(itemCount: number) {
  const root = document.createElement("div");
  const button = document.createElement("button");
  const items = Array.from({ length: itemCount }, () =>
    document.createElement("button"),
  );

  items.forEach((item) => root.appendChild(item));
  document.body.appendChild(root);
  document.body.appendChild(button);

  return { root, button, items };
}

/**
 * Event bàn phím tối giản: các handler chỉ đọc `.key` và gọi
 * `.preventDefault()`, nên không cần dispatch một KeyboardEvent thật qua
 * `fireEvent` — gọi thẳng hàm trả về là đủ (KISS, đúng như phase chỉ định).
 */
function buildKeyEvent<T extends Element>(key: string): KeyboardEvent<T> {
  return { key, preventDefault: vi.fn() } as unknown as KeyboardEvent<T>;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("useMenuKeyboardNav", () => {
  describe("handleButtonClick", () => {
    it("mở menu ở item đầu khi đang đóng, đóng khi đang mở (toggle)", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);
      expect(result.current.activeIndex).toBe(0);

      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(false);

      unmount();
    });
  });

  describe("handleButtonKeyDown", () => {
    it("ArrowDown mở menu ở item đầu và gọi preventDefault", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      const event = buildKeyEvent<HTMLButtonElement>("ArrowDown");
      act(() => {
        result.current.handleButtonKeyDown(event);
      });

      expect(result.current.open).toBe(true);
      expect(result.current.activeIndex).toBe(0);
      expect(event.preventDefault).toHaveBeenCalledOnce();

      unmount();
    });

    it("ArrowUp mở menu ở item cuối và gọi preventDefault", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      const event = buildKeyEvent<HTMLButtonElement>("ArrowUp");
      act(() => {
        result.current.handleButtonKeyDown(event);
      });

      expect(result.current.open).toBe(true);
      expect(result.current.activeIndex).toBe(2); // lastIndex(3)
      expect(event.preventDefault).toHaveBeenCalledOnce();

      unmount();
    });

    it("phím khác không mở menu và không gọi preventDefault", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      const event = buildKeyEvent<HTMLButtonElement>("a");
      act(() => {
        result.current.handleButtonKeyDown(event);
      });

      expect(result.current.open).toBe(false);
      expect(event.preventDefault).not.toHaveBeenCalled();

      unmount();
    });
  });

  describe("handleMenuKeyDown", () => {
    it("ArrowDown chạy vòng: itemCount 2, bấm 3 lần → 1 → 0 → 1", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 2 }),
      );

      // Bước thứ 2 của chuỗi này (1 → 0) chính là "ArrowDown từ item cuối
      // vòng về đầu".
      [1, 0, 1].forEach((expectedIndex) => {
        const event = buildKeyEvent<HTMLDivElement>("ArrowDown");
        act(() => {
          result.current.handleMenuKeyDown(event);
        });
        expect(result.current.activeIndex).toBe(expectedIndex);
        expect(event.preventDefault).toHaveBeenCalledOnce();
      });

      unmount();
    });

    it("ArrowUp từ item đầu (0) vòng về item cuối", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      const event = buildKeyEvent<HTMLDivElement>("ArrowUp");
      act(() => {
        result.current.handleMenuKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(2); // lastIndex(3)
      expect(event.preventDefault).toHaveBeenCalledOnce();

      unmount();
    });

    it("Home nhảy activeIndex về 0, End nhảy về item cuối", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      act(() => {
        result.current.handleMenuKeyDown(
          buildKeyEvent<HTMLDivElement>("ArrowDown"),
        );
      });
      act(() => {
        result.current.handleMenuKeyDown(
          buildKeyEvent<HTMLDivElement>("ArrowDown"),
        );
      });
      expect(result.current.activeIndex).toBe(2);

      const homeEvent = buildKeyEvent<HTMLDivElement>("Home");
      act(() => {
        result.current.handleMenuKeyDown(homeEvent);
      });
      expect(result.current.activeIndex).toBe(0);
      expect(homeEvent.preventDefault).toHaveBeenCalledOnce();

      const endEvent = buildKeyEvent<HTMLDivElement>("End");
      act(() => {
        result.current.handleMenuKeyDown(endEvent);
      });
      expect(result.current.activeIndex).toBe(2);
      expect(endEvent.preventDefault).toHaveBeenCalledOnce();

      unmount();
    });

    it("phím lạ không đổi activeIndex và không gọi preventDefault (nhánh default)", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      const event = buildKeyEvent<HTMLDivElement>("a");
      act(() => {
        result.current.handleMenuKeyDown(event);
      });

      expect(result.current.activeIndex).toBe(0);
      expect(event.preventDefault).not.toHaveBeenCalled();

      unmount();
    });

    it("Escape đóng menu và trả focus về nút mở (returnFocus mặc định true)", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );
      const { button } = buildMenuDom(3);

      act(() => {
        result.current.registerButton(button);
      });
      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);

      const event = buildKeyEvent<HTMLDivElement>("Escape");
      act(() => {
        result.current.handleMenuKeyDown(event);
      });

      expect(result.current.open).toBe(false);
      expect(event.preventDefault).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(button);

      unmount();
    });

    it("Tab đóng menu và KHÔNG trả focus, dù đã có nút gắn sẵn", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );
      const { button } = buildMenuDom(3);

      act(() => {
        result.current.registerButton(button);
      });
      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);

      const event = buildKeyEvent<HTMLDivElement>("Tab");
      act(() => {
        result.current.handleMenuKeyDown(event);
      });

      expect(result.current.open).toBe(false);
      // Tab không preventDefault: phải để trình duyệt tự chuyển focus ra
      // ngoài widget, không phải nhánh nào khác trong switch cũng vậy.
      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(document.activeElement).not.toBe(button);

      unmount();
    });
  });

  describe("close", () => {
    it("close(true) trả focus về nút khi đã gắn button", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );
      const { button } = buildMenuDom(3);

      act(() => {
        result.current.registerButton(button);
      });
      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.close(true);
      });

      expect(result.current.open).toBe(false);
      expect(document.activeElement).toBe(button);

      unmount();
    });

    it("close(true) không throw và không trả focus khi CHƯA gắn button nào", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );

      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);

      // `buttonRef.current` là null ở đây — `?.focus()` phải short-circuit
      // êm, không ném lỗi. Chạy tới được assertion dưới đây tức là không throw.
      act(() => {
        result.current.close(true);
      });

      expect(result.current.open).toBe(false);

      unmount();
    });

    it("close(false) không trả focus dù đã gắn button", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 3 }),
      );
      const { button } = buildMenuDom(3);

      act(() => {
        result.current.registerButton(button);
      });
      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);

      act(() => {
        result.current.close(false);
      });

      expect(result.current.open).toBe(false);
      expect(document.activeElement).not.toBe(button);

      unmount();
    });
  });

  describe("outside-click và focus effect (DOM thật)", () => {
    it("mousedown ngoài root đóng menu; bên trong root giữ menu mở; focus theo activeIndex", () => {
      const { result, unmount } = renderHook(() =>
        useMenuKeyboardNav({ itemCount: 2 }),
      );
      const { root, button, items } = buildMenuDom(2);

      act(() => {
        result.current.registerRoot(root);
        result.current.registerButton(button);
        result.current.registerItem(0)(items[0]);
        result.current.registerItem(1)(items[1]);
      });

      act(() => {
        result.current.handleButtonClick();
      });
      expect(result.current.open).toBe(true);
      expect(document.activeElement).toBe(items[0]);

      act(() => {
        result.current.handleMenuKeyDown(
          buildKeyEvent<HTMLDivElement>("ArrowDown"),
        );
      });
      expect(result.current.activeIndex).toBe(1);
      expect(document.activeElement).toBe(items[1]);

      // Click bên TRONG root (một item) không phải outside-click — menu
      // phải giữ nguyên trạng thái mở.
      fireEvent.mouseDown(items[1]);
      expect(result.current.open).toBe(true);

      // Click ngoài root (document.body) mới là outside-click thật.
      fireEvent.mouseDown(document.body);
      expect(result.current.open).toBe(false);

      unmount();
    });
  });
});
