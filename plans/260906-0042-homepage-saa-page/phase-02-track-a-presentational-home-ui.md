---
phase: 02
feature: F003
status: completed
priority: P0
test_policy: e2e-red-first
effort: 4h
owner: momorph-ui-implementer
depends_on: [01]
file_ownership: ["components/home/** (trừ countdown-timer.tsx)", "public/home/**", "app/globals.css", "app/fonts.ts"]
---

# Phase 02 — Track A: presentational Home UI

**Screen**: SCR-home — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM · **Refs**: `clarifications.md` (§ E2E contract, § Assets, § Widget), `momorph/texts.json` (nguồn copy vi DUY NHẤT), `momorph/specs.csv` (46 item), `momorph/media-nodes.json` (35 asset), `data/preview.png` (1512×4480) · **testPolicy**: `e2e-red-first` (RED do tester giữ; agent này KHÔNG sửa test)

**Goal**: Dựng đủ 8 vùng trình bày của `/` đúng design — header sticky (logo, 3 NavLink, LanguageSelector tái dùng từ `components/login/`, bell/account hoặc link đăng nhập, tất cả props-only), hero + `CountdownTiles` (thuần props, KHÔNG gọi hook), EventInfo, CtaButtons, RootFurtherContent, AwardsSection + 6 AwardCard, KudosSection, HomeFooter, WidgetButton, icons, `home-copy.ts` (verbatim Figma vi) — dùng nội dung Figma làm mock, không bịa dữ liệu.

**Out of scope** (KHÔNG chạm): `components/home/countdown-timer.tsx` (phase 05), `app/**` trừ `app/globals.css`+`app/fonts.ts` additive, `package.json`, `proxy.ts`, `lib/**`, `hooks/**` (chỉ *import* `useMenuKeyboardNav` sẵn có), `messages/**`, `mocks/**`, `tests/**`, mọi lời gọi Supabase/next-intl/Server Action.

## Integration contract (Track B lệ thuộc, không đổi đơn phương)

- `HomeScreen({ copy?, locale?, viewer?, countdown?: ReactNode, unreadCount?, onSelectLocale?, logoutAction? })` — xem `plan.md` § Integration contract; `countdown` là **slot ReactNode**, default 3 ô `00` tĩnh.
- `HomeCopy` (`components/home/home-copy.ts`) leaf path là hợp đồng cho `messages/*.json home.*`: `nav · header · hero · event · cta · rootFurther{heading,paragraphs:string[]} · awards{caption,heading,items[6]{slug,title,description,image}} · kudos · footer · account · notifications · widget`.
- ARIA bất biến (E2E assert nguyên văn): logo `a[aria-label="Sun* Annual Awards 2025"] > img[alt="Sun* Annual Awards 2025"]` href `/` (header + footer); đúng MỘT `<h1>` chứa "ROOT FURTHER"; landmark `<main>` (100×100px đầu tiên không có phần tử tương tác); `[role="timer"]` bọc 3 tile, mỗi tile có element chữ số `/^\d{2,}$/` + nhãn `DAYS|HOURS|MINUTES` là con trực tiếp; NavLink "About SAA 2025" href `/` mang `aria-current="page"`; anon: `a[aria-label="Đăng nhập"]` href `/login`, KHÔNG render bell; authed: `button[aria-label="Thông báo"][aria-haspopup="dialog"]` + `button[aria-label="Tài khoản"][aria-haspopup="menu"]`; menuitem là `<a role="menuitem" href>` (Hồ sơ `/profile`, Trang quản trị `/admin` chỉ khi `viewer.isAdmin`) và `<button type="submit" role="menuitem">` (Đăng xuất, trong `<form action={logoutAction}>`); `button[aria-label="Hành động nhanh"][aria-haspopup="menu"]` fixed bottom-right, menu 2 item; badge chỉ render khi `unreadCount > 0`; trong header đúng MỘT `button[aria-haspopup="menu"]` khi anon (LanguageSelector), và tối đa MỘT `[role="menu"]` mở cùng lúc.
- Chống strict-mode trùng: mỗi link "Chi tiết" có `aria-label` riêng (`Chi tiết <tên giải>`, `Chi tiết Sun* Kudos`); đúng MỘT `heading` tên "Sun* Kudos"; thứ tự DOM card cố định Top Talent → Top Project → Top Project Leader → Best Manager → Signature 2025 - Creator → MVP (Most Valuable Person); href card `/awards#<slug>` (bảng slug ở `clarifications.md`).
- Copy: "Awards Information" (không phải "Award Information"), "Coming soon" (sửa typo "Comming"), event info theo spec/TC ("Thời gian: 18h30", "Địa điểm: Nhà hát nghệ thuật quân đội", "Tường thuật trực tiếp tại Group Facebook Sun* Family"), copyright "Bản quyền thuộc về Sun* © 2025". Nhãn DAYS/HOURS/MINUTES và tiêu đề giải giữ tiếng Anh.
- Layout: grid card 3 cột ≥1024px / 2 cột <1024px, mô tả `line-clamp-2`; `next/image` cho bitmap (hero `fill` + `preload`, KHÔNG `priority` deprecated, không set `quality`); asset về `public/home/`; logo thiếu export → tái dùng `public/login/Logo.png`.

