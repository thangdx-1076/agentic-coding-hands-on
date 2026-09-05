---
phase: 05
status: pending
priority: P1
effort: 1.5h
owner: implementer
depends_on: [03]
file_ownership: [".github/workflows/ci.yml"]
---

# Phase 05 — CI job `quality`

## Context Links

- `clarifications.md` § Step 2b (pin Node 24; env placeholder ở CẢ hai job; không secret thật)
- `plans/reports/researcher-260905-1624-pnpm-and-ci.md` § B.1 (hình dạng workflow), § B.4 (env build-time vs test-time)
- `spec/system/architecture.md` § Deployment View

## Overview

**Priority**: P1 · **Status**: pending
Dựng `.github/workflows/ci.yml` từ con số 0 — repo chưa có `.github/` nào. Phase này chỉ tạo job `quality`; job `e2e` là của phase 06 và nối tiếp trên cùng file.

Chạy **song song phase 04**: 05 giữ đúng `.github/**`, 04 giữ `tests/**` + `package.json` + `vitest.config.ts`. Không giao nhau.

## Key Insights

- **`build` phải chạy TRƯỚC `typecheck`.** Next 16 sinh ambient type (`LayoutProps`) vào `.next/types` chỉ sau build/dev; `tsc --noEmit` trên runner sạch luôn đỏ nếu chạy trước. Đây là lỗi có sẵn, không phải hệ quả pnpm — researcher đã gặp và định danh. Xếp sai thứ tự là dựng một CI đỏ ngay lần chạy đầu vì lý do giả.
- Thứ tự tối ưu cho phản hồi: `lint` → `format:check` → `test:unit` (đều dưới 10 giây) → `build` (đắt nhất) → `typecheck` (rẻ, nhưng bị buộc phải sau build).
- **Trigger nhắm `main`, mà việc đang nằm trên `feat/login-google-oauth`** → workflow sẽ không chạy lần nào trước khi mở PR. Thêm `workflow_dispatch` để chạy tay trên feature branch và chứng minh nó xanh **trước** khi merge. Default branch `main` đã xác nhận trên cả hai remote (`origin` thangdx-1076, `upstream` sun-asterisk-internal).
- `pnpm/action-setup@v6` **không truyền `version:`** — nó tự đọc `packageManager` trong `package.json`, giữ một nguồn sự thật duy nhất với máy dev.
- `actions/setup-node@v4` với `cache: 'pnpm'` tự khoá cache theo `pnpm-lock.yaml`. Không tự viết bước cache thủ công.
- Hai biến `NEXT_PUBLIC_*` là **placeholder**, không phải secret. `saa-app` là instance local `127.0.0.1` — runner không bao giờ với tới; đưa giá trị thật vào chỉ tăng bề mặt rủi ro mà chẳng làm test nào chạy được thêm. Chúng cần tồn tại vì Next inline biến `NEXT_PUBLIC_*` vào bundle client lúc build.
- Không dùng `--cache` cho ESLint trong CI: cache dir không được lưu giữa các lần chạy, cờ đó chẳng tiết kiệm gì. Không SARIF, không reviewdog ở ngày đầu — exit code khác 0 đã chặn merge và Actions log đã hiển thị stderr.
- `--frozen-lockfile` là điểm mấu chốt: nó biến `pnpm-lock.yaml` của phase 01 thành hợp đồng có hiệu lực — lockfile lệch manifest là CI đỏ, không phải âm thầm resolve lại.

## Requirements

- Trigger: `push` tới `main`, `pull_request` nhắm `main`, `workflow_dispatch`.
- `concurrency: { group: "${{ github.workflow }}-${{ github.ref }}", cancel-in-progress: true }`.
- Job `quality` trên `ubuntu-latest`, Node **pin 24** (không matrix).
- Các bước: checkout → `pnpm/action-setup@v6` → `actions/setup-node@v4` (`node-version: '24'`, `cache: 'pnpm'`) → `pnpm install --frozen-lockfile` → `pnpm lint --max-warnings 0` → `pnpm format:check` → `pnpm test:unit` → `pnpm build` → `pnpm typecheck`.
- Env cấp ở mức job: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — giá trị placeholder viết thẳng trong YAML, kèm comment nói rõ vì sao chúng KHÔNG phải secret.
- Comment ngay trong YAML giải thích thứ tự `build` → `typecheck`. Người sau sẽ muốn "dọn cho gọn"; lý do phải nằm cạnh chỗ dễ bị sửa.
- Không job nào deploy bất cứ thứ gì. Đây là cổng chất lượng, không phải pipeline triển khai.

## Architecture

```
.github/workflows/ci.yml
  on: push[main] | pull_request[main] | workflow_dispatch
  concurrency: workflow+ref, cancel-in-progress
  jobs:
    quality (ubuntu-latest, Node 24)
      env: NEXT_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY  ← placeholder, không secret
      checkout → pnpm/action-setup@v6 (đọc packageManager)
              → setup-node@v4 (node 24, cache pnpm ← khoá theo pnpm-lock.yaml)
              → pnpm install --frozen-lockfile
              → lint --max-warnings 0
              → format:check
              → test:unit
              → build          ← sinh .next/types
              → typecheck      ← BẮT BUỘC sau build
    e2e  ← phase 06 thêm vào, job độc lập, không `needs: quality`
```

