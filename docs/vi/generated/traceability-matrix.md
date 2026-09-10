# Traceability Matrix

**Project**: agentic-coding-hands-on
**Generated**: 2026-09-10 (đồng bộ lại F006-F012, trước đó dừng ở F005)
**Scope**: Full codebase

> **Re-projection, not detection.** Every ID below already exists in its source-of-record artifact — this file invents nothing, and is never the first place an ID appears. Source of record per column: `F###` <- `generated/feature-list.md`; `SCR###` <- `generated/screen-list.md`; `US###` <- `generated/user-stories.md`; `BL###` <- `generated/behavior-logic.md`; `ROUTE###` <- `generated/route-list.md` (`Owner F###` column); `PERM###` <- `generated/permissions-matrix.md`.

---

## Matrix

| F### | SCR### | US### | BL### | ROUTE### | PERM### |
|---|---|---|---|---|---|
| F001 | SCR001, SCR002 | US002, US003 | BL001, BL002, BL003 | ROUTE001 | PERM001 (superseded), PERM002, PERM003, PERM004 |
| F002 | SCR001, SCR003 | US001 | — | — | — |
| F003 | SCR003 | TBD (chưa cấp mã US### — xem `features/F003_Homepage/functional-spec.md` § 7, chạy `/tkm:rebuild-spec --features F003`) | — | — | TBD (screen-permission chưa cấp mã — xem `generated/permissions-matrix.md` § Role-based screen-permission) |
| F004 | SCR004 | TBD (chưa cấp mã US### — xem `features/F004_AwardSystemPage/functional-spec.md` § 7, chạy `/tkm:rebuild-spec --features F004`) | — | — | — (không PERM### mới, `/awards` PUBLIC — xem `generated/permissions-matrix.md` § `/awards`) |
| F005 | SCR005 | TBD (draft, local — theo tiền lệ F003/F004, không đăng ký vào `generated/user-stories.md`; xem `features/F005_StandardsRulesPage/functional-spec.md` § 7) | — | — | — (không PERM### mới, `/standards` PUBLIC — xem `generated/permissions-matrix.md` § `/standards`) |
| F006 | SCR006 | TBD (draft, local — theo tiền lệ F003-F005, không đăng ký vào `generated/user-stories.md`; xem `features/F006_ProfilePage/functional-spec.md` § 7) | — | — | — (không PERM### mới, `/profile` gia nhập cơ chế PERM003_TodoRouteGuard hiện có — xem `generated/permissions-matrix.md` § PERM003_TodoRouteGuard) |
| F007 | SCR007 (dùng chung với F008/F010/F012) | TBD (draft, local — US001-US008; xem `features/F007_KudosLiveBoard/functional-spec.md` § 7) | — | — | — (không PERM### mới, `/kudos` PUBLIC — xem `generated/permissions-matrix.md` § `/kudos`) |
| F008 | SCR007 (dùng chung với F007) | TBD (draft, local — US001; xem `features/F008_KudosHeartReaction/functional-spec.md` § 7) | — | — | TBD (draft — trục GHI thứ hai của `/kudos`, RLS trên `kudo_hearts`, chưa cấp PERM### — xem `generated/permissions-matrix.md` § `/kudos`) |
| F009 | SCR008 | TBD (draft, local — US001-US004; xem `features/F009_KudosCompose/functional-spec.md` § 6) | — | — | TBD (draft — trục GHI thứ ba của `/kudos`, `kudos_insert_own` + policy `storage.objects`, chưa cấp PERM### — xem `generated/permissions-matrix.md` § F009_KudosCompose) |
| F010 | SCR007 (không có SCR### riêng — modal phủ trên board, dùng chung với F007/F008) | TBD (draft, local — US001-US003; xem `features/F010_SecretBoxModal/functional-spec.md` § 7) | — | — | TBD (draft — trục GHI thứ tư của `/kudos`, RPC `open_secret_box()` chỉ `GRANT EXECUTE` cho `authenticated`, chưa cấp PERM### — xem `generated/permissions-matrix.md` § F010_SecretBoxModal) |
| F011 | SCR009 | TBD (draft, local — US001-US002; xem `features/F011_CountdownPrelaunchPage/functional-spec.md` § 6) | — | `/prelaunch` (frontend page — chưa cấp ROUTE### theo quy ước backend-only của `route-list.md`) | TBD (draft — khoá điều hướng site-wide theo `PRELAUNCH_LOCK_ENABLED`, áp cho MỌI actor bất kể danh tính, chưa cấp PERM### — xem `generated/permissions-matrix.md` § `/prelaunch`) |
| F012 | SCR003, SCR004, SCR006, SCR007 (không có SCR### riêng — cross-cutting qua `SiteHeader` dùng chung) | TBD (draft, local — US001-US004; xem `features/F012_NotificationsPanel/functional-spec.md` § 7) | — | — (không route riêng — cross-cutting header component) | TBD (draft — trục ĐỌC own-row qua RLS + Realtime + `GRANT UPDATE (is_read)` theo cột trên `public.notifications`, chưa cấp PERM### — xem `generated/permissions-matrix.md` § `public.notifications`) |

---

## Cross-Reference Validation

- [x] Every `SCR###`/`US###`/`BL###`/`PERM###` cell is projected from `generated/feature-list.md`'s own per-feature `**Related X**:` bullets
- [x] Every `ROUTE###` cell is projected from `generated/route-list.md`'s own `Owner F###` column
- [x] No ID in this matrix is invented — see `validate_traceability_matrix.py` for the WARN-first cross-check against each source-of-record inventory
