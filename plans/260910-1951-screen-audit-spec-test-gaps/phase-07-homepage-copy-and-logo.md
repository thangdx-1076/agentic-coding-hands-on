---
phase: 07
title: "Trang chủ: nhãn nav số nhiều, dòng C1 còn thiếu, logo 64×60"
track: A (presentational)
test_policy: e2e-red-first
feature: F003
status: completed
priority: P1
effort: 2h
depends_on: [05]
blocks: [08]
owned_files:
  - messages/en.json
  - messages/vi.json
  - src/app/_shared/site-chrome.ts
  - src/app/_components/site-header.tsx
  - src/app/(public)/(home)/page.tsx
  - src/app/(public)/(home)/_shared/home-copy.ts
  - src/app/(public)/(home)/_components/awards-section.tsx
  - tests/e2e/home.spec.ts
---

# Phase 07 — Trang chủ khớp lại spec A1.1/A1.3/C1

## Context Links

- Spec: `spec/F003_Homepage/functional-spec.md` FR-211 (dòng C1 thứ 3), FR-212 (nhãn nav), FR-213
  (logo 64×60), RISK-04/05/06 · `technical-spec.md`
- Audit: `research/audit-homepage-fab.md` gap 1, 2, 3, 4, 5, 6, 8, 10, 11 · verified **V3** (code tự
  mâu thuẫn với comment của chính nó), **V4** (logo lệch), **V5** (6 tautology, agent chỉ thấy 2)
- MoMorph: `momorph/specs-i87tDx10uM.csv` rows A1, A1.1, A1.3, C1, 7.3 · TC ID-3, ID-8, ID-19,
  ID-21, ID-22, ID-34, ID-58

## Overview

