import { act, renderHook } from "@testing-library/react";
import type { SyntheticEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useKudosComposeDialog } from "./use-kudos-compose-dialog";

/**
 * jsdom (v30, pinned by this repo) does not implement `<dialog>`'s
 * imperative methods at all — `showModal`/`close` are `undefined`, not
 * no-ops — so every test needing a "real" dialog stubs them explicitly,
 * exactly per phase-07's plan ("bước 2 stub tường minh"). `open` IS a
 * genuine reflected boolean property in jsdom, so that half behaves like a
 * real browser.
 */
function createStubDialog() {
  const dialog = document.createElement("dialog");
  // Plain local consts (not `dialog.showModal`/`dialog.close` property
  // access) are what tests assert against below — `HTMLDialogElement`
  // declares these as interface methods, and TypeScript flags a bare
  // `dialog.showModal` reference as an "unbound method" regardless of it
  // being a `vi.fn()` at runtime (`@typescript-eslint/unbound-method`).
  const showModal = vi.fn(() => {
    dialog.open = true;
  });
  const close = vi.fn(() => {
    dialog.open = false;
  });
  dialog.showModal = showModal;
  dialog.close = close;
  return { dialog, showModal, close };
}

describe("useKudosComposeDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("bắt đầu ở trạng thái đóng", () => {
    const { result, unmount } = renderHook(() => useKudosComposeDialog());
    expect(result.current.isOpen).toBe(false);
    unmount();
  });

  it("open() khi chưa registerDialog → không làm gì, isOpen vẫn false", () => {
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(false);
    unmount();
  });

  it("open() gọi showModal() đúng 1 lần dù gọi open() 2 lần liên tiếp", () => {
    const { dialog, showModal } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.open();
      result.current.open();
    });

    expect(showModal).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(true);
    unmount();
  });

  it("close() gọi node.close() khi đang mở, và luôn gọi onClose", () => {
    const { dialog, close } = createStubDialog();
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() =>
      useKudosComposeDialog(onClose),
    );

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    act(() => {
      result.current.close();
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("close() khi dialog đã đóng sẵn → không gọi lại node.close(), vẫn isOpen=false", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.close();
    });

    expect(close).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    unmount();
  });

  it("close() khi chưa registerDialog → không throw, vẫn isOpen=false", () => {
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    expect(() => {
      act(() => {
        result.current.close();
      });
    }).not.toThrow();
    expect(result.current.isOpen).toBe(false);
    unmount();
  });

  it("close() không truyền onClose → không throw", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });

    expect(() => {
      act(() => {
        result.current.close();
      });
    }).not.toThrow();
    unmount();
  });

  it("onCancel (Escape) đóng dialog và gọi onClose", () => {
    const { dialog, close } = createStubDialog();
    const onClose = vi.fn();
    const { result, unmount } = renderHook(() =>
      useKudosComposeDialog(onClose),
    );

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    act(() => {
      result.current.onCancel({} as SyntheticEvent<HTMLDialogElement>);
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("mở dialog khoá scroll body (overflow: hidden)", () => {
    const { dialog } = createStubDialog();
    document.body.style.overflow = "auto";
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
  });

  it("đóng dialog trả lại đúng giá trị overflow ban đầu", () => {
    const { dialog } = createStubDialog();
    document.body.style.overflow = "auto";
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    act(() => {
      result.current.close();
    });

    expect(document.body.style.overflow).toBe("auto");
    unmount();
  });

  it("unmount khi đang mở → trả lại overflow ban đầu (không rò rỉ)", () => {
    const { dialog } = createStubDialog();
    document.body.style.overflow = "auto";
    const { result, unmount } = renderHook(() => useKudosComposeDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("chưa từng open() → unmount không đụng tới overflow", () => {
    const { unmount } = renderHook(() => useKudosComposeDialog());
    document.body.style.overflow = "auto";

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
