---
name: takumi-flow
description: Cờ `--flow` cho takumi — tự sync từ origin/main, tách branch mới trước khi làm, và sau khi xong thì tự commit + push + mở PR qua /tkm:ship. Kích hoạt NGAY khi thấy `--flow` trong bất kỳ lệnh takumi nào, hoặc khi user nói "flow", "tách branch rồi làm", "làm xong tự tạo PR".
---

# `--flow` — tách branch trước, mở PR sau

Takumi lo phần rèn. Cờ này lo hai đầu: chỗ bắt đầu (branch sạch từ `origin/main`)
và chỗ kết thúc (PR đã mở). Ở giữa là takumi nguyên bản, không đổi gì.

```
[Stage -1: Branch]  →  [Takumi 7 stages]  →  [Stage 7: Ship]
 fetch + switch -c        như thường lệ        commit/push/PR
```

`--flow` **không** phải discipline. Nó ghép được với mọi cờ khác:
`/tkm:takumi "task" --flow --auto`, `--flow --fast`, `--flow --parallel`.

## Sự thật về repo này (đã xác minh, đừng đoán lại)

| Điều | Giá trị |
|---|---|
| Sync + PR về | `origin` = `thangdx-1076/agentic-coding-hands-on` |
| Base branch | `origin/main` |
| `upstream` (sun-asterisk-internal) | **fetch KHÔNG được** — org bật SAML SSO, SSH key chưa authorize |
| `gh` default repo | đã ghim về `origin` |

**Luật cứng:** mọi lệnh `gh` phải ghim `--repo thangdx-1076/agentic-coding-hands-on`.
Không ghim thì `gh` đoán ra repo tổ chức và mở PR sai chỗ. Đây là lỗi công khai,
không revert êm được.

Không bao giờ `git fetch upstream` — nó fail SAML SSO. Muốn lấy code từ org thì
đó là việc tay, ngoài phạm vi cờ này.

## Stage -1 — Branch (chạy TRƯỚC Stage 0 của takumi)

### 1. Cửa chặn: tree phải sạch

```bash
git status --porcelain
```

Có output → **DỪNG, hỏi user** (đây là ngoại lệ hợp lệ của luật "tự quyết" trong
CLAUDE.md: chọn sai là mất việc đang làm dở):

- `commit` — commit WIP vào branch hiện tại trước rồi mới tách
- `stash` — `git stash -u`, tách branch, `git stash pop`
- `carry` — mang WIP sang branch mới luôn (`switch -c` giữ nguyên working tree)

Đừng tự chọn hộ. Đừng `git checkout .`, đừng `git reset --hard` — không có lệnh
nào trong cờ này được phép xoá thay đổi chưa commit.

### 2. Lấy base mới nhất

```bash
git fetch origin --prune
```

### 3. Đặt tên branch

`<type>/<slug>` — slug kebab-case lấy từ task, tối đa 5 từ, bỏ hư từ.

| Task nói gì | type |
|---|---|
| thêm / làm / dựng tính năng mới | `feat` |
| sửa lỗi, fix bug | `fix` |
| dọn code, tách module, đổi cấu trúc | `refactor` |
| chỉ tài liệu | `docs` |
| config, CI, dependency, tooling | `chore` |

Ví dụ: `"thêm quên mật khẩu vào login"` → `feat/login-forgot-password`

### 4. Tách branch từ base, không qua local main

```bash
git switch -c <type>/<slug> origin/main
```

Tách thẳng từ `origin/main`. **Không** `switch main` rồi `pull` — làm vậy là đụng
vào local main vô ích, và pull trên tree bẩn thì conflict.

**Bỏ qua bước này khi** branch hiện tại đã đúng tên `<type>/<slug>` vừa suy ra
(chạy lại `--flow` cho cùng một task không tạo branch trùng).

Branch hiện tại là `main` → luôn tách, không bao giờ rèn trên main.

### 5. Báo cáo

```
⚒ Stage -1: branch feat/login-forgot-password ← origin/main (a1b2c3d) | tree sạch
```

## Takumi 7 stages — không đổi

Chạy nguyên bản theo discipline user chọn. `--flow` không tắt gate nào, không bỏ
subagent nào, không sửa Delivery Manifest.

## Stage 7 — Ship (chạy SAU Delivery Manifest)

Ở Delivery, takumi bình thường sẽ hỏi *"commit qua git-manager không?"*.
Với `--flow`, **bỏ câu hỏi đó** và chạy:

```
/tkm:ship official --skip-journal --skip-docs
```

Ship tự làm: merge `origin/main` → test → lint → audit license → inspect →
version bump → changelog → evidence gate (hard) → commit → push → `gh pr create`.

**Vì sao ghim đúng hai cờ skip đó:**

| Cờ | Lý do |
|---|---|
| `--skip-journal` | Takumi Delivery bước 6 đã chạy `/tkm:write-journal` |
| `--skip-docs` | Takumi Delivery bước 2 đã chạy `doc-writer` |
| test + review **giữ nguyên** | Ship merge `origin/main` ở Step 3 *trước* khi test. Merge có thể làm vỡ code — đó chính là lúc cần chạy lại. Đừng skip. |

Ship tự dừng và giao lại cho user khi: conflict không tự gỡ được, test đỏ, lint
error, license violation, critical finding, hoặc bump lên minor/major. Đó là
thiết kế — đừng lách.

Ship dừng giữa đường → **báo user, đừng tự push tay**. Không có đường tắt nào
quanh evidence gate.

### Báo cáo cuối

```
⚒ Stage 7: PR https://github.com/thangdx-1076/agentic-coding-hands-on/pull/<n>
   branch feat/login-forgot-password → main | <n> commits
```

Ghi PR URL vào `plans/action-items.md` mục `## Decisions` cùng lượt append cuối session.

## Cấm

- `git push --force` / `--force-with-lease` — dưới mọi hình thức
- `gh` không có `--repo` — xem luật cứng ở trên
- `git fetch upstream` — fail SAML SSO
- Rèn code trên `main`
- Xoá thay đổi chưa commit của user (`reset --hard`, `checkout .`, `clean -fd`)
- Tự push tay khi ship đã dừng vì gate đỏ
