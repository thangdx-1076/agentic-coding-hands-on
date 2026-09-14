---
title: "Secret Box: code đã xong từ lâu, sáu lý do rời rạc làm nó trông như chưa build"
date: 2026-09-14
time: "17:27 → 17:55"
tags: [secret-box, profile, momorph, inferred-copy, seed-data, e2e]
severity: medium
---

# Bối cảnh

RPC `open_secret_box()` (migration `0011`), DAL, dialog và launcher của
F000_SecretBoxModal đều đã hoàn chỉnh và đúng. Nhưng mở browser thì Secret Box
trông như chưa ai build: nút luôn disabled, bảng quà luôn rỗng, và tooltip nói
thẳng vào mặt người dùng rằng "Tính năng đang được phát triển".

Không có lỗi nào trong số này đủ sức tự làm hỏng feature. Cộng lại thì có.

---

## Root cause — sáu nguyên nhân rời rạc, không phải một

Chia làm hai nhóm khác bản chất, và đây là chỗ đáng ghi nhớ nhất: **ba cái là bug
code, ba cái là thiếu dữ liệu.** Không có PR nào sửa được nhóm thứ hai.

### Nhóm code

1. **Nút "Mở Secret Box" trên `/profile` hardcode `disabled`, không handler.**
   Nó chưa từng hoạt động kể từ khi F000 ship. Dialog và action sống ở `/kudos`
   (`SecretBoxLauncher`), nên `/profile` không có gì để gọi.

2. **Năm counter trong bảng thống kê `/profile` hardcode literal `0`.** Card
   trông như đã build và không báo cáo gì cả.

3. **Bảng quà key `<li>` theo `id` (userId).** Bảng đó liệt kê 10 **lượt mở** gần
   nhất, nên một người mở hai box là hai hàng hợp lệ — React log
   `"Encountered two children with the same key"` ngay lần thứ hai bất kỳ ai mở
   box. Bug nằm sẵn từ trước, chỉ chưa nổ vì chưa ai mở được lần thứ hai.

### Nhóm dữ liệu và copy

4. **Hai chuỗi copy sai vì chúng là suy luận, không phải đọc từ design.**
   `titleRevealed` là `MỞ SECRET BOX THÀNH CÔNG`, `instruction` là
   `Click vào box để tiếp tục mở`. Lúc implement, state reveal **chưa có frame
   nào** trong MoMorph — chỉ có một spec row — nên hai chuỗi được suy ra từ đó.
   `clarifications.md` § "Xung đột copy tiêu đề" có ghi rõ chúng là **INFERRED**.
   Giờ frame reveal tồn tại (`mm:6885:9702`, `mm:6885:9659`, cả hai
   `design: done` + `spec: done`) và nói khác. Chữ "tiếp tục" trong
   `instruction` đẻ ra từ cùng suy luận đó; node `mm:1466:7683` chỉ ghi
   `Click vào box để mở`.

5. **Tooltip mô tả trạng thái build, không mô tả lý do.**
   `openGiftDisabledTitle` = "Tính năng đang được phát triển" đã thôi đúng từ lúc
   RPC ship. Đây là lý do to nhất khiến một feature chạy được bị đọc thành chưa
   xong.

6. **`secret_box_openings` rỗng trên mọi môi trường.**
   `recent_gift_recipients` (`0015`) chỉ đọc đúng bảng đó, nên panel công khai
   "10 SUNNER NHẬN QUÀ MỚI NHẤT" render empty state kể cả trên database đã seed
   đầy đủ.

Và một nguyên nhân nền, không sửa được bằng code: **không ai đăng nhập được lại
có entitlement.** Tim cộng cho **người GỬI** kudo (`0007`, nhắc lại ở `0011`), mà
mọi account đang giữ tim đều là một trong 8 demo Sunner của `0008` — những
account **cố ý** không có `encrypted_password` và không có row `auth.identities`,
nên không bao giờ login được.

---

## Vì sao suite e2e không bắt được sớm

Test `[C6]` khẳng định năm counter render `0`. Nó xanh — và sẽ **vẫn xanh nếu
query không bao giờ chạy**, vì `0` là đúng giá trị hardcode. Một test xanh vì
đúng và một test xanh vì không chạy nhìn giống nhau hoàn toàn từ ngoài.

