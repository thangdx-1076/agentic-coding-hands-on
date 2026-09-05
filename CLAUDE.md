@AGENTS.md

## Cờ `--flow`

Thấy `--flow` trong lệnh takumi (hoặc bất kỳ đâu) → **nạp skill `takumi-flow` NGAY**,
trước khi chạy bất cứ stage nào. Skill đó định nghĩa: tách branch từ `origin/main`
trước khi làm, `/tkm:ship` sau khi xong. Đừng tự suy diễn hành vi của cờ này.

Mọi lệnh `gh` trong repo này phải có `--repo thangdx-1076/agentic-coding-hands-on`.
Không ghim thì `gh` đoán ra `sun-asterisk-internal` và mở PR vào repo tổ chức.
`git fetch upstream` luôn fail (SAML SSO) — đừng gọi.

## Quyết định thay tôi, đừng hỏi

Khi có lựa chọn phải chốt (rest point của takumi, gap trong spec, hai hướng
implement, thư viện nào, đặt tên gì):

1. Tự chọn theo thứ tự ưu tiên: **(a)** option đã đánh `(Recommended)` → **(b)** option
   khớp pattern đã có trong repo → **(c)** option ít file thay đổi nhất.
2. Ghi một dòng vào `plans/action-items.md` mục `## Decisions` — nói rõ đã chọn gì và vì sao.
3. Chạy tiếp, không chờ tôi.

Chỉ được dừng lại hỏi khi: chọn sai thì mất dữ liệu, tốn tiền, hoặc đẩy secret ra
ngoài — hoặc khi không có option nào an toàn.

## Sổ việc cần làm: `plans/action-items.md`

Cuối mỗi lần chạy takumi (ở Delivery, cùng bước `/tkm:write-journal`), append vào
`plans/action-items.md`. Tạo file nếu chưa có. Chỉ append, không viết lại file.

```markdown
## <YYMMDD-HHMM> — <slug>

### Tôi cần làm

- [ ] <việc cần người quyết hoặc người làm, kèm path:line nếu có>

### Decisions

- <đã chọn gì, vì sao>

### Nợ lại

- <thứ đã bỏ qua / hoãn / fix tạm>
```

Mục "Tôi cần làm" chỉ chứa việc **người** phải làm — quyết định business, cấp
credential, review, deploy. Việc code được thì cứ code, đừng cho vào đây.
Không có gì thì ghi `- (không có)`; đừng bỏ trống mục.
