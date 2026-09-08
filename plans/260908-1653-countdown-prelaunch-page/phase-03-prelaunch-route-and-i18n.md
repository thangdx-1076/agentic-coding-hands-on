# Phase 03 — Route `/prelaunch` + i18n

## Context Links

- [plan.md](./plan.md) § Integration contract
- [spec/screens/SCR009_CountdownPrelaunch/spec.md](./spec/screens/SCR009_CountdownPrelaunch/spec.md) (layout, 9 element, responsive)
- [spec/countdown-prelaunch-page/technical-spec.md](./spec/countdown-prelaunch-page/technical-spec.md) § 3.1 A1, § 4.1
- [clarifications.md](./clarifications.md) (route path, copy, background asset)
- Skill: `nextjs-route-colocation-architecture` (`add-route`), `separate-hook-logic-from-components`, `write-unit-tests-and-storybook-stories`

## MoMorph refs

- Countdown - Prelaunch page: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/8PJQswPZmU
- Clarifications: `plans/260908-1653-countdown-prelaunch-page/clarifications.md`
- testPolicy: `e2e-red-first` (RED đã có từ phase 02; phase này làm nó xanh)

## Overview

**Priority:** P1 · **Status:** ✅ completed · **Effort:** 2h · **Deps:** 02

Commit: `a6470ce` (feat(prelaunch): add public /prelaunch countdown route)

Dựng route công khai `/prelaunch`: Server Component đọc `EVENT_START_AT`, một component trình bày cho
Storybook, một client wrapper mỏng để tick, cộng đúng **một** cặp khoá i18n mới.

## Key Insights

1. **Chỉ 1 khoá i18n mới:** `prelaunch.title`. Nhãn DAYS/HOURS/MINUTES tái dùng `home.hero.*` (đã có,
   cùng chữ — clarifications § copy). `metadata.title` giữ `"SAA 2025"` như `(home)/page.tsx`, không
   đẻ khoá. `messages-parity.test.ts` bắt cả hai file phải khớp key set — thêm ở một file là CI đỏ.
2. **Không có "Coming soon" trên màn này.** `spec.md § 3` liệt kê đúng 9 element, không có nó. Vì vậy
   **không** tái dùng `(home)/_components/countdown-timer.tsx` (nó mang logic `showComingSoon` và là
   file private của `(home)`) — viết wrapper riêng.
3. **`resolveTargetIso()` viết lại tại chỗ trong `page.tsx`**, đúng như technical-spec § 3.1 ghi
   ("cùng pattern `(home)/page.tsx`"). DRY thật nằm ở `parseTargetDate`, không ở cái vỏ 8 dòng đọc env.
   Trích nó lên Zone A sẽ phải sửa `(home)/page.tsx` — file thuộc sở hữu phase 01, đã đóng.
4. **Font phải tự áp trên root của màn.** `src/app/layout.tsx` chỉ nạp Geist. `CountdownTiles` dùng
   `font-montserrat`; `HomeScreen` áp `${montserrat.variable} ${montserratAlternates.variable}` trên
   root của chính nó. `PrelaunchScreen` phải làm y hệt, nếu không nhãn rơi về font mặc định.
5. **Không tái dùng `KeyvisualBackground`.** Nó ghim `aspect-[1512/1392]` cộng scrim gradient hoà vào
   nội dung trang chủ; màn này là phủ kín viewport, không cuộn. Viết markup nền riêng trong
   `prelaunch-screen.tsx`. **Không sửa** `src/app/_components/keyvisual-background.tsx` — file đó không
   thuộc sở hữu của phase nào ở đây.
6. **Story bắt buộc.** Skill companion: "mọi main route có một story xem được", dựng từ component trình
   bày chứ không từ `page.tsx` (async Server Component, Storybook không render được).
7. `/prelaunch` chưa nằm trong `config.matcher` cho tới phase 04, nên ở cuối phase này route render
   thẳng, không qua proxy. Đó là trạng thái đúng để C1..C4 xanh.

## Requirements

- FR-101 công khai, không guard, không đọc session.
- FR-001/FR-002 đọc `EVENT_START_AT` qua `parseTargetDate`; thiếu/hỏng → `null`, không throw.
- FR-201..FR-206, FR-401 theo `spec.md § 3` và Integration contract.
- NFR: mỗi file ≤ 200 dòng; kebab-case; `"use client"` chỉ ở lá tương tác thấp nhất.
- NFR: story render standalone (mọi prop có default).

## Architecture