**Priority** P1 · **Status** pending · Ba lệch có design chống lưng: nhãn nav ship "Award
Information" số ít dù comment ngay bên cạnh (`site-chrome.ts:67-68`) ghi rõ số nhiều mới là nội dung
được chấp nhận; logo header 52×48 thay vì 64×60; dòng thứ 3 của khối C1 ("Các hạng mục sẽ được trao
giải theo TOP những người xuất sắc nhất.") không render ở đâu cả. Kèm 4 assertion tautology trong
`home.spec.ts` và 2 TC nav chưa từng được test.

## Key Insights

- `home.spec.ts:469` (TC ID-3) có **đúng một** assertion và nó là `expect(page.url()).toContain("/")`
  — mọi URL đều chứa `/` ⇒ test rỗng nghĩa, không phải test yếu.
- Chuỗi nav nằm ở **3 chỗ**: `site-chrome.ts:69` (default), `messages/vi.json` và `messages/en.json`
  (`home.nav.awardsInfo`). Sửa thiếu một chỗ là copy lệch theo locale.
- Dòng C1 thứ 3 cần cả **4 chỗ**: `messages/vi.json`, `messages/en.json` (key mới
  `home.awards.description`), `(home)/page.tsx:93-95` (nơi lắp copy), `home-copy.ts:95-97` (type +
  default) rồi mới render ở `awards-section.tsx`.
- Logo: `site-header.tsx:56-66` có `width/height` **và** class `h-12 w-[52px]` ở **2 element**
  (`LogoLink` + `Image`) — đổi thiếu chỗ nào là ảnh bị co lại.
- TC ID-21 asserts **text** nhãn nav ⇒ viết test trước khi sửa nhãn cho ra RED thật.
- FAB pill 106×64 và inner group 42×32 (audit gap 17) **giữ nguyên** — accepted deviation đã ký ở
  `plans/260908-1103-home-widget-fab/clarifications.md:17,45-56`. Đừng mở lại.

## Requirements

Functional: (a) nhãn nav là "Awards Information" ở cả 3 chỗ; (b) logo header render 64×60; (c) khối
C1 render đủ 3 dòng (caption → divider → heading → description); (d) TC ID-21/ID-22 click nav header
tới `/awards` và `/kudos`; (e) 4 tautology thành so sánh `pathname`.

Non-functional: key `home.awards.description` phải có ở CẢ `vi.json` và `en.json` (parity test đếm
số key — thêm lệch là đỏ); layout C1 không đổi grid/khoảng cách hiện có.

## Architecture

```
messages/{vi,en}.json   home.nav.awardsInfo  → "Awards Information"
                        home.awards.description (KEY MỚI, cả 2 locale)
        ↓
site-chrome.ts:69 (default)          (home)/page.tsx:93-95  awards.description = t("awards.description")
        ↓                                     ↓
site-header.tsx  NavLink text        home-copy.ts  type HomeCopy.awards += description
                 Image 64×60 (2 chỗ)          ↓
                                     awards-section.tsx  <p> dưới <h2>
```

## Related Code Files

Sửa: `messages/vi.json` + `messages/en.json` (1 sửa + 1 thêm) · `site-chrome.ts:64-70` (giá trị +
comment tự mâu thuẫn) · `site-header.tsx:56-66` · `(home)/page.tsx:93-95` · `home-copy.ts:95-97` ·
`awards-section.tsx:35-49` · `tests/e2e/home.spec.ts` (`:37,:452,:469,:697` tautology; `:43-50` ID-8
boundingBox; ID-21/ID-22 mới; ID-19 click logo footer; ID-34 `press(" ")`; ID-58 `toHaveCount(2)`).
Tạo / Xoá: không.

## Implementation Steps

1. **RED** — sửa/thêm assertion trong `home.spec.ts` TRƯỚC khi chạm src:
   - ID-21: `header nav >> text="Awards Information"` click ⇒ `toHaveURL(/\/awards/)` — **đỏ** (nhãn
     đang số ít, locator không khớp).
   - ID-22: click "Sun* Kudos" ⇒ `toHaveURL(/\/kudos/)` — có thể xanh ngay; giữ, không kê làm RED.
   - ID-8: `expect(await logo.boundingBox()).toMatchObject({ width: 64, height: 60 })` — **đỏ**
     (52×48). Chú ý: `boundingBox` có thể phồng do transform hover ⇒ đo khi **không** hover, và
     dùng `Math.round`.
   - C1: `awards-section` chứa "Các hạng mục sẽ được trao giải theo TOP những người xuất sắc nhất."
     — **đỏ** (chuỗi không tồn tại).
   - 4 tautology → `expect(new URL(page.url()).pathname).toBe("/")`. Riêng `:469` (ID-3) thêm
     assertion scroll (`scrollY < 50`) như test ID-2 để nó có nghĩa thật.
   Chạy `pnpm test:e2e home.spec.ts` → ghi exit code + 3 assertion đỏ.
2. `messages/vi.json` + `messages/en.json`: sửa `home.nav.awardsInfo`, thêm `home.awards.description`
   (bản EN dịch nghĩa, không để trống — parity test soi số key, và phase 05's guard soi dấu tiếng
   Việt trong `en.json`).
3. `site-chrome.ts:69` → số nhiều; sửa comment `:67-68` cho khỏi tự mâu thuẫn nữa.
4. `site-header.tsx`: `width={64} height={60}` + class `h-[60px] w-16` ở **cả** `LogoLink` và `Image`.
5. `home-copy.ts` (type + default) → `(home)/page.tsx` → `<p>` trong `awards-section.tsx` dưới `<h2>`,
   typography nhỏ/nhạt hơn heading (không phát minh giá trị — dùng token đã có trong file).
6. GREEN: `pnpm test:e2e home.spec.ts` xanh → `pnpm test:e2e` full → `pnpm test:unit` (parity test
   phải xanh) → 4 gate → `pnpm build-storybook`.

## Todo List

- [ ] RED: ID-21, ID-8, C1 đỏ với lý do đúng
- [ ] 3 chỗ nhãn nav cùng đổi (grep `Award Information` → 0 hit)
- [ ] `home.awards.description` có ở CẢ 2 locale, EN không phải tiếng Việt
- [ ] Logo 64×60 ở cả `LogoLink` và `Image`
- [ ] 4 tautology thành `pathname`; ID-3 có assertion thứ hai
- [ ] FAB 106×64 / 42×32 không bị chạm
- [ ] GREEN + 4 gate + storybook + e2e full

## Success Criteria

- RED thật ×3, mỗi cái nêu giá trị nhận được (`Award Information`, `52×48`, chuỗi không tìm thấy).
- `grep -rn "Award Information" src/ messages/` → 0 hit.
- `grep -rn 'toContain("/")' tests/e2e/home.spec.ts` → 0 hit.
- `pnpm test:unit` xanh (parity key count khớp sau khi thêm key mới ở cả 2 file).
- 217 e2e + test mới xanh; `git diff` không chạm `widget-button.tsx`.

## Risk Assessment

| Risk | Khả năng | Ảnh hưởng | Countermeasure |
|---|---|---|---|
| Thêm key chỉ ở 1 locale ⇒ parity test đỏ | trung bình | thấp | bước 2 sửa 2 file trong cùng một lần; bước 6 chạy unit trước khi kết luận |
| `boundingBox` lệch vì transform hover | trung bình | trung bình | đo khi không hover; `Math.round`; nếu vẫn lệch thì assert `naturalWidth`/attribute thay vì box |
| Nhãn dài hơn làm header wrap ở mobile | trung bình | thấp | header đã `flex-wrap` (`site-header.tsx:51`); `tester` chốt bằng capture 375/768 |
| Logo lớn hơn đẩy nav xuống dòng | trung bình | thấp | như trên; nếu vỡ thì giảm gap, KHÔNG giảm logo về 52×48 |
| Sửa `messages/en.json` xung đột phase 05 | thấp | trung bình | thứ tự cứng 05 → 07; phase 07 không được start trước khi 05 merge |

**Rollback:** revert commit. Không DB, không migration.

## Security Considerations

Không có. Toàn bộ là copy hiển thị + kích thước ảnh tĩnh trong `public/`.

## Next Steps

Nhả `tests/e2e/home.spec.ts` cho phase 08 (viết lại assertion chữ số countdown). Ghi nợ còn lại của
màn chủ (hover CTA ID-46, card lift ID-51, active state footer) vào `plans/action-items.md` § Nợ lại
— chúng thuộc ~50 gap minor ngoài phạm vi.

## MoMorph refs:
- Homepage SAA: https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM
- Clarifications: `plans/260910-1951-screen-audit-spec-test-gaps/spec/F003_Homepage/`
  (plan này không có `clarifications.md`; deviation FAB đã ký ở `plans/260908-1103-home-widget-fab/clarifications.md`)
- testPolicy: e2e-red-first
