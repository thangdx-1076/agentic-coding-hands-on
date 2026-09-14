# Documentation Index — Reading Order

This project documents in Vietnamese only — there is no `docs/en/` tree. The full reading-order
index, grouped by layer and by role, lives at **[docs/vi/README.md](vi/README.md)**. Start there.

Machine-readable mirror: [`.reading-order.json`](.reading-order.json) (`lang: "vi"`, same content
as [`vi/.reading-order.json`](vi/.reading-order.json)).

<!--
  Deliberately hand-written, with NO `rebuild-spec navigation` marker pair.

  The navigation generator's `resolve_root_readme_removal()` DELETES any bare-root README that
  carries the generated-marker pair with an empty tail below `end-generated` — a thin pointer
  gets wiped exactly like a full index would. Only a file with no markers at all (or with real
  content below the closing marker) survives a per-lang pass. Keep this file marker-free so the
  pointer above is not silently removed on the next run.
-->

## Tài liệu viết tay

- [login-flow.md](login-flow.md) — luồng đăng nhập Google OAuth đầy đủ: từ lúc bấm nút tới hai tầng guard, session cookie, logout và ma trận lỗi.
- [deployment.md](deployment.md) — deploy và biến môi trường.
- [data-migration.md](data-migration.md) — đổi dữ liệu (row) trên production: seed nội dung, backfill cột, dọn dữ liệu demo, sửa row sai. Kèm backup, verify và rollback theo từng loại.
