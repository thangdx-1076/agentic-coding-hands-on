import { act, renderHook } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  useKudosComposeHashtags,
  useKudosComposeImages,
} from "./use-kudos-compose-attachments";

const ERROR_MESSAGE = "Chỉ nhận file .jpg hoặc .png, tối đa 5 ảnh.";

// Plain local consts (not `URL.createObjectURL`/`URL.revokeObjectURL`
// property access) are what tests assert against below — `typeof URL`
// declares these as interface methods, and TypeScript flags a bare
// `URL.createObjectURL` reference as an "unbound method" regardless of it
// being a `vi.fn()` at runtime (`@typescript-eslint/unbound-method`).
const createObjectURL = vi.fn(() => "blob:mock-url");
const revokeObjectURL = vi.fn();

function makeFile(name: string, type = "image/jpeg", size = 10): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("useKudosComposeHashtags", () => {
  it("bắt đầu rỗng, chưa chạm giới hạn", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    expect(result.current.hashtags).toEqual([]);
    expect(result.current.limitReached).toBe(false);
    unmount();
  });

  it("addHashtag thêm chip mới", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      result.current.addHashtag("TeamWork");
    });

    expect(result.current.hashtags).toEqual(["TeamWork"]);
    unmount();
  });

  it("thêm 3 rồi xoá chip đầu → 2 chip còn lại nguyên (C13)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      result.current.addHashtag("A");
      result.current.addHashtag("B");
      result.current.addHashtag("C");
    });
    act(() => {
      result.current.removeHashtag("A");
    });

    expect(result.current.hashtags).toEqual(["B", "C"]);
    unmount();
  });

  it("đủ 5 chip (CHƯA thử thêm cái thứ 6) → limitReached đã true ngay (ID-16/17, hashtags.length >= 5)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      ["A", "B", "C", "D", "E"].forEach((tag) =>
        result.current.addHashtag(tag),
      );
    });

    expect(result.current.hashtags).toHaveLength(5);
    expect(result.current.limitReached).toBe(true);
    unmount();
  });

  it("thêm chip thứ 6 → bị chặn, limitReached=true (C14)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      ["A", "B", "C", "D", "E"].forEach((tag) =>
        result.current.addHashtag(tag),
      );
    });
    act(() => {
      result.current.addHashtag("F");
    });

    expect(result.current.hashtags).toEqual(["A", "B", "C", "D", "E"]);
    expect(result.current.limitReached).toBe(true);
    unmount();
  });

  it("removeHashtag xoá limitReached đang bật", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      ["A", "B", "C", "D", "E"].forEach((tag) =>
        result.current.addHashtag(tag),
      );
      result.current.addHashtag("F");
    });
    expect(result.current.limitReached).toBe(true);

    act(() => {
      result.current.removeHashtag("A");
    });
    expect(result.current.limitReached).toBe(false);
    unmount();
  });

  it("reset() đưa về rỗng và tắt limitReached", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      result.current.addHashtag("A");
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.hashtags).toEqual([]);
    expect(result.current.limitReached).toBe(false);
    unmount();
  });

  it("bắt đầu với picker đóng, query rỗng", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    expect(result.current.pickerOpen).toBe(false);
    expect(result.current.query).toBe("");
    unmount();
  });

  it("setQuery/setPickerOpen cập nhật state của picker (E.2)", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      result.current.setPickerOpen(true);
      result.current.setQuery("Team");
    });

    expect(result.current.pickerOpen).toBe(true);
    expect(result.current.query).toBe("Team");
    unmount();
  });

  it("reset() đóng picker và xoá query đang gõ dở", () => {
    const { result, unmount } = renderHook(() => useKudosComposeHashtags());

    act(() => {
      result.current.setPickerOpen(true);
      result.current.setQuery("Team");
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.pickerOpen).toBe(false);
    expect(result.current.query).toBe("");
    unmount();
  });
});

describe("useKudosComposeImages", () => {
  beforeAll(() => {
    // jsdom does not implement the Blob URL registry at all.
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = revokeObjectURL;
  });

  it("bắt đầu rỗng, chưa có lỗi", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    expect(result.current.images).toEqual([]);
    expect(result.current.imageError).toBeNull();
    unmount();
  });

  it("addImages với FileList rỗng → không làm gì", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([]);
    });

    expect(result.current.images).toEqual([]);
    expect(createObjectURL).not.toHaveBeenCalled();
    unmount();
  });

  it("thêm 3 ảnh hợp lệ → 3 thumbnail, previewUrl từ createObjectURL (C15)", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );
    const files = [
      makeFile("a.jpg"),
      makeFile("b.jpg"),
      makeFile("c.png", "image/png"),
    ];

    act(() => {
      result.current.addImages(files);
    });

    expect(result.current.images).toHaveLength(3);
    expect(result.current.images.map((image) => image.file)).toEqual(files);
    expect(
      result.current.images.every(
        (image) => image.previewUrl === "blob:mock-url",
      ),
    ).toBe(true);
    expect(result.current.imageError).toBeNull();
    unmount();
  });

  it("chọn file .txt → hasRejection → set imageError, KHÔNG thumbnail nào được thêm (C17)", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([makeFile("virus.txt", "text/plain")]);
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.imageError).toBe(ERROR_MESSAGE);
    unmount();
  });

  it("đã có 5 ảnh → +Image thêm ảnh thứ 6 bị chặn, phần hợp lệ vẫn được thêm nếu còn chỗ (C16)", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([
        makeFile("1.jpg"),
        makeFile("2.jpg"),
        makeFile("3.jpg"),
        makeFile("4.jpg"),
        makeFile("5.jpg"),
      ]);
    });
    act(() => {
      result.current.addImages([makeFile("6.jpg")]);
    });

    expect(result.current.images).toHaveLength(5);
    expect(result.current.imageError).toBe(ERROR_MESSAGE);
    unmount();
  });

  it("removeImage xoá đúng ảnh, revoke URL, xoá imageError đang có", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([makeFile("a.jpg")]);
    });
    act(() => {
      result.current.addImages([makeFile("bad.txt", "text/plain")]);
    });
    expect(result.current.imageError).toBe(ERROR_MESSAGE);

    const [image] = result.current.images;
    act(() => {
      result.current.removeImage(image.id);
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.imageError).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    unmount();
  });

  it("removeImage với id không tồn tại → không revoke, không đổi danh sách", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([makeFile("a.jpg")]);
    });
    revokeObjectURL.mockClear();

    act(() => {
      result.current.removeImage("does-not-exist");
    });

    expect(result.current.images).toHaveLength(1);
    expect(revokeObjectURL).not.toHaveBeenCalled();
    unmount();
  });

  it("setImageError ghi đè lỗi từ phía server", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.setImageError("Server error message");
    });

    expect(result.current.imageError).toBe("Server error message");
    unmount();
  });

  it("reset() revoke hết URL và trả về rỗng", () => {
    const { result, unmount } = renderHook(() =>
      useKudosComposeImages(ERROR_MESSAGE),
    );

    act(() => {
      result.current.addImages([makeFile("a.jpg"), makeFile("b.jpg")]);
    });
    revokeObjectURL.mockClear();

    act(() => {
      result.current.reset();
    });

    expect(result.current.images).toEqual([]);
    expect(result.current.imageError).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
    unmount();
  });
});