**Success criteria**: `pnpm typecheck`, `pnpm lint --max-warnings 0`, `pnpm format:check`, `pnpm build-storybook` đều exit 0 khi phase này đứng một mình; `*.stories.tsx` cho mọi common component + route story `HomeScreen` (4 variant: anonymous, member, admin, zero-state countdown), story chỉ dùng props — KHÔNG MSW, KHÔNG import từ `app/`; asset coverage `public/home/**` đủ theo `media-nodes.json` (thiếu thumbnail không chặn GREEN, thiếu logo thì chặn); báo visual handoff cho orchestrator. Mọi sửa UI về sau vẫn do agent này nhận, không phải generic `implementer`.

## Status (2026-09-06) — DONE

- [x] Header sticky (logo, 3 NavLink, `LanguageSelector` tái dùng nguyên trạng, bell/account hoặc link đăng nhập, props-only) — `header.tsx`, `nav-link.tsx`, `account-menu.tsx`, `notification-bell.tsx`, `icons/icon-bell.tsx`, `icons/icon-user.tsx`.
- [x] Hero + `CountdownTiles` (thuần props, không hook) + `EventInfo` + `CtaButtons` + `KeyvisualBackground` — `hero-section.tsx`, `countdown-tiles.tsx`, `event-info.tsx`, `cta-buttons.tsx`, `keyvisual-background.tsx`.
- [x] `RootFurtherContent` + `AwardsSection` + 6× `AwardCard` — `root-further-content.tsx`, `awards-section.tsx`, `award-card.tsx`.
- [x] `KudosSection` + `HomeFooter` + `WidgetButton` + `icons/icon-pencil.tsx`.
- [x] Shared foundation: `home-copy.ts` (verbatim Figma vi), `logo-link.tsx`, `icons/icon-up-right.tsx` (written by the orchestrator to avoid cross-section file conflicts).
- [x] Root composition `home-screen.tsx` + route story `home-screen.stories.tsx` (4 variants: Anonymous, Member, Admin, ZeroState).
- [x] `*.stories.tsx` present for every common component (16 story files total).
- [x] `pnpm typecheck` exit 0 · `pnpm lint --max-warnings 0` exit 0 · `pnpm format:check` exit 0 · `pnpm build-storybook` exit 0.
- [x] Asset coverage checked — exit 2 with 18 non-blocking gaps (repeated-template AwardCard instances + 2 icons inside the reused `LanguageSelector`); the blocking item (header/footer logo) IS covered. See phase report for detail.
- [ ] Visual/GREEN validation — delegated to `tester` (not run by this agent per contract).
