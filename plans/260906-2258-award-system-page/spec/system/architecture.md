---
status: draft
authored_by: takumi
created: 2026-09-06
lang: vi
---

# Architecture — Delta cho F004_AwardSystemPage

**Phạm vi:** chỉ những gì THAY ĐỔI trong `docs/vi/system/architecture.md` khi F004 lên code
thật — không phải bản viết lại toàn văn. Áp dụng phần này VÀO file gốc lúc Delivery.

## 1. Route mới — `/awards`

Zone B thêm 1 route segment ngang hàng `(home)`/`login`, cùng group `(public)`:

```
src/app/(public)/awards/
  page.tsx                          — Server Component, entry point GET /awards
  _components/
    awards-screen.tsx               — presentational root
    award-category-nav.tsx          — nav trái/thanh chip (client)
    award-section.tsx               — 1 section giải (image/content xen kẽ)
    icons/icon-{target,diamond,license}.tsx
  _hooks/use-award-category-nav.ts  — click-scroll + IntersectionObserver scroll-spy
  _utils/scroll-spy.ts              — pure: entries -> activeSlug
```

`src/proxy.ts`'s `config.matcher` KHÔNG cần thêm `/awards` — route PUBLIC, không refresh-session
guard nào áp dụng (khác `/`, vẫn giữ trong matcher vì có thể có session cookie cần refresh; nếu
`/awards` cũng cần refresh cookie tương tự `/`, thêm vào matcher là quyết định implementer, out
of scope cho spec này — xem Unresolved).

## 2. Component promotion — `(home)` → `(public)`

3 component climb đúng 1 nấc scope-ladder (`nextjs-route-colocation-architecture` SKILL.md:30)
vì nay có consumer ở cả `(home)` và `awards`:

| Trước | Sau | Rename |
|---|---|---|
| `(home)/_components/header.tsx` (`HomeHeader`) | `(public)/_components/site-header.tsx` (`SiteHeader`) | có |
| `(home)/_components/home-footer.tsx` (`HomeFooter`) | `(public)/_components/site-footer.tsx` (`SiteFooter`) | có |
| `(home)/_components/kudos-section.tsx` (`KudosSection`) | `(public)/_components/kudos-section.tsx` | không |

`(home)/_components/home-client.tsx` đổi import sang bản promote, props/hành vi giữ nguyên —
đây là di chuyển file thuần, không phải thiết kế lại. `AwardCard`/lưới giải trên `/` KHÔNG
promote — vẫn là UI riêng của trang chủ (thẻ tóm tắt, khác `AwardSection` chi tiết của
`/awards`).

Asset map `AWARD_NAME_GRAPHIC` (hiện cục bộ trong `award-card.tsx`) cũng leo lên
`(public)/_shared/award-name-graphics.ts` — cùng lý do, 2 consumer (`award-card.tsx`,
`award-section.tsx`).

## 3. DAL mới — `src/dal/awards.ts` + `src/dal/awards-client.ts`

Thêm cạnh `src/dal/{auth,users,users-role-client}.ts` hiện có, cùng layering rule (client hẹp
injected, `import "server-only"`, fail-open `[]`). Chi tiết đầy đủ ở
`spec/F004_AwardSystemPage/technical-spec.md § 4.5`.

## 4. Nguồn dữ liệu mới — Supabase `saa-app`

Bảng thứ 2 trong schema `public` (sau `public.users`): `public.awards`, read-only, RLS
`awards_select_all` cho cả `anon` và `authenticated` (khác `public.users`'s own-row policy —
`/awards` không có khái niệm "chủ sở hữu dòng"). Migration `0003_awards_table.sql` (planned).

## Unresolved

- `/awards` có cần vào `src/proxy.ts`'s `config.matcher` để refresh session cookie như `/`
  không — chưa quyết, để implementer đánh giá lúc code (không ảnh hưởng nội dung public, chỉ
  ảnh hưởng độ tươi của session cookie cho khách đã đăng nhập ghé `/awards`).
