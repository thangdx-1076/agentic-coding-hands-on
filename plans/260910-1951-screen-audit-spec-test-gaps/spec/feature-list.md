# Feature List — bản revision (batch 5 feature)

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-10
**Analysis Scope**: 5 feature ĐÃ implement, được revise sau lượt audit 8 màn hình
(`plans/260910-1951-screen-audit-spec-test-gaps/reports/audit-verdict-260910-2015.md`).

**F-code stability note**: batch này **không có feature mới** — cả 5 folder đều mang `fcode:` thật,
đã tồn tại trong `docs/vi/_canonical-fcodes.json`. Theo `spec-state-registration.md` § Promote —
SYSTEM S2, `#new == 0` nên bước cấp mã (batch reservation) được **BỎ QUA hoàn toàn**: không cấp
`F###` mới, không thêm dòng reservation, không renumber/rename/split/merge. Promote chỉ ghi đè
`docs/vi/features/<slug>/` của đúng 5 feature dưới đây.

Feature không nằm trong batch nhưng bị các phase chạm tới — **F004_AwardSystemPage** (phase 09) và
**F009_KudosCompose** (phase 11, 12) — cố tình KHÔNG có spec revision: yêu cầu cho chúng đã đúng ở
spec đang ship (với F009, spec đã hứa viền đỏ lỗi từ FR-402/DEC-002 — sai nằm ở code), nên không có
gì để sửa ở tầng spec. Đừng thêm chúng vào đây để "cho đủ".

## Feature Hierarchy

| Code | Name | Type | Language | Workspace | Priority |
|------|------|------|----------|-----------|----------|
| F002_LanguageSwitch | Chuyển đổi ngôn ngữ giao diện (VN/EN) | ui | TypeScript | agentic-coding-hands-on | P1 |
| F003_Homepage | Trang chủ SAA 2025 (Homepage) | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F007_KudosLiveBoard | Bảng Kudos trực tiếp (`/kudos`) | mixed | TypeScript | agentic-coding-hands-on | P0 |
| F008_KudosHeartReaction | Thả tim cho Kudos | mixed | TypeScript | agentic-coding-hands-on | P1 |
| F011_CountdownPrelaunchPage | Màn đếm ngược tiền sự kiện (`/prelaunch`) + khoá điều hướng site-wide | mixed | TypeScript | agentic-coding-hands-on | P1 |

Tên / type / priority giữ nguyên nguyên văn từ `docs/vi/generated/feature-list.md` — batch này
revise nội dung spec, không đổi danh tính feature.

## Ngoài feature: delta cho system doc

`spec/system/permissions.md` là một **system-doc delta**, không phải feature. Vòng lặp promote
theo feature không chạm tới nó — nó cần lượt § Promote — SYSTEM-DOC riêng (copy →
`docs/vi/system/permissions.md`, đổi status, sentinel nhánh `system_docs`, KHÔNG cấp `F###`,
KHÔNG thêm dòng feature-list). Nội dung: view SECURITY DEFINER mới cho "10 SUNNER NHẬN QUÀ MỚI
NHẤT" đảo lại kết luận đang ghi ở `docs/vi/system/permissions.md:408-414`.
