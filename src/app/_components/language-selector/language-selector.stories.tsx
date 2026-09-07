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
 */
export const Vietnamese: Story = {
  args: {
    label: "VN",
  },
};

/**
 * Bộ chọn ngôn ngữ ở trạng thái tiếng Anh (mm:I662:14391;186:1696).
 */
export const English: Story = {
  args: {
    label: "EN",
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
 */
export const Open: Story = {
  args: {
    label: "VN",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { expanded: false });

    await userEvent.click(trigger);

    await expect(canvas.getByRole("menu")).toBeInTheDocument();
  },
};
