import { describe, expect, it } from "vitest";

import { splitLinkTemplate } from "./split-link-template";

describe("splitLinkTemplate", () => {
  it("trả mảng rỗng khi chuỗi rỗng", () => {
    expect(splitLinkTemplate("")).toEqual([]);
  });

  it("không có marker thì trả về một segment text duy nhất", () => {
    expect(splitLinkTemplate("Bạn chưa có thông báo")).toEqual([
      { type: "text", value: "Bạn chưa có thông báo" },
    ]);
  });

  it("marker ở cuối chuỗi (kudos_hidden thật) tách đúng text + link", () => {
    const template =
      "Kudos của bạn đã bị ẩn do vi phạm <link>Tiêu chuẩn cộng đồng ↗</link>";

    expect(splitLinkTemplate(template)).toEqual([
      { type: "text", value: "Kudos của bạn đã bị ẩn do vi phạm " },
      { type: "link", value: "Tiêu chuẩn cộng đồng ↗" },
    ]);
  });

  it("marker ở đầu chuỗi tách đúng link + text", () => {
    expect(splitLinkTemplate("<link>Xem thêm</link> tại đây")).toEqual([
      { type: "link", value: "Xem thêm" },
      { type: "text", value: " tại đây" },
    ]);
  });

  it("marker đứng một mình (không có text bao quanh) chỉ trả về segment link", () => {
    expect(splitLinkTemplate("<link>Chỉ có link</link>")).toEqual([
      { type: "link", value: "Chỉ có link" },
    ]);
  });

  it("nhiều marker thì tách ra nhiều segment link theo đúng thứ tự", () => {
    expect(splitLinkTemplate("A <link>B</link> C <link>D</link> E")).toEqual([
      { type: "text", value: "A " },
      { type: "link", value: "B" },
      { type: "text", value: " C " },
      { type: "link", value: "D" },
      { type: "text", value: " E" },
    ]);
  });

  it("marker không đóng thẻ (hỏng) thì coi cả chuỗi là text, không throw", () => {
    expect(splitLinkTemplate("<link>chưa đóng thẻ")).toEqual([
      { type: "text", value: "<link>chưa đóng thẻ" },
    ]);
  });

  it("gọi hai lần liên tiếp cho cùng kết quả (regex global không giữ state lỗi)", () => {
    const template = "<link>A</link> B";

    expect(splitLinkTemplate(template)).toEqual(splitLinkTemplate(template));
  });
});
