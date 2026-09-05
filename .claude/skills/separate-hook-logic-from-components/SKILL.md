---
name: separate-hook-logic-from-components
description: Tách logic ra khỏi React component — hook state/effect vào hooks/, logic thuần vào lib/, component chỉ nhận props và render JSX. Kích hoạt MỖI KHI tạo mới hoặc sửa bất kỳ file .tsx nào trong app/ hoặc components/, khi viết useState/useEffect/useRef/useTransition trong component, khi một component vượt 150 dòng, hoặc khi user nói "tách hook", "tách logic", "refactor component", "extract hook".
---

# Tách logic — hook riêng, code riêng, component chỉ render

Component là **lớp trình bày**. Nó nhận props, trả JSX. Nó không giữ quy tắc
nghiệp vụ, không tự gọi API, không tự quản lý vòng đời.

Quy tắc này **bắt buộc**, không phải gợi ý. Mỗi lần đụng vào `.tsx` là áp dụng.

## Ba lớp

| Lớp | Ở đâu | Được chứa gì | Cấm chứa gì |
|-----|-------|--------------|-------------|
| **Logic thuần** | `lib/<domain>/*.ts` | Hàm thuần: validate, format, parse, map dữ liệu, gọi API/SDK. Không import React. | `useState`, JSX, `window`/`document` truy cập trực tiếp |
| **Hook** | `hooks/use-*.ts` | `useState` / `useEffect` / `useRef` / `useTransition`, event handler, side effect. Uỷ thác mọi tính toán thật xuống `lib/`. | JSX, className, giá trị design (màu, spacing) |
| **Component** | `components/**/*.tsx`, `app/**/*.tsx` | JSX, className, layout, a11y attribute. Gọi đúng **một** hook của chính nó. | `useEffect`, logic điều kiện nghiệp vụ, `fetch`, gọi SDK |

Đường dẫn import dùng alias `@/` (xem `tsconfig.json` → `paths`).

## Ranh giới: đặt câu này ở lớp nào?

Trả lời theo thứ tự, dừng ở câu "có" đầu tiên:

1. **Chạy được mà không cần React không?** → `lib/`. Ví dụ: `isAppLocale()`, `nextPath()`, `signInWithGoogle()`.
2. **Cần state/effect/ref của React không?** → `hooks/`. Ví dụ: mở/đóng menu, roving focus, `useTransition` bọc Server Action.
3. **Chỉ quyết định trông ra sao?** → component. Ví dụ: `open ? "rotate-180" : ""`.

Nếu một dòng vừa tính toán vừa render — tách nó ra. Đó chính là chỗ đang gộp.

## Quy trình bắt buộc khi viết component

1. **Trước khi gõ JSX**, liệt kê mọi state và side effect component cần.
2. Cái nào không cần React → viết vào `lib/<domain>/` trước, kèm test `*.test.ts`.
3. Phần còn lại → viết `hooks/use-<tên>.ts`, trả về một object đặt tên rõ ràng.
4. Component import hook đó, destructure, render. Không `useState` rải rác.
5. Chạy `pnpm lint && pnpm typecheck`.

## Hook trả về cái gì

Trả **một object có tên**, không phải mảng vị trí. Thêm field về sau không phá
call site, và component chỉ lấy đúng thứ nó dùng.

Hai ràng buộc cứng do React Compiler (bật qua `eslint-plugin-react-hooks`):

**1. Destructure ngay tại call site — không giữ nguyên object.**

```tsx
// ĐÚNG
const { open, registerRoot, handleMenuKeyDown } = useMenuKeyboardNav({ itemCount });
<div ref={registerRoot}>{open && …}</div>

// SAI — 10 lỗi `react-hooks/refs`
const menu = useMenuKeyboardNav({ itemCount });
<div ref={menu.registerRoot}>{menu.open && …}</div>
```

Compiler không chứng minh được object trả về từ custom hook là không phải ref,
nên coi **mọi** truy cập `menu.x` lúc render là đọc `ref.current` và chặn —
kể cả `menu.open` trong `aria-expanded`. Đây là lỗi thật của `pnpm lint`,
đã gặp khi refactor `LanguageSelector`, không phải cảnh báo bỏ qua được.