Hai test `[S04]`, `[S09]` ghim đúng hai chuỗi suy luận sai. Chúng làm đúng việc
được giao (xác nhận copy khớp từng chữ) trong khi bảo vệ một hợp đồng chưa từng
tồn tại.

---

## Cách sửa

| # | Sửa gì |
| - | ------ |
| 1 | `/profile` → `<Link>` sang `/kudos?secretbox=open` khi `secretBoxUnopened > 0`, ngược lại là `<button disabled>` mang lý do trong `title`. Link chứ không mount bản thứ hai của state machine — đúng tiền lệ thanh "Viết Kudo" ngay dưới nó |
| 2 | Counter đọc từ stats query qua `STAT_VALUE_KEYS`. `stats` là `null` trên profile người khác, và `page.tsx` **bỏ hẳn query** ở đó thay vì fetch số không ai hiển thị |
| 3 | Thêm `rowKey` = `userId-openedAt` làm React key; `id` giữ nguyên để link profile |
| 4 | `messages/{vi,en}.json` về đúng chữ trên frame; sửa `[S04]`, `[S09]` theo |
| 5 | Tooltip nói lý do: "cứ 5 tim nhận được thì mở khoá 1 box" |
| 6 | Migration `0023` insert 3 row `secret_box_openings` cho 3 demo Sunner |

`/kudos?secretbox=open` dùng lại đúng thủ pháp `?compose=<id>` đã có cho thanh
viết Kudo. Param đọc từ URL trong `SecretBoxLauncher` chứ không xuyên prop qua
`kudos-client → kudos-screen → kudos-sidebar → kudos-stat-list`.
`SECRET_BOX_OPEN_PARAM` đặt cạnh `ROUTES` vì **cả hai** route group cần đúng một
cách viết: `(protected)/profile` ghi nó vào link, `(public)/kudos` đọc nó.

Sửa kèm, cùng file: hộp quà trong dialog là hình vuông cố định 557px, đẩy modal
lên 803px so với `max-height: calc(100% - 38px)` của UA — ở 1280x800 nó vượt 41px
và cả dialog phải scroll. Giờ là `min(557px, calc(100dvh - 320px))` cho cả hai
chiều. `flex-1` không làm được: chiều cao dialog là `auto` bị clamp bởi max-height
đó, nên lúc layout không có free space nào để chia và nút co về 0x0. Lớp sparkle
cũng phải đổi `background-position` từ px sang %, vì px gắn chặt với một kích cỡ
hộp duy nhất và trượt đi ngay khi hộp co giãn được.

---

## Điều `0023` cố ý KHÔNG làm

**Nó không cấp tim.** Một bản nháp trước đó có cho demo Sunner tim mọi kudo không
phải của demo để đẻ ra entitlement. Suite e2e bắt được: Highlight carousel xếp
hạng theo `heart_count`, và cách làm đó sweep luôn những kudo do e2e tạo tạm vào
top 5, làm đỏ C13/C16/C35.

Kết luận nằm trong header `0023`: một migration không phân biệt được kudo của
Sunner thật với test fixture, nên nó không có quyền fabricate engagement trên row
không phải do nó tạo.

Entitlement cho một account cụ thể vì thế được cấp theo yêu cầu bằng
`scripts/grant-secret-boxes.mjs`. Script cũng là **nửa chạy-lại-được** của câu
chuyện: migration chạy một lần, nên nó không bao giờ bù box lại sau khi bạn đã mở.
Script ghi qua `SERVICE_ROLE_KEY` và fabricate engagement thật, nên nó chỉ dành
cho database local — header nói rõ.

---

## Kiểm chứng

Tự chạy, không lấy số từ báo cáo của agent:

