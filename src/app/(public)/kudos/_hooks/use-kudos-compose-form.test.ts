import { act, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

import { createKudo } from "../_actions/create-kudo";
import { searchSunners } from "../_actions/search-sunners";
import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";
import type { CreateKudoResult } from "../_actions/create-kudo";

import { useKudosComposeForm } from "./use-kudos-compose-form";
import type { KudosSunnerOption } from "./kudos-compose-draft";

vi.mock("../_actions/create-kudo", () => ({
  createKudo: vi.fn(),
}));
vi.mock("../_actions/search-sunners", () => ({
  searchSunners: vi.fn(),
}));

const mockedCreateKudo = vi.mocked(createKudo);
const mockedSearchSunners = vi.mocked(searchSunners);

const COPY = defaultKudosComposeCopy;

const RECIPIENT: KudosSunnerOption = {
  id: "sunner-1",
  fullName: "Nguyễn Văn A",
  avatarUrl: null,
};

function makeFile(name: string, type = "image/jpeg"): File {
  return new File([new Uint8Array(10)], name, { type });
}

function renderForm(onSubmitted: () => void = vi.fn()) {
  return renderHook(() => useKudosComposeForm({ copy: COPY, onSubmitted }));
}

/** Fills all 4 required fields via the hook's own public setters so a test
 * can reach `canSubmit === true` without re-deriving the validation rule. */
function fillRequiredFields(result: {
  current: ReturnType<typeof useKudosComposeForm>;
}) {
  act(() => {
    result.current.selectRecipient(RECIPIENT);
    result.current.setTitle("Award");
    result.current.setContent("Great work");
    result.current.addHashtag("TeamWork");
  });
}

describe("useKudosComposeForm", () => {
  beforeAll(() => {
    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    mockedCreateKudo.mockReset();
    mockedSearchSunners.mockReset();
    mockedSearchSunners.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("trạng thái ban đầu: draft rỗng, không lỗi hiển thị, canSubmit=false (C05)", () => {
    const { result, unmount } = renderForm();

    expect(result.current.draft).toEqual({
      recipient: null,
      title: "",
      content: "",
      hashtags: [],
      images: [],
      isAnonymous: false,
      anonymousName: "",
    });
    expect(result.current.errors).toEqual({});
    expect(result.current.canSubmit).toBe(false);
    expect(result.current.submitting).toBe(false);
    expect(result.current.submitError).toBeNull();
    expect(result.current.imageError).toBeNull();
    expect(result.current.limitReached).toBe(false);
    expect(result.current.mentionQuery).toBeNull();
    unmount();
  });

  it("setTitle/setAnonymousName/setContent cập nhật đúng draft", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.setTitle("Award");
      result.current.setAnonymousName("Ẩn danh");
      result.current.setContent("Nice");
    });

    expect(result.current.draft.title).toBe("Award");
    expect(result.current.draft.anonymousName).toBe("Ẩn danh");
    expect(result.current.draft.content).toBe("Nice");
    unmount();
  });

  it("toggleAnonymous bật/tắt, tắt thì xoá anonymousName (ID-44)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.toggleAnonymous();
      result.current.setAnonymousName("Ẩn danh");
    });
    expect(result.current.draft.isAnonymous).toBe(true);
    expect(result.current.draft.anonymousName).toBe("Ẩn danh");

    act(() => {
      result.current.toggleAnonymous();
    });
    expect(result.current.draft.isAnonymous).toBe(false);
    expect(result.current.draft.anonymousName).toBe("");
    unmount();
  });

  it("addHashtag/removeHashtag phản ánh vào draft.hashtags, limitReached lộ ra ngoài (C14)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      ["A", "B", "C", "D", "E"].forEach((tag) =>
        result.current.addHashtag(tag),
      );
    });
    expect(result.current.draft.hashtags).toEqual(["A", "B", "C", "D", "E"]);

    act(() => {
      result.current.addHashtag("F");
    });
    expect(result.current.limitReached).toBe(true);
    expect(result.current.draft.hashtags).toHaveLength(5);

    act(() => {
      result.current.removeHashtag("A");
    });
    expect(result.current.draft.hashtags).toEqual(["B", "C", "D", "E"]);
    unmount();
  });

  it("addImages/removeImage phản ánh vào draft.images, imageError lộ ra ngoài (C15-C17)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.addImages([makeFile("a.jpg")]);
    });
    expect(result.current.draft.images).toHaveLength(1);
    expect(result.current.imageError).toBeNull();

    act(() => {
      result.current.addImages([makeFile("bad.txt", "text/plain")]);
    });
    expect(result.current.imageError).toBe(COPY.errorImageInvalid);

    const [image] = result.current.draft.images;
    act(() => {
      result.current.removeImage(image.id);
    });
    expect(result.current.draft.images).toEqual([]);
    unmount();
  });

  it("selectRecipient đặt draft.recipient; setRecipientQuery sau đó xoá lựa chọn", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.selectRecipient(RECIPIENT);
    });
    expect(result.current.draft.recipient).toEqual(RECIPIENT);
    expect(result.current.recipientQuery).toBe(RECIPIENT.fullName);

    act(() => {
      result.current.setRecipientQuery("a");
    });
    expect(result.current.draft.recipient).toBeNull();
    unmount();
  });

  it("mentionQuery/mentionOptions/insertMention hoạt động qua setContent (ID-33/C27)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.setContent("Thanks @Ngu", 11);
    });
    expect(result.current.mentionQuery).toBe("Ngu");

    act(() => {
      result.current.insertMention(RECIPIENT);
    });
    expect(result.current.draft.content).toBe(`Thanks @${RECIPIENT.fullName} `);
    expect(result.current.mentionQuery).toBeNull();
    unmount();
  });

  it("blurField hiện lỗi CHỈ cho field đó trước khi submit", () => {
    const { result, unmount } = renderForm();

    expect(result.current.errors).toEqual({});

    act(() => {
      result.current.blurField("title");
    });

    expect(result.current.errors).toEqual({ title: COPY.errorRequired });
    unmount();
  });

  it("blurField gọi lại lần 2 trên field đã touched → không tạo object mới thừa", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.blurField("title");
    });
    act(() => {
      result.current.blurField("title");
    });

    expect(result.current.errors).toEqual({ title: COPY.errorRequired });
    unmount();
  });

  it("submit() khi thiếu cả 4 trường → hiện lỗi cả 4, KHÔNG gọi action (C20/ID-56)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      result.current.submit();
    });

    expect(mockedCreateKudo).not.toHaveBeenCalled();
    expect(result.current.errors).toEqual({
      recipientId: COPY.errorRequired,
      title: COPY.errorRequired,
      content: COPY.errorRequired,
      hashtags: COPY.errorRequired,
    });
    unmount();
  });

  it("tick ẩn danh, để trống tên, 4 trường kia hợp lệ → submit chặn ở tên ẩn danh (C19/D001)", () => {
    const { result, unmount } = renderForm();
    fillRequiredFields(result);
    act(() => {
      result.current.toggleAnonymous();
    });

    expect(result.current.canSubmit).toBe(false);

    act(() => {
      result.current.submit();
    });

    expect(mockedCreateKudo).not.toHaveBeenCalled();
    expect(result.current.errors.anonymousName).toBe(COPY.errorRequired);
    unmount();
  });

  it("đủ 4 trường hợp lệ → canSubmit=true (C22)", () => {
    const { result, unmount } = renderForm();
    fillRequiredFields(result);

    expect(result.current.canSubmit).toBe(true);
    unmount();
  });

  it("submit() hợp lệ → submitting=true đồng bộ, gọi createKudo với đúng FormData", async () => {
    const onSubmitted = vi.fn();
    const deferred = (() => {
      let resolve!: (value: CreateKudoResult) => void;
      const promise = new Promise<CreateKudoResult>((res) => {
        resolve = res;
      });
      return { promise, resolve };
    })();
    mockedCreateKudo.mockReturnValueOnce(deferred.promise);
    const { result, unmount } = renderForm(onSubmitted);
    fillRequiredFields(result);

    act(() => {
      result.current.submit();
    });

    expect(result.current.submitting).toBe(true);
    const formData = mockedCreateKudo.mock.calls[0][0];
    expect(formData.get("recipientId")).toBe(RECIPIENT.id);
    expect(formData.get("title")).toBe("Award");
    expect(formData.get("content")).toBe("Great work");
    expect(formData.getAll("hashtags")).toEqual(["TeamWork"]);
    expect(formData.get("isAnonymous")).toBe("false");

    await act(async () => {
      deferred.resolve({ ok: true, kudoId: "kudo-1" });
      await Promise.resolve();
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(result.current.draft.title).toBe("");
    expect(result.current.draft.recipient).toBeNull();
    unmount();
  });

  it('submit() trả reason "validation" → map fieldErrors, kèm ảnh nếu có', async () => {
    mockedCreateKudo.mockResolvedValueOnce({
      ok: false,
      reason: "validation",
      fieldErrors: { recipientId: "required", images: "tooMany" },
    });
    const { result, unmount } = renderForm();
    fillRequiredFields(result);

    await act(async () => {
      result.current.submit();
      await Promise.resolve();
    });

    expect(result.current.errors.recipientId).toBe(COPY.errorRequired);
    expect(result.current.imageError).toBe(COPY.errorImageInvalid);
    unmount();
  });

  it('submit() trả reason "unauthenticated" → submitError = unauthenticatedHint, KHÔNG đóng form', async () => {
    mockedCreateKudo.mockResolvedValueOnce({
      ok: false,
      reason: "unauthenticated",
    });
    const { result, unmount } = renderForm();
    fillRequiredFields(result);

    await act(async () => {
      result.current.submit();
      await Promise.resolve();
    });

    expect(result.current.submitError).toBe(COPY.unauthenticatedHint);
    expect(result.current.draft.title).toBe("Award");
    unmount();
  });

  it('submit() trả reason "upload"/"error" → fallback errorFormIncomplete', async () => {
    mockedCreateKudo.mockResolvedValueOnce({ ok: false, reason: "upload" });
    const { result, unmount } = renderForm();
    fillRequiredFields(result);

    await act(async () => {
      result.current.submit();
      await Promise.resolve();
    });

    expect(result.current.submitError).toBe(COPY.errorFormIncomplete);
    unmount();
  });

  it("submit() action throw (lỗi transport) → submitError = errorFormIncomplete, không unhandled rejection", async () => {
    mockedCreateKudo.mockRejectedValueOnce(new Error("network down"));
    const { result, unmount } = renderForm();
    fillRequiredFields(result);

    await act(async () => {
      result.current.submit();
      await Promise.resolve();
    });

    expect(result.current.submitError).toBe(COPY.errorFormIncomplete);
    unmount();
  });

  it("reset() xoá sạch mọi state — draft, query, lỗi, ảnh (C07/C08)", async () => {
    mockedCreateKudo.mockResolvedValueOnce({ ok: false, reason: "error" });
    const { result, unmount } = renderForm();
    fillRequiredFields(result);
    act(() => {
      result.current.addImages([makeFile("a.jpg")]);
      result.current.setAnonymousName("x");
      result.current.blurField("title");
    });

    await act(async () => {
      result.current.submit();
      await Promise.resolve();
    });
    expect(result.current.submitError).toBe(COPY.errorFormIncomplete);

    act(() => {
      result.current.reset();
    });

    expect(result.current.draft).toEqual({
      recipient: null,
      title: "",
      content: "",
      hashtags: [],
      images: [],
      isAnonymous: false,
      anonymousName: "",
    });
    expect(result.current.recipientQuery).toBe("");
    expect(result.current.errors).toEqual({});
    expect(result.current.submitError).toBeNull();
    expect(result.current.imageError).toBeNull();
    unmount();
  });

  it("reset() đóng picker và dropdown đang mở (hashtag picker, recipient combobox, @-mention)", () => {
    const { result, unmount } = renderForm();

    act(() => {
      // Hashtag picker opened + mid-search.
      result.current.setHashtagPickerOpen(true);
      result.current.setHashtagQuery("Team");
      // Recipient combobox open (query typed, nothing picked yet).
      result.current.setRecipientQuery("Ngu");
      // @-mention dropdown open (active token in content).
      result.current.setContent("Thanks @Ngu", 11);
    });

    expect(result.current.hashtagPickerOpen).toBe(true);
    expect(result.current.hashtagQuery).toBe("Team");
    expect(result.current.recipientQuery).toBe("Ngu");
    expect(result.current.mentionQuery).toBe("Ngu");

    act(() => {
      result.current.reset();
    });

    // Hashtag picker: both pieces of its own transient UI state closed.
    expect(result.current.hashtagPickerOpen).toBe(false);
    expect(result.current.hashtagQuery).toBe("");
    // Recipient combobox: closes because it is DERIVED from
    // `draft.recipient === null && recipientQuery !== ""` — clearing the
    // query is what closes it.
    expect(result.current.recipientQuery).toBe("");
    expect(result.current.draft.recipient).toBeNull();
    // @-mention: closes because it is DERIVED from `mentionQuery !== null`
    // — clearing `content`/caret is what closes it.
    expect(result.current.mentionQuery).toBeNull();
    unmount();
  });
});
