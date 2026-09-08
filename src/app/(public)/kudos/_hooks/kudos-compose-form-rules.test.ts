import { describe, expect, it } from "vitest";

import type { CreateKudoResult } from "../_actions/create-kudo";
import { defaultKudosComposeCopy } from "../_shared/kudos-compose-copy";

import {
  addHashtagToList,
  deriveMentionQuery,
  deriveVisibleFieldErrors,
  insertMentionText,
  intakeImageFiles,
  resolveFieldErrorMessage,
  resolveSubmitFailure,
} from "./kudos-compose-form-rules";

const COPY = defaultKudosComposeCopy;
const MAX_CHIPS = 5;

describe("resolveFieldErrorMessage", () => {
  it("hashtags + tooMany → errorHashtagMax", () => {
    expect(resolveFieldErrorMessage("hashtags", "tooMany", COPY)).toBe(
      COPY.errorHashtagMax,
    );
  });

  it("mọi field khác, hoặc hashtags + required → errorRequired", () => {
    expect(resolveFieldErrorMessage("recipientId", "required", COPY)).toBe(
      COPY.errorRequired,
    );
    expect(resolveFieldErrorMessage("hashtags", "required", COPY)).toBe(
      COPY.errorRequired,
    );
    expect(resolveFieldErrorMessage("anonymousName", "required", COPY)).toBe(
      COPY.errorRequired,
    );
  });
});

describe("deriveVisibleFieldErrors", () => {
  const codes = { recipientId: "required", hashtags: "tooMany" } as const;

  it("chưa touch, chưa submit → rỗng dù có lỗi", () => {
    expect(deriveVisibleFieldErrors(codes, {}, false, COPY)).toEqual({});
  });

  it("hasAttemptedSubmit=true → hiện MỌI field có lỗi", () => {
    expect(deriveVisibleFieldErrors(codes, {}, true, COPY)).toEqual({
      recipientId: COPY.errorRequired,
      hashtags: COPY.errorHashtagMax,
    });
  });

  it("chưa submit nhưng field đã touched → chỉ hiện field đó", () => {
    expect(
      deriveVisibleFieldErrors(codes, { recipientId: true }, false, COPY),
    ).toEqual({ recipientId: COPY.errorRequired });
  });

  it("field không có lỗi trong codes → không xuất hiện dù đã touched", () => {
    expect(
      deriveVisibleFieldErrors({}, { recipientId: true }, true, COPY),
    ).toEqual({});
  });
});

describe("addHashtagToList", () => {
  it("thêm tag mới, còn chỗ → append, limitReached=false", () => {
    expect(addHashtagToList(["A"], "B", MAX_CHIPS)).toEqual({
      hashtags: ["A", "B"],
      limitReached: false,
    });
  });

  it("trim khoảng trắng trước khi thêm", () => {
    expect(addHashtagToList([], "  TeamWork  ", MAX_CHIPS)).toEqual({
      hashtags: ["TeamWork"],
      limitReached: false,
    });
  });

  it("tag rỗng sau trim → không thêm, giữ nguyên reference", () => {
    const hashtags = ["A"];
    const result = addHashtagToList(hashtags, "   ", MAX_CHIPS);
    expect(result.hashtags).toBe(hashtags);
    expect(result.limitReached).toBe(false);
  });

  it("tag đã có (dedupe) → không thêm lại, giữ nguyên reference", () => {
    const hashtags = ["A", "B"];
    const result = addHashtagToList(hashtags, "A", MAX_CHIPS);
    expect(result.hashtags).toBe(hashtags);
    expect(result.limitReached).toBe(false);
  });

  it("đã đủ MAX_CHIPS → chặn thêm, limitReached=true, giữ nguyên reference", () => {
    const hashtags = ["A", "B", "C", "D", "E"];
    const result = addHashtagToList(hashtags, "F", MAX_CHIPS);
    expect(result.hashtags).toBe(hashtags);
    expect(result.limitReached).toBe(true);
  });
});