## Related Code Files

**Create**: `.github/workflows/ci.yml`
**Modify**: — · **Delete**: —

## Implementation Steps

1. Xác nhận lại default branch trước khi viết trigger: `gh repo view --json defaultBranchRef` (đã kiểm: `main` trên cả origin lẫn upstream). Nếu khác, sửa trigger, đừng sửa repo.
2. Viết `.github/workflows/ci.yml` với đúng job `quality` theo § Architecture. Chừa chỗ cho job `e2e` bằng một comment mốc — phase 06 sẽ điền vào.
3. Đặt env ở mức job, không mức step (build và typecheck đều cần).
4. Chạy nháp cục bộ bằng đúng chuỗi lệnh của runner, trên shell sạch không đọc `.env.local`:
   `pnpm install --frozen-lockfile && pnpm lint --max-warnings 0 && pnpm format:check && pnpm test:unit && pnpm build && pnpm typecheck`, với hai biến `NEXT_PUBLIC_*` đặt bằng giá trị placeholder. Toàn bộ phải exit 0. Bước này bắt lỗi trước khi tốn một vòng CI.
5. Commit + push branch, rồi kích `workflow_dispatch` trên chính branch đó qua `gh workflow run ci.yml --ref feat/login-google-oauth`.
6. `gh run watch` → xác nhận job xanh và **đọc log**: `pnpm install` phải báo cache hit/miss, `build` phải liệt kê 5 route.
7. Ghi số run + thời lượng vào `evidence/ci-quality-first-run.txt`. Kỳ vọng theo đo đạc của researcher: ~1-2 phút khi cache lạnh, dưới 1 phút khi cache nóng.

## Todo List

- [ ] Xác nhận default branch bằng `gh` trước khi viết trigger
- [ ] Viết `ci.yml`: trigger + concurrency + job `quality`
- [ ] Env placeholder mức job + comment giải thích không phải secret
- [ ] Comment giải thích thứ tự `build` → `typecheck`
- [ ] Diễn tập cục bộ đúng chuỗi lệnh runner, không đọc `.env.local`
- [ ] `workflow_dispatch` trên feature branch, xác nhận xanh
- [ ] Lưu số run + thời lượng vào `evidence/`

## Success Criteria

| Command | Expected |
|---|---|
| Diễn tập cục bộ (bước 4) | exit 0 toàn chuỗi |
| `gh workflow run ci.yml --ref feat/login-google-oauth` + `gh run watch` | conclusion `success` |
| `gh run view --log` | có đủ 6 step lint/format/unit/build/typecheck và không step nào bị skip |
| Lần chạy thứ hai (dispatch lại) | thời lượng giảm rõ — chứng minh cache pnpm thật sự hoạt động |

Cổng thật của phase: workflow đã **chạy xanh một lần trên branch này**, không phải "YAML trông đúng".

## Rollback

Xoá `.github/workflows/ci.yml` (revert một commit). Không có state ngoài repo: không secret nào được tạo, không branch protection nào được đổi, không artifact nào được publish. Rollback là zero-consequence — đó là điểm mạnh của việc để CI vào sau chứ không trước.

## Risk Assessment

| Risk | L×I | Countermeasure |
|------|-----|----------------|
| `typecheck` trước `build` → CI đỏ vì `LayoutProps` | H×H | Thứ tự cố định + comment ngay trong YAML; diễn tập bước 4 bắt được |
| Workflow không chạy lần nào trước merge vì trigger nhắm `main` | H×M | `workflow_dispatch` + bước 5 bắt buộc chạy tay trên feature branch |
| `--frozen-lockfile` fail vì lockfile lệch (phase 04 đang thêm dep song song) | M×M | 04 và 05 land độc lập; nếu 04 merge trước, rebase 05 rồi chạy lại dispatch. Đây là tính năng chứ không phải lỗi — nó bắt đúng chuyện lockfile không được commit |
| `pnpm/action-setup@v6` không đọc được `packageManager` | L×H | Phase 01 đã ghi field này; diễn tập bước 4 + log bước 6 xác nhận đúng pnpm 10.33.2 |
| Ai đó tưởng cần secret thật rồi nhét key `saa-app` vào GitHub Secrets | M×M | Comment trong YAML nói thẳng vì sao placeholder là đủ và vì sao giá trị thật vô dụng ở đây |
| `format:check` đỏ vì phase 04 viết test chưa format | M×L | Success Criteria của phase 04 đã có `format:check`; nếu vẫn xảy ra thì đó là CI làm đúng việc |

## Security Considerations

- **Không secret nào được đưa vào CI.** Hai biến `NEXT_PUBLIC_*` theo định nghĩa là public (Next inline chúng vào bundle client), và giá trị thật trỏ tới `127.0.0.1` nên vô nghĩa với runner. Placeholder là lựa chọn đúng về cả bảo mật lẫn công năng.
- `--frozen-lockfile` chặn resolve lại lúc cài — supply-chain có tính tất định trên mỗi lần chạy.
- Không cấp `permissions` mở rộng cho workflow; mặc định chỉ đọc là đủ vì không job nào ghi ngược lại repo.
- Không job nào deploy, không push artifact, không gọi tới host nào.

## Next Steps

Phase 06 thêm job `e2e` vào chính file này, kèm notice bắt buộc về việc CI không phủ authenticated path.
