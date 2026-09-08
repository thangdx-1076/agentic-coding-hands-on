import { describe, expect, it } from "vitest";

import {
  buildKudoFormData,
  createEmptyDraft,
  toKudoDraftInput,
  type KudosComposeDraft,
  type KudosSunnerOption,
} from "./kudos-compose-draft";

const RECIPIENT: KudosSunnerOption = {
  id: "sunner-1",
  fullName: "Nguyễn Văn A",
  avatarUrl: null,
};

function makeDraft(
  overrides: Partial<KudosComposeDraft> = {},
): KudosComposeDraft {
  return { ...createEmptyDraft(), ...overrides };
}

describe("createEmptyDraft", () => {
  it("mọi trường rỗng, chưa chọn người nhận, chưa ẩn danh", () => {
    expect(createEmptyDraft()).toEqual({
      recipient: null,
      title: "",
      content: "",
      hashtags: [],
      images: [],
      isAnonymous: false,
      anonymousName: "",
    });
  });
});

describe("toKudoDraftInput", () => {
  it("chưa chọn người nhận → recipientId rỗng", () => {
    const input = toKudoDraftInput(makeDraft({ title: "Award" }));
    expect(input.recipientId).toBe("");
    expect(input.title).toBe("Award");
  });

  it("đã chọn người nhận → recipientId lấy từ id của option", () => {
    const input = toKudoDraftInput(makeDraft({ recipient: RECIPIENT }));
    expect(input.recipientId).toBe("sunner-1");
  });
});

describe("buildKudoFormData", () => {
  it("map đúng field, hashtags append lặp lại, KHÔNG lẫn title vào hashtags", () => {
    const file = new File(["x"], "a.jpg", { type: "image/jpeg" });
    const formData = buildKudoFormData(
      makeDraft({
        recipient: RECIPIENT,
        title: "Award",
        content: "Nice work",
        hashtags: ["TeamWork", "Speed"],
        isAnonymous: true,
        anonymousName: "Ẩn danh",
        images: [{ id: "img-1", file, previewUrl: "blob:1" }],
      }),
    );

    expect(formData.get("recipientId")).toBe("sunner-1");
    expect(formData.get("title")).toBe("Award");
    expect(formData.get("content")).toBe("Nice work");
    expect(formData.getAll("hashtags")).toEqual(["TeamWork", "Speed"]);
    expect(formData.get("isAnonymous")).toBe("true");
    expect(formData.get("anonymousName")).toBe("Ẩn danh");
    expect(formData.getAll("images")).toEqual([file]);
  });

  it('isAnonymous false → field ghi literal "false"', () => {
    const formData = buildKudoFormData(makeDraft());
    expect(formData.get("isAnonymous")).toBe("false");
    expect(formData.getAll("images")).toEqual([]);
  });
});