| Gate | Kết quả |
| ---- | ------- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint --max-warnings 0` | exit 0 (mức CI dùng) |
| `pnpm format:check` | clean |
| `pnpm test:unit` | 92 file, 901 test passed, exit 0 |
| `pnpm test:e2e` | 247 passed, 4 skipped, exit 0 |
| `pnpm build` | exit 0 |
| `pnpm build-storybook` | exit 0 |
| sunlint (`--all -i src`) | 89.5 / B+, 0 error, 200 warning |
| licenseal `check` | exit 0, không violation/deny |

`useSearchParams()` mới thêm vào `secret-box-launcher.tsx` là loại lỗi mà
typecheck và dev server **không** bắt: thiếu Suspense boundary trên route
prerender tĩnh là lỗi `next build`. Build cho thấy `/kudos` là `ƒ (Dynamic)` —
server-render theo request — nên không cần boundary. Kiểm bằng output build, không
bằng suy đoán.

Test mới: `[C6b]` seed một kudo rồi assert counter nhận **di chuyển theo dữ liệu**
(thay cho `[C6]` cũ chỉ assert `0`); `[C7b]` assert nút profile dẫn tới
`/kudos?secretbox=open` **và** dialog mở sẵn khi tới; `[C10b]` assert copy
empty-state trên profile người khác là ngôi thứ ba; `[S16]` ghim modal vừa
viewport, không sinh scrollbar.

---

## Bài học

1. **Một test xanh vì đúng và một test xanh vì không chạy nhìn y như nhau.**
   `[C6]` assert `0` trên một giá trị hardcode `0`. Khi giá trị mong đợi trùng
   với giá trị mặc định, test không chứng minh được gì — nó phải assert **delta**
   sau khi seed, như `[C6b]` làm.

2. **`INFERRED` trong `clarifications.md` là nợ có hạn, không phải chú thích.**
   Hai chuỗi copy được đánh dấu INFERRED đúng quy trình, rồi không ai đọc lại khi
   frame xuất hiện. Đánh dấu là bước một; bước hai là quay lại kiểm khi design
   có thêm dữ liệu.

3. **Tooltip mô tả trạng thái build sẽ nói dối.** "Đang phát triển" đúng lúc
   viết và sai ngay khi RPC ship. Câu nói lý do ("chưa có box vì cần 5 tim") thì
   không bao giờ hết đúng.

4. **Phân biệt code bug với data gap trước khi bắt tay sửa.** Ba trong sáu nguyên
   nhân ở đây không sửa được bằng PR — chúng cần seed strategy và một quyết định
   về dữ liệu production. Gộp chung hai loại lại là cách chắc chắn để sửa nửa vời.

---

## Đã làm

- ✓ Copy `titleRevealed` + `instruction` về đúng chữ trên frame reveal; `[S04]`, `[S09]` theo cùng
- ✓ Tooltip nói lý do disabled, thêm `openSecretBoxDisabledTitle` cho `/profile`
- ✓ Counter `/profile` đọc dữ liệu thật; `page.tsx` bỏ query trên profile người khác
- ✓ Nút "Mở Secret Box" → link `/kudos?secretbox=open`; launcher tự mở dialog khi thấy param
- ✓ `rowKey` cho bảng quà, kèm unit test ghim id trùng / rowKey khác nhau
- ✓ Hộp quà co theo viewport; sparkle chuyển sang `background-position` %
- ✓ Copy empty-state ngôi thứ ba cho profile người khác (`emptyReceivedOther`, `emptySentOther`)
- ✓ Migration `0023` + `scripts/grant-secret-boxes.mjs`
- ✓ `docs/data-migration.md` — quy trình đổi dữ liệu production
- ✓ Bỏ alias `seed:secret-box` khỏi `package.json`; script gọi trực tiếp bằng `node`
- ✓ Version `0.11.0` → `0.12.0`

---

## Chưa làm

- [ ] **Quyết định `0023` có được ở lại production hay không.** Nó seed 3 lượt mở
      của demo Sunner. Giữ thì bảng quà có nội dung ngày launch; xoá thì dùng câu
      rollback trong header. Việc của người, không phải của code.
- [ ] `?secretbox=open` không tự xoá khỏi URL sau khi dialog đã mở. Reload là mở
      lại — vô hại, nhưng URL share được thì lần nào cũng mở dialog.
- [ ] `scripts/grant-secret-boxes.mjs` chỉ chặn dùng-trên-production bằng lời văn
      trong header, không có guard kiểm host. Nó fabricate engagement bằng
      service role, nên một lần trỏ sai biến môi trường là ghi thật vào DB thật.
- [ ] Vòng lặp cấp box trong script làm hai lần ghi PostgREST không cùng
      transaction (insert kudo, rồi insert tim). Crash giữa hai bước để lại một
      kudo mồ côi. Chạy lại thì tự lành, và nó là script dev — nên ghi lại chứ
      chưa sửa.