describe("intakeImageFiles", () => {
  function makeFile(name: string, type = "image/jpeg", size = 10): File {
    return new File([new Uint8Array(size)], name, { type });
  }

  it("toàn bộ file mới hợp lệ → newFiles đủ, hasRejection=false", () => {
    const a = makeFile("a.jpg");
    const b = makeFile("b.png", "image/png");
    const result = intakeImageFiles([], [a, b]);
    expect(result).toEqual({ newFiles: [a, b], hasRejection: false });
  });

  it("existing đã có sẵn → chỉ trả về phần MỚI được chấp nhận", () => {
    const existing = makeFile("existing.jpg");
    const incoming = makeFile("new.png", "image/png");
    const result = intakeImageFiles([existing], [incoming]);
    expect(result.newFiles).toEqual([incoming]);
  });

  it("file sai định dạng → bị loại, hasRejection=true, không lọt vào newFiles", () => {
    const bad = makeFile("virus.txt", "text/plain");
    const result = intakeImageFiles([], [bad]);
    expect(result).toEqual({ newFiles: [], hasRejection: true });
  });

  it("vượt quá 5 ảnh → phần dư bị loại là tooMany, newFiles dừng ở đúng số còn trống", () => {
    const existing = [makeFile("1.jpg"), makeFile("2.jpg"), makeFile("3.jpg")];
    const incoming = [makeFile("4.jpg"), makeFile("5.jpg"), makeFile("6.jpg")];
    const result = intakeImageFiles(existing, incoming);
    expect(result.newFiles).toEqual([incoming[0], incoming[1]]);
    expect(result.hasRejection).toBe(true);
  });
});

describe("resolveSubmitFailure", () => {
  it('reason "validation" kèm fieldErrors.images → set cả field + imageErrorMessage', () => {
    const result: CreateKudoResult = {
      ok: false,
      reason: "validation",
      fieldErrors: { recipientId: "required", images: "tooMany" },
    };
    expect(resolveSubmitFailure(result, COPY)).toEqual({
      fieldErrors: { recipientId: "required", images: "tooMany" },
      imageErrorMessage: COPY.errorImageInvalid,
    });
  });

  it('reason "validation" KHÔNG có fieldErrors.images → imageErrorMessage undefined', () => {
    const result: CreateKudoResult = {
      ok: false,
      reason: "validation",
      fieldErrors: { title: "required" },
    };
    expect(resolveSubmitFailure(result, COPY)).toEqual({
      fieldErrors: { title: "required" },
      imageErrorMessage: undefined,
    });
  });

  it('reason "unauthenticated" → submitErrorMessage = unauthenticatedHint', () => {
    const result: CreateKudoResult = { ok: false, reason: "unauthenticated" };
    expect(resolveSubmitFailure(result, COPY)).toEqual({
      submitErrorMessage: COPY.unauthenticatedHint,
    });
  });

  it('reason "upload" → fallback errorFormIncomplete (không có copy riêng)', () => {
    const result: CreateKudoResult = { ok: false, reason: "upload" };
    expect(resolveSubmitFailure(result, COPY)).toEqual({
      submitErrorMessage: COPY.errorFormIncomplete,
    });
  });

  it('reason "error" → fallback errorFormIncomplete', () => {
    const result: CreateKudoResult = { ok: false, reason: "error" };
    expect(resolveSubmitFailure(result, COPY)).toEqual({
      submitErrorMessage: COPY.errorFormIncomplete,
    });
  });
});

describe("deriveMentionQuery", () => {
  it("không có @ nào trước caret → null", () => {
    expect(deriveMentionQuery("Thanks team", 6)).toBeNull();
  });

  it("@ ngay trước caret, chưa gõ ký tự nào → null (chưa đủ 1 ký tự)", () => {
    expect(deriveMentionQuery("Thanks @", 8)).toBeNull();
  });

  it("@ + ký tự không khoảng trắng tới caret → trả về phần sau @", () => {
    expect(deriveMentionQuery("Thanks @Ngu", 11)).toBe("Ngu");
  });

  it("có khoảng trắng giữa @ và caret → null (token đã đóng)", () => {
    expect(deriveMentionQuery("Thanks @Ngu a", 13)).toBeNull();
  });

  it("caret nằm giữa nội dung, sau một @ cũ đã đóng → dùng @ gần caret nhất", () => {
    expect(deriveMentionQuery("@Old thanks @New", 16)).toBe("New");
  });
});

describe("insertMentionText", () => {
  it("thay token @token bằng @Tên đầy đủ + khoảng trắng", () => {
    const result = insertMentionText("Thanks @Ngu", 11, "Nguyễn Văn A");
    expect(result.value).toBe("Thanks @Nguyễn Văn A ");
    expect(result.caret).toBe(result.value.length);
  });

  it("giữ nguyên phần sau caret khi caret không ở cuối chuỗi", () => {
    const result = insertMentionText("Thanks @Ngu nhé", 11, "A");
    expect(result.value).toBe("Thanks @A  nhé");
  });

  it("fullName null → chèn @ trơn kèm khoảng trắng", () => {
    const result = insertMentionText("Hi @x", 5, null);
    expect(result.value).toBe("Hi @ ");
  });

  it("không có @ trước caret → không đổi gì (phòng vệ)", () => {
    const result = insertMentionText("Thanks team", 6, "A");
    expect(result).toEqual({ value: "Thanks team", caret: 6 });
  });
});