```
GET /prelaunch
 └─ page.tsx  (Server Component)
      ├─ resolveTargetIso()  ← process.env.EVENT_START_AT → parseTargetDate → ISO | null
      ├─ getInitialNowMs()   ← Date.now() một lần mỗi request (seed hydration)
      ├─ getTranslations("prelaunch").title
      ├─ getTranslations("home").hero.{days,hours,minutes}
      └─ <PrelaunchScreen title countdown={<PrelaunchCountdown … />} />
             ├─ R1 nền full-bleed + lớp phủ tối (aria-hidden)
             └─ R2 nội dung giữa: <h1>{title}</h1> + slot countdown
                    └─ PrelaunchCountdown  ("use client")
                          useCountdown(targetIso, initialNowMs)  →  CountdownTiles
```

Luồng dữ liệu một chiều, không có state phía server, không có fetch phía client (FR-401): sau khi
hydrate, `setInterval` 1s trong `useCountdown` là nguồn thay đổi duy nhất.

## Related Code Files

**Create:**

- `src/app/(public)/prelaunch/page.tsx` — Server Component, `metadata.title = "SAA 2025"`
- `src/app/(public)/prelaunch/_components/prelaunch-screen.tsx` — trình bày, không `"use client"`
- `src/app/(public)/prelaunch/_components/prelaunch-screen.stories.tsx`
- `src/app/(public)/prelaunch/_components/prelaunch-countdown.tsx` — `"use client"`, wrapper tick
- `public/prelaunch/**` — **chỉ khi** asset MoMorph `2268:35129` khác `/home/Keyvisual_BG.png` (xem bước 1)

**Modify:**

- `messages/vi.json` — thêm `"prelaunch": { "title": "Sự kiện sẽ bắt đầu sau" }`
- `messages/en.json` — thêm `"prelaunch": { "title": "Event starts in" }`
- `src/constants/routes.ts` — thêm `PRELAUNCH: "/prelaunch"`

**Delete:** không file nào.

**Cấm chạm:** `src/proxy.ts` (phase 04), `src/domain/**` (phase 02/04), mọi file dưới
`src/app/(public)/(home)/**` (phase 01), `src/app/_components/keyvisual-background.tsx` (không ai sở hữu),
`tests/e2e/prelaunch.spec.ts` (phase 02).

## Implementation Steps

1. Đối chiếu asset nền: mở node MoMorph `2268:35129` và so với `public/home/Keyvisual_BG.png`. Trùng →
   dùng lại đường dẫn đó, **không** copy file. Khác → tải về `public/prelaunch/`. Ghi kết quả một dòng
   vào `plans/action-items.md § Decisions`.
2. `messages/vi.json` + `messages/en.json`: thêm khối `prelaunch` ở **cả hai** file, cùng key set.
   Chạy `pnpm test:unit src/lib/i18n/messages-parity.test.ts` ngay, trước khi viết tiếp.
3. `src/constants/routes.ts`: thêm `PRELAUNCH: "/prelaunch"` (giữ `as const`).
4. `prelaunch-countdown.tsx` (`"use client"`): props `{ targetIso: string | null; initialNowMs: number;
   labels: { days: string; hours: string; minutes: string } }`; gọi `useCountdown` từ `@/hooks/use-countdown`;
   render `CountdownTiles` từ `@/components/countdown-tiles`. Không nhánh điều kiện nào khác — bỏ
   `showComingSoon`.
5. `prelaunch-screen.tsx`: props `{ title: string; countdown?: ReactNode }`. Root mang
   `${montserrat.variable} ${montserratAlternates.variable} relative isolate flex min-h-screen w-full
   flex-col items-center justify-center overflow-hidden bg-login-background`. Bên trong: ảnh nền
   `next/image` `fill` + `object-cover`, bọc trong `<div aria-hidden>` (E01), một lớp phủ tối tuyệt đối
   (E02), rồi khối nội dung giữa với `<h1>{title}</h1>` (E03) và `{countdown ?? <CountdownTiles 00/00/00 …>}`.
   Không header, không footer.
6. `prelaunch-screen.stories.tsx`: story `Default` (zero-state) và `Live` (`days="120"`), theo đúng kiểu
   `countdown-tiles.stories.tsx` đã dời ở phase 01.
7. `page.tsx`: `resolveTargetIso()` + `getInitialNowMs()` copy pattern từ `(home)/page.tsx` (kèm
   `console.warn` khi env có giá trị nhưng hỏng); lấy translation; render `PrelaunchScreen`.
8. Responsive: không thêm breakpoint mới — `CountdownTiles` đã mang mobile/`sm:`/`lg:` (spec § 10).
   Chỉ chỉnh padding của khối nội dung giữa cho khỏi tràn ở 375px.
9. `pnpm lint --max-warnings 0 && pnpm format:check`, rồi `pnpm build && pnpm typecheck`, rồi
   `pnpm build-storybook`.
10. `pnpm exec playwright test tests/e2e/prelaunch.spec.ts` → C1..C4 (và C6) xanh.
11. Commit: `feat(prelaunch): add public /prelaunch countdown route`.