**2. Không trả `RefObject` ra ngoài — trả ref callback.**

```ts
const rootRef = useRef<HTMLDivElement>(null);
const registerRoot = useCallback((node: HTMLDivElement | null) => {
  rootRef.current = node;
}, []);
return { registerRoot /* … */ };
```

Ref ở lại trong hook đúng phân lớp hơn: component không có việc gì với
`.current`. Bọc `useCallback` để identity ổn định, tránh React gỡ/gắn lại ref
mỗi lần render.

Ngoại lệ: ref callback **theo chỉ số** (`registerItem(index)`) buộc phải tạo
closure mới mỗi lần render. Vô hại vì React gỡ/gắn ref đồng bộ trong commit,
xong trước khi effect đọc `itemRefs.current`. Với danh sách dài hoặc render
liên tục thì hãy cache lại bằng `Map<number, RefCallback>`.

## Nhận diện vi phạm

Component đang gộp logic nếu thấy bất kỳ dấu hiệu nào:

- Có `useEffect` trong file `.tsx`
- Trên 2 `useState` trong một component
- Có hàm `handle*` dài quá 5 dòng
- Có `try/catch`, hoặc gọi `fetch` / SDK client
- File `.tsx` vượt 150 dòng (giới hạn cứng của dự án là 200 — xem `~/.claude/rules/development-rules.md`)
- Cùng một khối logic xuất hiện ở hai component

## Ví dụ — trước và sau

Lấy từ chính repo này: `components/login/language-selector.tsx`.

**Trước** — 100+ dòng state, effect, keyboard handler nằm chung với JSX:

```tsx
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => { /* click ngoài thì đóng */ }, [open]);
  useEffect(() => { itemRefs.current[activeIndex]?.focus(); }, [open, activeIndex]);

  function handleMenuKeyDown(event) { switch (event.key) { /* 6 nhánh */ } }
  // ... rồi mới tới JSX
}
```

**Sau** — logic điều hướng thuần ở `lib/`, vòng đời ở `hooks/`, component chỉ render:

```tsx
export function LanguageSelector({ label, onSelect }: LanguageSelectorProps) {
  const {
    open,
    activeIndex,
    registerRoot,
    registerButton,
    registerItem,
    close,
    handleButtonClick,
    handleButtonKeyDown,
    handleMenuKeyDown,
  } = useMenuKeyboardNav({ itemCount: OPTIONS.length });

  return (
    <div ref={registerRoot} className="relative flex h-14 w-[108px] items-center">
      <button
        ref={registerButton}
        aria-expanded={open}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
      >
        …
      </button>
      {open && (
        <div role="menu" onKeyDown={handleMenuKeyDown}>
          …
        </div>
      )}
    </div>
  );
}
```

Chú ý: destructure ngay, và gắn `registerRoot`/`registerButton` (ref callback)
— không có `menu.rootRef`, ref không bao giờ rời khỏi hook. Đây chính là hai
ràng buộc ở mục trên, áp dụng thật.

Component còn lại đúng phần trình bày. Logic con trỏ chạy vòng (`nextIndex`,
`prevIndex`) nằm ở `lib/`, test được bằng `vitest` mà không cần dựng DOM.

## Vì sao ở repo này ranh giới `lib/` lại quan trọng

Logic để trong `.tsx` là logic **không ai đo được** — component không nằm trong
phạm vi coverage, và đó là chủ ý. Đẩy xuống `lib/` hoặc `hooks/` là cách duy
nhất để nó vào báo cáo.

Phân lớp xong rồi thì phải kèm file gì bên cạnh (test co-located, story, ngưỡng
coverage, ranh giới runner) là việc của skill
[`write-unit-tests-and-storybook-stories`](../write-unit-tests-and-storybook-stories/SKILL.md).
Cấu hình cụ thể chỉ được chép ở đó, không lặp lại ở đây.

## Không áp dụng khi

- Component thuần trình bày, không state — không cần bịa ra hook cho nó.
- Một `useState` boolean duy nhất chỉ điều khiển class (ví dụ hover) — để tại chỗ.
- Icon component, file `*-copy.ts` chứa chuỗi tĩnh.

Đừng tách chỉ để cho có. Tách khi có logic thật.
