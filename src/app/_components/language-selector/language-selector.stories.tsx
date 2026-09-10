import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { LanguageSelector } from "./language-selector";

const meta = {
  component: LanguageSelector,
  args: {
    onSelect: fn(),
  },
  decorators: [
    (Story) => (
      <div
        style={{
          display: "inline-flex",
          background: "#00101A",
          padding: "16px",
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LanguageSelector>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * Bộ chọn ngôn ngữ ở trạng thái tiếng Việt (mm:I662:14391;186:1601).
 * Đặt trên nền tối `#00101A` vì component vẽ chữ và icon màu trắng.
 * `play` khoá lại: trigger phải hiện cờ VN (`data-testid="flag-vn"`), không
 * phải một cờ cố định bất kể locale — đây là gap FR-201 đã sửa ở phase 06.
 */
export const Vietnamese: Story = {
  args: {
    label: "VN",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("flag-vn")).toBeInTheDocument();
    await expect(canvas.queryByTestId("flag-en")).not.toBeInTheDocument();
  },
};

/**
 * Bộ chọn ngôn ngữ ở trạng thái tiếng Anh (mm:I662:14391;186:1696).
 * Trước phase 06, story này ghim đúng cái visual SAI: trigger luôn hardcode
 * cờ Việt Nam nên `label: "EN"` vẫn hiện cờ VN, và không có `play` nào bắt
 * được điều đó. `play` dưới đây khoá lại đúng FR-201: locale "EN" phải hiện
 * cờ Anh (`data-testid="flag-en"`), không phải cờ VN.
 */
export const English: Story = {
  args: {
    label: "EN",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    await expect(canvas.getByTestId("flag-en")).toBeInTheDocument();
    await expect(canvas.queryByTestId("flag-vn")).not.toBeInTheDocument();
  },
};

/**
 * Trạng thái menu đang mở — đây mới là lúc component đổi hình dạng: danh sách
 * `menuitem` hiện ra và mũi tên xoay 180°. Hai story trên chỉ khác nhau ở nhãn
 * nên không cho thấy điều đó.
 *
 * Mở bằng `play` (click thật) chứ không bằng prop: `open` là state nội bộ của
 * `useMenuKeyboardNav`, component không nhận nó qua props — ép mở từ ngoài sẽ
 * là dựng lại một trạng thái giả, không phải trạng thái thật.
 *
 * `play` cũng khoá lại FR-203 (MoMorph `hUyaaugye2` row A.1/A.2): mỗi
 * `menuitem` phải render đúng 1 svg cờ, và item đang active ("VN") phải mang
 * `aria-current="true"` — `role="menuitem"` giữ nguyên trên cả hai item
 * (không đổi thành `menuitemradio`, xem quyết định ở
 * `plans/action-items.md`).
 */
export const Open: Story = {
  args: {
    label: "VN",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    const menu = canvas.getByRole("menu");
    await expect(menu).toBeInTheDocument();

    const items = canvas.getAllByRole("menuitem");
    await expect(items).toHaveLength(2);

    for (const item of items) {
      await expect(item.querySelectorAll("svg")).toHaveLength(1);
    }

    const activeItem = canvas.getByRole("menuitem", { name: "VN" });
    await expect(activeItem).toHaveAttribute("aria-current", "true");

    const inactiveItem = canvas.getByRole("menuitem", { name: "EN" });
    await expect(inactiveItem).not.toHaveAttribute("aria-current");
  },
};