## Todo List

- [x] Chốt asset nền, ghi decision
- [x] `prelaunch.title` ở CẢ vi và en; parity test xanh
- [x] `ROUTES.PRELAUNCH`
- [x] `prelaunch-countdown.tsx` (`"use client"`, không có "Coming soon")
- [x] `prelaunch-screen.tsx` (font variable trên root, nền + lớp phủ `aria-hidden`, không header/footer)
- [x] `prelaunch-screen.stories.tsx` render standalone
- [x] `page.tsx` Server Component, `resolveTargetIso` + `getInitialNowMs`
- [x] Mọi file mới ≤ 200 dòng
- [x] lint / format / build / typecheck / build-storybook xanh
- [x] `tests/e2e/prelaunch.spec.ts` xanh (không sửa một ký tự nào của file test)

## Success Criteria

```bash
pnpm exec playwright test tests/e2e/prelaunch.spec.ts    # exit 0 — GREEN của phase
pnpm test:unit src/lib/i18n/messages-parity.test.ts      # exit 0
pnpm lint --max-warnings 0 && pnpm format:check
pnpm build && pnpm typecheck && pnpm build-storybook
```

Cộng: `pnpm test:unit` vẫn đỏ ở `src/domain/prelaunch-lock.test.ts` — **đúng như mong đợi**, phase 04
mới đóng nó.

## Risk Assessment

| Risk | Khả năng | Tác động | Đối sách |
|---|---|---|---|
| Thêm khoá i18n một bên → `messages-parity.test.ts` đỏ | Cao | Thấp | Bước 2 chạy riêng parity test ngay sau khi sửa JSON |
| Quên font variable trên root → nhãn sai typeface, e2e vẫn xanh | Trung bình | Trung bình | Bước 5 ghi tường minh; xác nhận bằng visual validation ở phase 05 |
| Nền không phủ kín / bị cuộn ở mobile | Trung bình | Trung bình | `min-h-screen overflow-hidden`, `object-cover`; kiểm 375/768/1512 ở phase 05 |
| `role="timer"` với `aria-live` đọc liên tục cho screen reader (spec § 9) | Trung bình | Trung bình | Giữ nguyên `CountdownTiles` như trang chủ, **không** thêm `aria-live`; ghi nợ nếu a11y review yêu cầu |
| Lệch hydration vì `Date.now()` gọi ở client render đầu | Thấp | Cao | `initialNowMs` seed từ server, `useCountdown` không tự gọi `Date.now()` trước tick đầu (đã có sẵn) |
| Font "Digital Numbers" chưa nạp, digit fallback `monospace` | Chắc chắn | Thấp | Nợ kế thừa từ trang chủ (RISK-02), không làm nặng thêm ở đây |
| Tái dùng nhầm `countdown-timer.tsx` của `(home)` → import ngang segment, lint chặn | Trung bình | Thấp | Rule boundary trong `eslint.config.mjs` bắt được; bước 4 đã nói viết wrapper riêng |
| File `page.tsx` phình quá 200 dòng vì copy pattern trang chủ | Thấp | Thấp | Màn này chỉ có 1 khoá copy, không có `HomeCopy` khổng lồ |

## Security Considerations

- `EVENT_START_AT` là server-only, **không** thêm tiền tố `NEXT_PUBLIC_`; chỉ chuỗi ISO đã validate được
  đẩy xuống client qua prop `targetIso`, không phải giá trị env thô.
- Không guard quyền nào trên màn này — chủ đích (FR-601). Không đọc session, không gọi Supabase, không
  render bất cứ PII nào.
- 4 test case ACCESSING (`68d82c58`, `e6a59553`, `1c266552`, `17aa9e0d`) **không hiện thực** — boilerplate
  tự sinh, `Expected_Result` là `---`. Ghi nợ ở `clarifications.md`, không suy ra luật phân quyền.
- `console.warn` khi `EVENT_START_AT` hỏng chỉ in lại giá trị cấu hình, không phải secret.

## Rollback

Commit riêng của phase. Lùi: `git revert <sha>`. Không có state ngoài repo. Rủi ro tồn dư duy nhất là 3
dòng ở file dùng chung — `messages/{vi,en}.json` và `src/constants/routes.ts`; revert gỡ sạch cả ba vì
không phase nào khác chạm chúng. Route mới chưa nằm trong `config.matcher` nên gỡ nó không ảnh hưởng
đường đi của bất kỳ route nào đang chạy.

## Next Steps

Phase 04 dùng `ROUTES.PRELAUNCH` vừa thêm và mở `config.matcher`. Không phase nào sau này được sửa
`tests/e2e/prelaunch.spec.ts` để giữ màu xanh.
