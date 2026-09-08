import { act, renderHook } from "@testing-library/react";
import type { SyntheticEvent } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSecretBoxDialog } from "./use-secret-box-dialog";

/**
 * jsdom (v30, pinned by this repo) does not implement `<dialog>`'s
 * imperative methods — stub them explicitly, same pattern as
 * `use-kudos-compose-dialog.test.ts`.
 */
function createStubDialog() {
  const dialog = document.createElement("dialog");
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

describe("useSecretBoxDialog", () => {
  afterEach(() => {
    document.body.style.overflow = "";
  });

  it("registerDialog(null) an toàn — open()/close() không throw khi chưa gắn node", () => {
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    expect(() => {
      act(() => {
        result.current.registerDialog(null);
        result.current.open();
        result.current.close();
      });
    }).not.toThrow();
    unmount();
  });

  it("open() gọi showModal() đúng 1 lần dù gọi open() 2 lần liên tiếp", () => {
    const { dialog, showModal } = createStubDialog();
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.open();
      result.current.open();
    });

    expect(showModal).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("close() gọi node.close() khi đang mở", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    act(() => {
      result.current.close();
    });

    expect(close).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("close() khi dialog đã đóng sẵn → không gọi lại node.close()", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.close();
    });

    expect(close).not.toHaveBeenCalled();
    unmount();
  });

  it("onCancel (Escape) đóng dialog qua cùng đường close()", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    act(() => {
      result.current.onCancel({} as SyntheticEvent<HTMLDialogElement>);
    });

    expect(close).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("mở dialog khoá scroll body (overflow: hidden), đóng thì trả lại giá trị cũ", () => {
    const { dialog } = createStubDialog();
    document.body.style.overflow = "auto";
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    expect(document.body.style.overflow).toBe("hidden");

    act(() => {
      result.current.close();
    });
    expect(document.body.style.overflow).toBe("auto");
    unmount();
  });

  it("unmount khi đang mở → trả lại overflow ban đầu (không rò rỉ)", () => {
    const { dialog } = createStubDialog();
    document.body.style.overflow = "auto";
    const { result, unmount } = renderHook(() => useSecretBoxDialog());

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open();
    });
    expect(document.body.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });

  it("chưa từng open() → unmount không đụng tới overflow", () => {
    const { unmount } = renderHook(() => useSecretBoxDialog());
    document.body.style.overflow = "auto";

    unmount();
    expect(document.body.style.overflow).toBe("auto");
  });
});
