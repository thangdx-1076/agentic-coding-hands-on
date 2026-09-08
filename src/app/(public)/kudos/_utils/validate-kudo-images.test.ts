import { describe, expect, it } from "vitest";

import {
  MAX_KUDO_IMAGES,
  MAX_KUDO_IMAGE_BYTES,
  validateKudoImages,
  type KudoImageLike,
} from "./validate-kudo-images";

function makeImage(overrides: Partial<KudoImageLike> = {}): KudoImageLike {
  return {
    name: "photo.jpg",
    type: "image/jpeg",
    size: 1024,
    ...overrides,
  };
}

describe("validateKudoImages", () => {
  it("danh sách rỗng → hợp lệ, ảnh không bắt buộc", () => {
    const result = validateKudoImages([]);

    expect(result).toEqual({ accepted: [], rejected: [] });
  });

  it("3 ảnh .jpg hợp lệ → tất cả accepted", () => {
    const files = [
      makeImage({ name: "a.jpg" }),
      makeImage({ name: "b.jpg" }),
      makeImage({ name: "c.jpg" }),
    ];

    const result = validateKudoImages(files);

    expect(result.accepted).toEqual(files);
    expect(result.rejected).toEqual([]);
  });

  it("file .txt (mime + extension đều sai) → rejected invalidType (ID-55)", () => {
    const file = makeImage({ name: "notes.txt", type: "text/plain" });

    const result = validateKudoImages([file]);

    expect(result.accepted).toEqual([]);
    expect(result.rejected).toEqual([{ file, reason: "invalidType" }]);
  });

  it("mime đúng nhưng extension sai → vẫn invalidType", () => {
    const file = makeImage({ name: "photo.txt", type: "image/jpeg" });

    const result = validateKudoImages([file]);

    expect(result.rejected).toEqual([{ file, reason: "invalidType" }]);
  });

  it("extension đúng nhưng mime sai → vẫn invalidType", () => {
    const file = makeImage({ name: "photo.jpg", type: "application/pdf" });

    const result = validateKudoImages([file]);

    expect(result.rejected).toEqual([{ file, reason: "invalidType" }]);
  });

  it("extension viết hoa (.PNG) vẫn được nhận khi mime đúng", () => {
    const file = makeImage({ name: "PHOTO.PNG", type: "image/png" });

    const result = validateKudoImages([file]);

    expect(result.accepted).toEqual([file]);
  });

  it("file đúng 5 MiB (AD-4) → accepted, biên trên vẫn hợp lệ", () => {
    const file = makeImage({ size: MAX_KUDO_IMAGE_BYTES });

    const result = validateKudoImages([file]);

    expect(result.accepted).toEqual([file]);
  });

  it("file lớn hơn 5 MiB → rejected tooLarge", () => {
    const file = makeImage({ size: MAX_KUDO_IMAGE_BYTES + 1 });

    const result = validateKudoImages([file]);

    expect(result.rejected).toEqual([{ file, reason: "tooLarge" }]);
  });

  it("6 ảnh hợp lệ → 5 đầu accepted, ảnh thứ 6 rejected tooMany (ID-20)", () => {
    const files = Array.from({ length: 6 }, (_, index) =>
      makeImage({ name: `photo-${index}.png`, type: "image/png" }),
    );

    const result = validateKudoImages(files);

    expect(result.accepted).toEqual(files.slice(0, MAX_KUDO_IMAGES));
    expect(result.accepted).toHaveLength(MAX_KUDO_IMAGES);
    expect(result.rejected).toEqual([{ file: files[5], reason: "tooMany" }]);
  });

  it("ảnh sai định dạng nằm ở vị trí thứ 6 → báo invalidType, không phải tooMany", () => {
    const validFiles = Array.from({ length: 5 }, (_, index) =>
      makeImage({ name: `photo-${index}.jpg` }),
    );
    const badFile = makeImage({ name: "sixth.pdf", type: "application/pdf" });

    const result = validateKudoImages([...validFiles, badFile]);

    expect(result.accepted).toEqual(validFiles);
    expect(result.rejected).toEqual([{ file: badFile, reason: "invalidType" }]);
  });

  it("ảnh sai định dạng xen giữa không chiếm slot — 5 ảnh hợp lệ sau đó vẫn accepted", () => {
    const invalidFile = makeImage({ name: "bad.pdf", type: "application/pdf" });
    const validFiles = Array.from({ length: 6 }, (_, index) =>
      makeImage({ name: `ok-${index}.jpg` }),
    );

    const result = validateKudoImages([
      validFiles[0],
      invalidFile,
      ...validFiles.slice(1),
    ]);

    expect(result.accepted).toEqual(validFiles.slice(0, 5));
    expect(result.rejected).toEqual([
      { file: invalidFile, reason: "invalidType" },
      { file: validFiles[5], reason: "tooMany" },
    ]);
  });
});
