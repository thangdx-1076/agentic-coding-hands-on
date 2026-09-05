---
title: "Login hero background asset — found in sibling project, switched to next/image"
date: 2026-09-05
time: "14:41"
tags: [fix-bug, momorph, next-image, login]
---

# Bối cảnh

Màn `/login` shipped 2026-09-04 với placeholder gradient + đánh dấu node `MM_MEDIA_*` chưa tải asset. User phát hiện hero section có nền xám đặc (`#00101A` + 2 overlay), không ảnh keyvisual theo design MoMorph screen GzbNeVGJHz. Asset slug `public/login/keyvisual.png` được mềm đặt trong `login-background.tsx` nhưng file không tồn tại.

---

## Nguyên nhân gốc

Figma node `662:14389` ("image 1", 1441×1022) là `RECTANGLE` với image-fill, **không đặt tên theo quy ước `MM_MEDIA_*`**. MoMorph asset downloader (`get_figma_image`, `get_media_file`, `get_design_item_image`) đều bỏ qua nó (API trả HTTP 500 / 401 / "position data missing"). Codebase chỉ có reference placeholder; không ai export bitmap từ Figma.

---

## Cách sửa

1. **Tìm asset từ project anh em**: `~/Desktop/Claude-and-mormoph/saa-app/public/assets/login/images/key-visual.png` (2882×2044 = 2× của node, Figma crop đã bake).
2. **Copy → `public/login/keyvisual.png`**, encode làm PNG.
3. **Đổi `login-background.tsx`**: từ `<div style={{ background: url(...) }}>` → `next/image` (`fill`, `object-cover`, `sizes="100vw"`). Next tối ưu WebP ~660 KB thay vì 9.4 MB PNG.
4. **Cẩn thận Next 16**: loại bỏ `quality={85}` — Next 16 chỉ cho phép values trong `images.qualities` mặc định `[75]` (HTTP 400 nếu ngoài). Kiểm tra `.next/cache/images` — optimizer cache giữ rendition cũ.
5. **Regression TC 5fbe2a18**: thêm assert `page.request.get('/login/keyvisual.png')` → 200 + `<img>.complete && naturalWidth > 0`. Chỉ check URL trực tiếp vì `.next/image` cache che phủ.
6. **Docs fix**: loại bỏ "known gap" từ README, cập nhật `docs/vi/screens/SCR001_Login/spec.md` section E03 `hero-visual.*`.

---

## Bài học

- **Figma decoration image fills phải đặt tên `MM_MEDIA_*`** mới tạo entry trong MoMorph export. Nếu không → tìm sibling project (đã có asset).
- **Regression asset test phải bypass optimizer cache**: chỉ check file tĩnh + img.complete/naturalWidth, không rely on `_next/image` rendition.
- **Next 16 `images.qualities` allowlist** — không custom `quality` ngoài `[75]` mặc định (hoặc config rõ ràng trong `next.config.ts`).

---

## Còn mở

- `docs/vi/system/*` vẫn forward-draft (rebuild-spec Core pending, không blocking).
- Reviewer deferred items không thay đổi.

---

**Evidence**: `git log --oneline -3` e8ec751→403266f→dee240c; TC 5fbe2a18 (14/14 E2E GREEN); tsc/lint/vitest clean.

---

## Closing note (2026-09-05 15:53)

Hai mục ở "Còn mở" phía trên đã đóng trong session tiếp theo:
1. **`docs/vi/system/*` forward-draft** → closed by `/tkm:rebuild-spec --core` full pass; system docs promoted, "chưa có code" token removed.
2. **Reviewer deferred items** → U+2028/U+2029 hardening + ARIA menu keyboard nav both implemented, sealed in `plans/260904-1633-login-page-google-oauth/evidence/inspection-verdict.json` 9/10.

Xem journal entry `docs/journals/260905-1553-polish-defer-fixes-and-core-docs-rebuild.md` cho chi tiết.
