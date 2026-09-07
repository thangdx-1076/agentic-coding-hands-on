# Traceability Matrix

**Project**: Project
**Generated**: 2026-09-05T08:34:08Z
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

---

## Cross-Reference Validation

- [x] Every `SCR###`/`US###`/`BL###`/`PERM###` cell is projected from `generated/feature-list.md`'s own per-feature `**Related X**:` bullets
- [x] Every `ROUTE###` cell is projected from `generated/route-list.md`'s own `Owner F###` column
- [x] No ID in this matrix is invented — see `validate_traceability_matrix.py` for the WARN-first cross-check against each source-of-record inventory
