import { describe, expect, it, vi } from "vitest";

import {
  removeKudoImages,
  toKudoStorageClient,
  uploadKudoImages,
  type KudoStorageClient,
} from "./upload-kudo-images";

function makeFile(
  overrides: Partial<{ name: string; type: string; content: string }> = {},
): File {
  const {
    name = "photo.jpg",
    type = "image/jpeg",
    content = "data",
  } = overrides;
  return new File([content], name, { type });
}

type UploadCallResult =
  { data: { path: string }; error: null } | { data: null; error: unknown };

/**
 * `from()` always returns the SAME spy object regardless of the bucket
 * argument — good enough for these tests, which only ever pass
 * `"kudo-images"`, and simpler than modelling a per-bucket map.
 */
function stubClient(uploadResults: UploadCallResult[] = []) {
  const queue = [...uploadResults];
  const upload = vi.fn(() =>
    Promise.resolve(queue.shift() ?? { data: { path: "unused" }, error: null }),
  );
  const getPublicUrl = vi.fn((path: string) => ({
    data: { publicUrl: `https://storage.example/kudo-images/${path}` },
  }));
  const remove = vi.fn<
    (paths: string[]) => Promise<{ data: never[]; error: null }>
  >(() => Promise.resolve({ data: [], error: null }));
  const from = vi.fn(() => ({ upload, getPublicUrl, remove }));
  const client = { storage: { from } } as unknown as KudoStorageClient;
  return { client, upload, getPublicUrl, remove, from };
}

describe("uploadKudoImages", () => {
  it("0 file → {urls:[], uploadedPaths:[]}, không gọi Storage", async () => {
    const { client, from } = stubClient();

    await expect(uploadKudoImages(client, "user-1", [])).resolves.toEqual({
      urls: [],
      uploadedPaths: [],
    });
    expect(from).not.toHaveBeenCalled();
  });

  it("3 ảnh upload thành công → 3 url + 3 path dạng userId/uuid.ext", async () => {
    const { client, upload, getPublicUrl } = stubClient([
      { data: { path: "p1" }, error: null },
      { data: { path: "p2" }, error: null },
      { data: { path: "p3" }, error: null },
    ]);
    const files = [
      makeFile({ name: "a.jpg", type: "image/jpeg" }),
      makeFile({ name: "b.png", type: "image/png" }),
      makeFile({ name: "c.jpg", type: "image/jpeg" }),
    ];

    const result = await uploadKudoImages(client, "user-1", files);

    expect(result.uploadedPaths).toHaveLength(3);
    expect(result.urls).toHaveLength(3);
    for (const path of result.uploadedPaths) {
      expect(path).toMatch(/^user-1\/[0-9a-f-]{36}\.(?:jpg|png)$/);
    }
    expect(upload).toHaveBeenCalledTimes(3);
    expect(getPublicUrl).toHaveBeenCalledTimes(3);
  });

  it("file thứ 3 lỗi → best-effort remove() đúng 2 path đã lên, ném lỗi gốc qua cause", async () => {
    const uploadError = { message: "boom" };
    const { client, remove } = stubClient([
      { data: { path: "p1" }, error: null },
      { data: { path: "p2" }, error: null },
      { data: null, error: uploadError },
    ]);
    const files = [makeFile(), makeFile(), makeFile()];

    let caught: unknown;
    try {
      await uploadKudoImages(client, "user-1", files);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe(
      "uploadKudoImages: failed to upload one or more images",
    );
    expect((caught as Error).cause).toBe(uploadError);
    expect(remove).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("mime lạ (không phải jpeg/png) → fallback phần mở rộng .bin", async () => {
    const { client } = stubClient([{ data: { path: "p1" }, error: null }]);
    const file = makeFile({ name: "weird", type: "application/octet-stream" });

    const result = await uploadKudoImages(client, "user-1", [file]);

    expect(result.uploadedPaths[0]).toMatch(/\.bin$/);
  });
});

describe("removeKudoImages", () => {
  it("danh sách path rỗng → không gọi storage.remove", async () => {
    const { client, remove, from } = stubClient();

    await removeKudoImages(client, []);

    expect(from).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("storage.remove() ném lỗi → lỗi bị nuốt, không throw ra ngoài", async () => {
    const { client, remove } = stubClient();
    remove.mockRejectedValueOnce(new Error("network down"));

    await expect(removeKudoImages(client, ["p1"])).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledExactlyOnceWith(["p1"]);
  });
});

describe("toKudoStorageClient", () => {
  it("uỷ quyền upload/getPublicUrl/remove đúng cho client Supabase thật", async () => {
    const upload = vi
      .fn()
      .mockResolvedValue({ data: { path: "p1" }, error: null });
    const getPublicUrl = vi
      .fn()
      .mockReturnValue({ data: { publicUrl: "url" } });
    const remove = vi.fn().mockResolvedValue({ data: [], error: null });
    const from = vi.fn(() => ({ upload, getPublicUrl, remove }));
    const supabase = {
      storage: { from },
    } as unknown as Parameters<typeof toKudoStorageClient>[0];

    const client = toKudoStorageClient(supabase);
    const bucketApi = client.storage.from("kudo-images");
    const file = makeFile();
    await bucketApi.upload("path", file, { contentType: "image/jpeg" });
    bucketApi.getPublicUrl("path");
    await bucketApi.remove(["path"]);

    expect(from).toHaveBeenCalledWith("kudo-images");
    expect(upload).toHaveBeenCalledWith("path", file, {
      contentType: "image/jpeg",
    });
    expect(getPublicUrl).toHaveBeenCalledWith("path");
    expect(remove).toHaveBeenCalledWith(["path"]);
  });
});
