import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { buildKudosUrl, useKudosFilters } from "./use-kudos-filters";

/**
 * `useRouter` is the only Next.js boundary this hook touches — mocked so
 * the test observes the exact URL each control pushes (AD-4: the filter
 * value lives in the URL, never in local state), with no App Router in
 * the loop. `vi.hoisted` is what lets the spy be shared with the hoisted
 * `vi.mock` factory.
 */
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const LABELS = { hashtag: "Hashtag", department: "Phòng ban" };
const OPTIONS = {
  hashtags: ["#teamwork", "#delivery"],
  departments: ["Dev", "QA"],
};

function renderFilters(
  current = {
    hashtag: null as string | null,
    department: null as string | null,
  },
) {
  return renderHook(() => useKudosFilters(current, LABELS, OPTIONS));
}

describe("buildKudosUrl", () => {
  const empty = { hashtag: null, department: null };

  it("không filter nào → route trần, không dấu ?", () => {
    expect(buildKudosUrl(empty, {})).toBe("/kudos");
  });

  it("chỉ hashtag → một tham số", () => {
    expect(buildKudosUrl(empty, { hashtag: "#teamwork" })).toBe(
      "/kudos?hashtag=%23teamwork",
    );
  });

  it("chỉ department → một tham số", () => {
    expect(buildKudosUrl(empty, { department: "Dev" })).toBe(
      "/kudos?department=Dev",
    );
  });

  it("key vắng mặt trong next → giữ nguyên giá trị hiện tại", () => {
    expect(buildKudosUrl({ hashtag: "#teamwork", department: "Dev" }, {})).toBe(
      "/kudos?hashtag=%23teamwork&department=Dev",
    );
  });

  it("key mang null trong next → xoá đúng key đó, key kia giữ nguyên", () => {
    const current = { hashtag: "#teamwork", department: "Dev" };

    expect(buildKudosUrl(current, { hashtag: null })).toBe(
      "/kudos?department=Dev",
    );
    expect(buildKudosUrl(current, { department: null })).toBe(
      "/kudos?hashtag=%23teamwork",
    );
  });

  it("xoá cả hai → quay về route trần", () => {
    expect(
      buildKudosUrl(
        { hashtag: "#teamwork", department: "Dev" },
        { hashtag: null, department: null },
      ),
    ).toBe("/kudos");
  });
});

describe("useKudosFilters", () => {
  beforeEach(() => {
    push.mockClear();
  });

  it("mỗi dropdown nhận label, options và giá trị đang chọn từ URL", () => {
    const { result, unmount } = renderFilters({
      hashtag: "#teamwork",
      department: null,
    });

    expect(result.current.hashtagFilter.label).toBe("Hashtag");
    expect(result.current.hashtagFilter.options).toEqual(OPTIONS.hashtags);
    expect(result.current.hashtagFilter.selected).toBe("#teamwork");

    expect(result.current.departmentFilter.label).toBe("Phòng ban");
    expect(result.current.departmentFilter.options).toEqual(
      OPTIONS.departments,
    );
    expect(result.current.departmentFilter.selected).toBeNull();

    unmount();
  });

  it("onSelect đẩy URL kèm key của chính dropdown đó", () => {
    const { result, unmount } = renderFilters();

    result.current.hashtagFilter.onSelect("#teamwork");
    expect(push).toHaveBeenCalledExactlyOnceWith("/kudos?hashtag=%23teamwork");

    push.mockClear();
    result.current.departmentFilter.onSelect("Dev");
    expect(push).toHaveBeenCalledExactlyOnceWith("/kudos?department=Dev");

    unmount();
  });

  it("onClear chỉ xoá filter của chính nó, giữ filter còn lại", () => {
    const { result, unmount } = renderFilters({
      hashtag: "#teamwork",
      department: "Dev",
    });

    result.current.hashtagFilter.onClear();
    expect(push).toHaveBeenCalledExactlyOnceWith("/kudos?department=Dev");

    push.mockClear();
    result.current.departmentFilter.onClear();
    expect(push).toHaveBeenCalledExactlyOnceWith("/kudos?hashtag=%23teamwork");

    unmount();
  });

  it("selectHashtag (click hashtag trên thẻ) đẩy đúng URL như chọn trong dropdown", () => {
    const { result, unmount } = renderFilters({
      hashtag: null,
      department: "Dev",
    });

    result.current.selectHashtag("#delivery");
    expect(push).toHaveBeenCalledExactlyOnceWith(
      "/kudos?hashtag=%23delivery&department=Dev",
    );

    unmount();
  });
});
