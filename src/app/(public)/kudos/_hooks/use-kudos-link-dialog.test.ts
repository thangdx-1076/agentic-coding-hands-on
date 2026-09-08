import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useKudosLinkDialog } from "./use-kudos-link-dialog";

/**
 * Same jsdom gap `use-kudos-compose-dialog.test.ts` documents: `<dialog>`'s
 * imperative methods (`showModal`/`close`) are `undefined` in jsdom, so
 * every test that needs a "real" dialog stubs them explicitly. `open` IS a
 * genuine reflected boolean property in jsdom.
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

function makeTextarea(
  value: string,
  start: number,
  end = start,
): HTMLTextAreaElement {
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setSelectionRange(start, end);
  return textarea;
}

describe("useKudosLinkDialog", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("bắt đầu đóng, 2 trường rỗng, không lỗi", () => {
    const { result, unmount } = renderHook(() => useKudosLinkDialog());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.text).toBe("");
    expect(result.current.url).toBe("");
    expect(result.current.errors).toEqual({});
    unmount();
  });

  it("open() khi chưa registerDialog → không làm gì, isOpen vẫn false", () => {
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.open(textarea);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.text).toBe("");
    unmount();
  });

  it("open(textarea) không có selection (collapsed) → prefill text rỗng, showModal() 1 lần, isOpen=true (L01)", () => {
    const { dialog, showModal } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 5, 5);

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.open(textarea);
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.text).toBe("");
    expect(result.current.url).toBe("");
    expect(showModal).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("open(textarea) có selection 'hello' → prefill text = 'hello' (L09, DEC-001)", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.open(textarea);
    });

    expect(result.current.text).toBe("hello");
    unmount();
  });

  it("open() gọi 2 lần liên tiếp → showModal() chỉ gọi 1 lần (đã open rồi)", () => {
    const { dialog, showModal } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
      result.current.open(textarea);
    });

    expect(showModal).toHaveBeenCalledTimes(1);
    unmount();
  });

  it("setText cập nhật state và xoá lỗi text (nhưng giữ lỗi url)", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("", 0, 0);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
    });
    act(() => {
      result.current.save(); // both empty → cả 2 lỗi
    });
    expect(result.current.errors).toEqual({
      text: "errorRequired",
      url: "errorRequired",
    });

    act(() => {
      result.current.setText("Sample Link");
    });

    expect(result.current.text).toBe("Sample Link");
    expect(result.current.errors).toEqual({ url: "errorRequired" });
    unmount();
  });

  it("setUrl cập nhật state và xoá lỗi url (nhưng giữ lỗi text)", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("", 0, 0);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
    });
    act(() => {
      result.current.save();
    });
    expect(result.current.errors).toEqual({
      text: "errorRequired",
      url: "errorRequired",
    });

    act(() => {
      result.current.setUrl("https://example.com");
    });

    expect(result.current.url).toBe("https://example.com");
    expect(result.current.errors).toEqual({ text: "errorRequired" });
    unmount();
  });

  it("onUrlBlur với url không hợp lệ → set lỗi url; hợp lệ → xoá lỗi url (BR-008)", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("", 0, 0);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
    });
    act(() => {
      result.current.setUrl("www");
    });
    act(() => {
      result.current.onUrlBlur();
    });
    expect(result.current.errors).toEqual({ url: "errorUrlLength" });

    act(() => {
      result.current.setUrl("https://example.com");
    });
    act(() => {
      result.current.onUrlBlur();
    });
    expect(result.current.errors).toEqual({});
    unmount();
  });

  it("onUrlBlur với url rỗng → KHÔNG set errorRequired (blur chỉ kiểm định dạng, spec C)", () => {
    const { result } = renderHook(() => useKudosLinkDialog());
    act(() => {
      result.current.onUrlBlur();
    });
    expect(result.current.errors).toEqual({});
  });

  it("save() với draft không hợp lệ → set lỗi, trả về null, dialog vẫn mở (L04, L05, L06, L07)", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("", 0, 0);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
      result.current.setText("   ");
      result.current.setUrl("ftp://x.com/abc");
    });

    let saveResult;
    act(() => {
      saveResult = result.current.save();
    });

    expect(saveResult).toBeNull();
    expect(result.current.errors).toEqual({
      text: "errorRequired",
      url: "errorUrlInvalid",
    });
    expect(result.current.isOpen).toBe(true);
    expect(close).not.toHaveBeenCalled();
    unmount();
  });

  it("save() với draft hợp lệ → trả về {text,url,selection} trimmed, đóng dialog, reset 2 trường (L08, L09)", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
    });
    expect(result.current.text).toBe("hello");

    act(() => {
      result.current.setUrl("  https://a.com/x  ");
    });

    let saveResult;
    act(() => {
      saveResult = result.current.save();
    });

    expect(saveResult).toEqual({
      text: "hello",
      url: "https://a.com/x",
      selection: { start: 0, end: 5 },
    });
    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.text).toBe("");
    expect(result.current.url).toBe("");
    expect(result.current.errors).toEqual({});
    unmount();
  });

  it("cancel() đóng dialog, reset 2 trường + lỗi, không trả gì (H.1)", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
      result.current.setUrl("https://a.com");
    });

    act(() => {
      result.current.cancel();
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.text).toBe("");
    expect(result.current.url).toBe("");
    unmount();
  });

  it("onCancel (Escape) đóng dialog, reset 2 trường (L02, SM-001 độc lập với dialog Viết Kudo)", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 0, 5);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
      result.current.setText("Some Text");
    });

    act(() => {
      result.current.onCancel({} as never);
    });

    expect(close).toHaveBeenCalledTimes(1);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.text).toBe("");
    unmount();
  });

  it("cancel() khi dialog đã đóng sẵn → không gọi lại node.close(), vẫn isOpen=false", () => {
    const { dialog, close } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());

    act(() => {
      result.current.registerDialog(dialog);
    });
    act(() => {
      result.current.cancel();
    });

    expect(close).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
    unmount();
  });

  it("mở lại sau khi đã lưu → cả 2 trường rỗng lại, không còn draft cũ (L10)", () => {
    const { dialog } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = makeTextarea("hello world", 5, 5);

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
      result.current.setText("Some Text");
      result.current.setUrl("https://example.com");
    });
    act(() => {
      result.current.cancel();
    });
    act(() => {
      result.current.open(textarea);
    });

    expect(result.current.text).toBe("");
    expect(result.current.url).toBe("");
    unmount();
  });

  it("open() dùng selectionStart/End = 0 khi textarea trả về null (phòng vệ)", () => {
    const { dialog, showModal } = createStubDialog();
    const { result, unmount } = renderHook(() => useKudosLinkDialog());
    const textarea = document.createElement("textarea");
    textarea.value = "hi";
    Object.defineProperty(textarea, "selectionStart", { value: null });
    Object.defineProperty(textarea, "selectionEnd", { value: null });

    act(() => {
      result.current.registerDialog(dialog);
      result.current.open(textarea);
    });

    expect(result.current.text).toBe("");
    expect(showModal).toHaveBeenCalledTimes(1);
    unmount();
  });
});
