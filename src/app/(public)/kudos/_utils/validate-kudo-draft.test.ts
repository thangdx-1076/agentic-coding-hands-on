import { describe, expect, it } from "vitest";

import {
  isKudoDraftValid,
  validateKudoDraft,
  type KudoDraftInput,
} from "./validate-kudo-draft";

function makeDraft(overrides: Partial<KudoDraftInput> = {}): KudoDraftInput {
  return {
    recipientId: "sunner-1",
    title: "Người truyền động lực cho tôi",
    content: "Cảm ơn bạn rất nhiều",
    hashtags: ["teamwork"],
    isAnonymous: false,
    anonymousName: "",
    ...overrides,
  };
}

describe("validateKudoDraft", () => {
  it("cả 4 trường bắt buộc rỗng → 4 mã required, không có anonymousName (ID-56)", () => {
    const errors = validateKudoDraft(
      makeDraft({ recipientId: "", title: "", content: "", hashtags: [] }),
    );

    expect(errors).toEqual({
      recipientId: "required",
      title: "required",
      content: "required",
      hashtags: "required",
    });
    expect(
      isKudoDraftValid(
        makeDraft({ recipientId: "", title: "", content: "", hashtags: [] }),
      ),
    ).toBe(false);
  });

  it("khoảng trắng thuần cũng bị coi là rỗng (recipientId/title/content/hashtags)", () => {
    const errors = validateKudoDraft(
      makeDraft({
        recipientId: "   ",
        title: "\t",
        content: "  \n ",
        hashtags: ["   ", ""],
      }),
    );

    expect(errors).toEqual({
      recipientId: "required",
      title: "required",
      content: "required",
      hashtags: "required",
    });
  });

  it("draft hợp lệ tối thiểu → không có lỗi nào, isKudoDraftValid true (ID-49)", () => {
    const draft = makeDraft();

    expect(validateKudoDraft(draft)).toEqual({});
    expect(isKudoDraftValid(draft)).toBe(true);
  });

  it("6 hashtag khác nhau → hashtags:'tooMany' (ID-17/ID-53)", () => {
    const errors = validateKudoDraft(
      makeDraft({ hashtags: ["a", "b", "c", "d", "e", "f"] }),
    );

    expect(errors.hashtags).toBe("tooMany");
  });

  it("6 phần tử nhưng trùng lặp rút còn 5 hashtag duy nhất → hợp lệ (ID-16)", () => {
    const errors = validateKudoDraft(
      makeDraft({ hashtags: ["a", "a", "b", "c", "d", "e"] }),
    );

    expect(errors.hashtags).toBeUndefined();
  });

  it("hashtag trùng sau khi trim khoảng trắng → dedupe còn dưới ngưỡng, vẫn hợp lệ", () => {
    const errors = validateKudoDraft(
      makeDraft({ hashtags: ["a", " a ", "b"] }),
    );

    expect(errors.hashtags).toBeUndefined();
  });

  it("isAnonymous bật, tên ẩn danh rỗng → anonymousName:'required' (D001)", () => {
    const errors = validateKudoDraft(
      makeDraft({ isAnonymous: true, anonymousName: "" }),
    );

    expect(errors.anonymousName).toBe("required");
  });

  it("isAnonymous bật, tên ẩn danh chỉ có khoảng trắng → vẫn required", () => {
    const errors = validateKudoDraft(
      makeDraft({ isAnonymous: true, anonymousName: "   " }),
    );

    expect(errors.anonymousName).toBe("required");
  });

  it("isAnonymous bật kèm tên ẩn danh hợp lệ → không lỗi anonymousName", () => {
    const errors = validateKudoDraft(
      makeDraft({ isAnonymous: true, anonymousName: "Người ẩn danh" }),
    );

    expect(errors.anonymousName).toBeUndefined();
  });

  it("isAnonymous tắt → bỏ qua anonymousName dù rỗng", () => {
    const errors = validateKudoDraft(
      makeDraft({ isAnonymous: false, anonymousName: "" }),
    );

    expect(errors.anonymousName).toBeUndefined();
  });

  it("recipientId không phải string (gọi thẳng Server Action, bỏ qua kiểu client) → required", () => {
    const errors = validateKudoDraft(
      makeDraft({ recipientId: null as unknown as string }),
    );

    expect(errors.recipientId).toBe("required");
  });

  it("hashtags không phải mảng (bỏ qua kiểu client) → coi như rỗng, required", () => {
    const errors = validateKudoDraft(
      makeDraft({ hashtags: null as unknown as string[] }),
    );

    expect(errors.hashtags).toBe("required");
  });
});
