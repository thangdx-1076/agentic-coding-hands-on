# Deployment — SAA 2025 lên production

Hạ tầng đích: **Vercel** (Next.js app) + **Supabase Cloud** (database, auth, storage).

Chọn Vercel vì app dùng ba thứ chỉ chạy ngon trên runtime Next gốc: `src/proxy.ts`
(middleware chạy trước mọi route), Server Actions với `bodySizeLimit: "28mb"`, và
image optimizer với `remotePatterns` sinh động từ env. Tự host được, nhưng phải tự
dựng Node server + `sharp` + reverse proxy — không đáng cho một event site.

Toàn bộ deploy do GitHub Actions chạy, không do Vercel tự bắt commit:

| File                           | Chạy khi nào                         | Làm gì                                                          |
| ------------------------------ | ------------------------------------ | --------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | push feat/fix/chore + PR + push main | lint, format, unit + coverage, build, typecheck, storybook, e2e   |
| `.github/workflows/cd.yml`      | **ngay khi có commit vào `main`**    | `vercel deploy --prod` → smoke check. **Không đụng database**     |
| `.github/workflows/migrate.yml` | **chỉ khi bạn bấm Run workflow**     | `db push --dry-run` → duyệt → `db push`. **Không deploy code**    |

**Code và schema đi hai đường riêng, và chỉ một đường tự động.** Merge vào `main`
là deploy code lên schema đang có sẵn. Đổi schema chỉ xảy ra khi bạn tự vào
**Actions → Migrate production database → Run workflow**.

> **Cái giá của việc tách: mất bảo đảm thứ tự.** Pipeline cũ ép schema chạy trước
> code trong cùng một lượt. Giờ không còn gì chặn một PR vừa thêm migration vừa
> thêm code đọc nó được merge và deploy ngay lên schema cũ — đúng kịch bản
> migration `0022` (`distinct_senders`): `/kudos` sẽ ném lỗi ở mọi lần render cho
> tới khi có người nhớ ra.
>
> Hai cách giữ an toàn, theo thứ tự ưu tiên:
>
> 1. **Viết migration tương thích ngược** (expand/contract): đẩy phần schema
>    thêm-mới đi trước, một mình, lúc code đang chạy chưa biết tới nó. Code dùng
>    tới thì merge ở lượt sau. Phần phá huỷ (drop/rename) đi cuối cùng, khi không
>    còn code nào tham chiếu hình dạng cũ. Thứ tự hết quan trọng — đây là cách sửa
>    thật sự.
> 2. Nếu migration và code buộc phải đi cùng nhau: chạy `migrate.yml` **trước khi
>    merge** PR đó.
>
> `cd.yml` có in cảnh báo vào Summary khi commit nó đang deploy có đụng
> `supabase/migrations/`. Đó là lời nhắc, **không phải cổng chặn** — nó không biết
> migration đã chạy hay chưa, chỉ biết file có thay đổi.

**Cổng chặn merge nằm ở branch protection, không nằm trong CD.** `main` được bảo vệ và
yêu cầu hai check `Quality` + `E2E (CI-safe)` xanh mới cho merge PR — kèm `strict`
(branch phải cập nhật với `main` trước khi merge) và không miễn trừ cho admin. Nên
commit nào đã nằm trên `main` thì đã qua test rồi, CD deploy thẳng không đợi CI
chạy lại lượt thứ hai.

Đổi lại: **thứ gì lọt vào `main` mà không qua PR được bảo vệ là deploy thẳng ra
production.** Tắt branch protection không chỉ là nới lỏng merge — nó mở đường cho
commit chưa test đi tới người dùng.

---

## Bước 1 — Tạo Supabase project

1. [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
   - Region: `Southeast Asia (Singapore)` — gần user VN nhất.
   - Đặt **database password** mạnh và **lưu lại ngay**. Nó là secret
     `SUPABASE_DB_PASSWORD` ở Bước 5, và Supabase không cho xem lại.
   - Postgres version phải là **17**, khớp `major_version = 17` trong
     `supabase/config.toml`. Lệch major là `db push` có thể apply được nhưng
     hành vi khác local.
2. Ghi lại **project ref** (chuỗi trong URL dashboard, ví dụ `abcdefghijklmnop`).
3. Vào **Project Settings → API keys**, copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` (dạng `https://<ref>.supabase.co`)
   - **Publishable key** → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

   Đừng lấy `service_role` / secret key. Next inline mọi biến `NEXT_PUBLIC_*` vào
   bundle client — để nhầm key đó là phát tán quyền admin database cho mọi visitor.

---

## Bước 2 — Đẩy schema lên và dọn dữ liệu demo

```bash
supabase login                               # mở browser, cấp quyền CLI
supabase link --project-ref <project-ref>    # hỏi database password
supabase db push --dry-run                   # xem trước: phải liệt kê đủ 0001 → 0022
supabase db push                             # apply thật
```

Hai dòng `WARN: environment variable is unset: SUPABASE_AUTH_EXTERNAL_GOOGLE_*`
là bình thường — CLI parse cả `supabase/config.toml` trước mọi lệnh, mà block
`[auth.external.google]` trong đó chỉ dùng cho Supabase **local**. `db push` chỉ
đẩy migration, không đụng tới auth config, nên push vẫn chạy đúng. Muốn tắt WARN
thì đặt hai biến đó vào `.env` ở gốc repo (xem `.env.example`); giá trị rỗng
không tính là đã set.

**Cảnh báo — có seed giả trong migration.** `0008_kudos_demo_seed.sql` và
`0019_kudos_demo_departments.sql` `INSERT` thẳng 8 user giả vào `auth.users`
(email `@kudos-demo.saa`) cùng 12 kudo mock để `/kudos` không rỗng lúc dev.
`db push` không phân biệt seed với schema — chúng sẽ lên production.

Quyết định trước khi mở cho user thật:

- **Giữ** nếu muốn board có sẵn nội dung ngày launch. Dữ liệu giả sẽ nằm lẫn với
  kudo thật, và 8 người đó xuất hiện trong search Sunner lẫn leaderboard.
- **Xoá** bằng đúng câu lệnh rollback ghi trong header migration `0008`, chạy ở
  **SQL Editor** trên dashboard:

  ```sql
  DELETE FROM auth.users WHERE email LIKE '%@kudos-demo.saa';
  ```

  `kudos` và `kudo_hearts` cascade theo. Chạy sau khi `db push` xong, và **trước**
  khi có người đăng nhập thật — không có cách nào lọc ngược về sau nếu kudo thật đã
  tham chiếu tới họ.

Kiểm tra bucket storage đã có: **Storage → Buckets** phải thấy `kudo-images`, cột
Public = true. Nó do `0010_kudo_images_bucket.sql` tạo, không phải tạo tay.

> Đừng bao giờ chạy `supabase db reset` với project này. Nó drop cả `auth.users`,
> tức xoá sạch mọi lần đăng nhập thật. Header của `0008`/`0010` đã ghi rõ.

---

## Bước 3 — Bật Google OAuth

Thứ tự quan trọng: tạo credential ở Google trước, dán vào Supabase sau.

1. **Google Cloud Console** → APIs & Services → Credentials → **Create OAuth client ID**
   → Application type: *Web application*.
   - **Authorized redirect URIs**: `https://<project-ref>.supabase.co/auth/v1/callback`

     Đây là URL của **Supabase**, không phải domain app. App nhận
     `redirectTo: ${origin}/auth/callback` (xem `src/api/auth.ts`) nhưng Google chỉ
     nói chuyện với Supabase; Supabase mới bounce về app.
   - Copy **Client ID** + **Client secret**.
2. **Supabase Dashboard → Authentication → Sign In / Providers → Google**: bật, dán
   Client ID + Secret, Save.
3. **Authentication → URL Configuration**:
   - **Site URL**: `https://<domain-production>` (domain thật, hoặc
     `https://<project>.vercel.app` nếu chưa có domain riêng).
   - **Redirect URLs**: thêm `https://<domain-production>/**`.

     Thiếu dòng này thì `signInWithOAuth` sẽ bị GoTrue từ chối redirect và user
     rơi về `/login?error=...` mà không hiểu vì sao.

---

## Bước 4 — Tạo Vercel project và **tắt auto-deploy**

1. [vercel.com/new](https://vercel.com/new) → import repo `agentic-coding-hands-on`.
   Framework Preset tự nhận Next.js. **Đừng bấm Deploy vội** — chưa có env var thì
   build sẽ hỏng.
2. **Settings → Environment Variables**, scope **Production**, thêm 4 biến (đối
   chiếu `.env.example`):

   | Biến                                   | Giá trị                              |
   | -------------------------------------- | ------------------------------------ |
   | `NEXT_PUBLIC_SUPABASE_URL`             | `https://<project-ref>.supabase.co`  |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | publishable key ở Bước 1             |
   | `EVENT_START_AT`                       | `2026-12-26T18:30:00+07:00`          |
   | `PRELAUNCH_LOCK_ENABLED`               | `true` khi còn khoá site, `false` khi mở |

   Không set `SERVICE_ROLE_KEY` trên Vercel. Không dòng code runtime nào trong
   `src/` đọc nó — nó chỉ phục vụ e2e dọn dữ liệu ở máy local.

   Lưu ý `NEXT_PUBLIC_SUPABASE_URL` không chỉ là địa chỉ API: hostname của nó sinh ra
   `images.remotePatterns` và quyết định cờ `dangerouslyAllowLocalIP`
   (`src/configs/image-remote-patterns.ts`). Host `*.supabase.co` là public nên cờ SSRF
   tự tắt — đúng như mong muốn. Để nhầm địa chỉ loopback ở đây là bật cờ đó trên production.

3. **Settings → Build & Deployment → Node.js Version**: chọn **22.x** hoặc **24.x**,
   nằm trong `engines.node` của `package.json` (`>=22 <25`).
4. **Auto-deploy đã tắt sẵn bằng `vercel.json`** — không phải bấm gì:

   ```json
   { "git": { "deploymentEnabled": false } }
   ```

   Vercel đọc file này từ chính commit vừa push và bỏ qua deployment do Git kích
   hoạt, mọi branch. `cd.yml` không bị ảnh hưởng: nó deploy bằng CLI
   (`vercel deploy --prebuilt`), không đi qua đường Git trigger.

   > **PR không còn preview deployment, và đó là cố ý.** `deploymentEnabled: false`
   > quét cả preview lẫn production, không riêng `main` — thấy PR trống chỗ bot
   > Vercel vẫn hay comment thì đừng đi tìm lỗi cấu hình. Đây là lựa chọn đã cân
   > nhắc (2026-09-11): preview có giá trị, nhưng ở trạng thái hiện tại nó sẽ
   > build bằng Preview environment variables — mà những biến đó, nếu trỏ chung
   > project Supabase với production, biến mỗi PR thành một đường ghi thẳng vào
   > database thật. Muốn bật lại thì xem đoạn cuối mục này, và tách Supabase
   > project cho Preview TRƯỚC.

   Không có khoá này thì mỗi push vào `main` deploy **hai lần**: một lần Vercel tự
   chạy ngay khi commit về — không qua test nào — một lần nữa do `cd.yml`. Lần
   ungated đó lên sóng trước, và nó dựng bundle bằng env của Vercel chứ không phải
   thứ `cd.yml` vừa `vercel pull` xuống, nên hai lần deploy có thể ra hai kết quả
   khác nhau từ cùng một commit.

   Hai cách thay thế, nếu muốn khoá ngay mà chưa merge được file này:
   - **Settings → Git → Ignored Build Step** → *Custom*, lệnh `exit 0` (Vercel hiểu
     exit code 0 là "bỏ qua build này").
   - **Settings → Git → Disconnect** hẳn repo. Dứt điểm nhất, đổi lại mất preview
     comment trên PR.

   Muốn **bật lại preview cho PR nhưng vẫn chặn production**, `deploymentEnabled`
   nhận cả object khoá theo tên branch — sửa đúng một dòng trong `vercel.json`:

   ```json
   { "git": { "deploymentEnabled": { "main": false } } }
   ```

   (Cách tương đương không đụng file: Ignored Build Step với
   `[ "$VERCEL_ENV" = "production" ] && exit 0 || exit 1`.)

   **Việc phải làm trước, không phải sau:** tách một Supabase project riêng cho
   Preview và set `NEXT_PUBLIC_SUPABASE_URL` + publishable key scope Preview trỏ
   vào đó. Để nguyên thì preview của mọi PR build bằng biến trỏ về database thật —
   mỗi PR thành một đường ghi vào dữ liệu production, và cleanup của test
   `@local-db` không với tới đó.
5. **Settings → Domains**: gắn domain thật nếu có. Nhớ quay lại Bước 3.3 cập nhật
   Site URL và Redirect URLs cho khớp.

---

## Bước 5 — Nạp secret và Environment cho GitHub Actions

Thứ tự bắt buộc: **tạo Environment trước, nạp secret sau**. Secret phải gắn vào
một Environment đã tồn tại; làm ngược lại thì không có chỗ để chọn.

### 5.1 — Tạo hai Environment

**Repo → Settings → Environments → New environment**:

| Environment     | Job dùng nó | Protection rule                   | Giữ secret gì                                     |
| --------------- | ----------- | --------------------------------- | ------------------------------------------------- |
| `production-db` | `migrate`   | **Required reviewers** → thêm bạn | không giữ gì — xem § 5.2                          |
| `production`    | `deploy`    | không cần                         | `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |

> **`production-db` tồn tại chỉ để làm cổng duyệt, không phải để chứa secret.**
> Job `migrate` không đọc secret nào từ nó — ba biến Supabase là repository
> secret (§ 5.2 giải thích vì sao). Bỏ environment này đi thì `migrate` mất luôn
> chỗ treo Required reviewers và `supabase db push` chạy thẳng vào database
> production không ai nhìn. Đó đúng là chuyện đã xảy ra ngày 2026-09-11, xem ô
> cảnh báo dưới.

Tên khớp **không phân biệt hoa thường**: `cd.yml` ghi `production`, một
Environment tên `Production` vẫn nhận (đã kiểm chứng 2026-09-11 — job đọc được
secret của nó). Nhưng gõ **sai** tên thì GitHub không báo lỗi mà **tự tạo một
Environment mới rỗng** mang đúng tên trong workflow: job chạy thẳng, không qua
luật nào, và secret bạn nạp vào cái tên cũ không bao giờ được đọc tới.

> **⚠️ Tạo Environment KHÔNG tự có protection rule.** Tạo xong nó rỗng — không
> reviewer, không gì cả. Ngày 2026-09-11 `production-db` được tạo mà bỏ quên
> bước bật Required reviewers, và job `migrate` chạy `supabase db push` vào
> production không dừng lại lần nào. Lần đó vô hại vì không có migration nào
> pending, nhưng nếu có thì nó đã apply xong rồi — và không có nút undo.
>
> Bật reviewer xong, **kiểm lại bằng API** chứ đừng tin màn hình:
>
> ```bash
> R=thangdx-1076/agentic-coding-hands-on
> gh api repos/$R/environments/production-db \
>   --jq '[.protection_rules[].type]'   # phải in ["required_reviewers"]
> ```
>
> In ra `[]` là chưa có cổng nào.

Vì sao là hai chứ không phải một: protection rule gắn theo Environment, nên gộp
lại chỉ còn hai lựa chọn, cả hai đều dở. Bật reviewer ⇒ **mọi** deploy đều phải
duyệt, kể cả commit sửa CSS, và duyệt nhiều thì thành phản xạ. Tắt reviewer ⇒
`supabase db push` đổi schema production mà không ai nhìn. Migration không có nút
undo, deploy code thì rollback được bằng một click trên Vercel — hai mức rủi ro
khác nhau thì cần hai cái cổng khác nhau.

**Đừng để secret nằm ở Environment mà không workflow nào gọi tên.** Một
Environment thừa (tên cũ, tên thử nghiệm) vẫn giữ nguyên credential trong đó:
không job nào đọc được, nhưng ai có quyền write vào repo đều thêm được một
workflow trỏ vào nó. Xoá environment là xoá luôn secret bên trong:
`gh api -X DELETE repos/$R/environments/<tên>`.

### 5.2 — Nạp secret, đúng phạm vi cho từng cái

Sáu secret, chia theo job tiêu thụ chúng:

| Secret                  | Job dùng           | Đặt ở đâu                        | Lấy ở đâu                                            |
| ----------------------- | ------------------ | -------------------------------- | ---------------------------------------------------- |
| `SUPABASE_PROJECT_REF`  | `plan` + `migrate` | **Repository secret**            | project ref ở Bước 1                                 |
| `SUPABASE_ACCESS_TOKEN` | `plan` + `migrate` | **Repository secret**            | Supabase → Account → Access Tokens → Generate        |
| `SUPABASE_DB_PASSWORD`  | `plan` + `migrate` | **Repository secret**            | database password đặt ở Bước 1                       |
| `VERCEL_TOKEN`          | `deploy`           | Environment secret, `production` | § 5.3 — chú ý chọn đúng **Scope**                    |
| `VERCEL_ORG_ID`         | `deploy`           | Environment secret, `production` | § 5.4 — `vercel link` rồi đọc `.vercel/`             |
| `VERCEL_PROJECT_ID`     | `deploy`           | Environment secret, `production` | § 5.4 — cùng file với `VERCEL_ORG_ID`                |

**Vì sao bộ Supabase phải là repository secret, không phải environment secret
của `production-db`.** Required reviewers chặn **toàn bộ job** trước khi step đầu
tiên chạy. Nếu dry-run nằm trong job `migrate`, lúc bạn bấm Approve chưa có dòng
log nào tồn tại — bạn duyệt mù. Nên nó được tách thành job `plan` chạy trước,
không gắn Environment nào, và một job không có Environment thì không đọc được
environment secret. Đó là cái giá để có danh sách SQL trước cổng duyệt: ba
credential đó rộng phạm vi hơn mức tối thiểu.

Bộ Vercel không vướng ràng buộc đó — job `deploy` là nơi duy nhất dùng chúng và
nó khai báo `environment: production`, nên cứ để làm environment secret.

Hệ quả: **`production-db` không giữ secret nào.** Nó chỉ là chỗ treo Required
reviewers. Nếu bạn lỡ nạp một biến Supabase vào đó, xoá đi — environment secret
đè lên repository secret cùng tên, nên để cả hai là có hai nguồn sự thật mà chỉ
một cái thắng trong im lặng, và bạn sẽ sửa nhầm cái không được đọc:

```bash
gh secret delete SUPABASE_PROJECT_REF --env production-db --repo $R
```

```bash
R=thangdx-1076/agentic-coding-hands-on

gh secret set SUPABASE_PROJECT_REF  --repo $R
gh secret set SUPABASE_ACCESS_TOKEN --repo $R
gh secret set SUPABASE_DB_PASSWORD  --repo $R

gh secret set VERCEL_TOKEN      --env production --repo $R
gh secret set VERCEL_ORG_ID     --env production --repo $R
gh secret set VERCEL_PROJECT_ID --env production --repo $R

gh secret list --repo $R                     # phải thấy 3 dòng Supabase
gh secret list --env production --repo $R    # phải thấy 3 dòng Vercel
```

Mỗi lệnh hỏi giá trị qua stdin — đừng viết giá trị thẳng trên dòng lệnh, nó nằm
lại trong shell history.

Muốn gọn hơn thì để cả sáu làm repository secret; workflow chạy y hệt, đổi lại
job `migrate` cũng cầm `VERCEL_TOKEN` mà nó không cần. Chấp nhận được với repo
một người, đừng làm vậy khi nhiều người đẩy code.

### 5.3 — Lấy `VERCEL_TOKEN`

Token nằm ở **tài khoản**, không nằm trong project — nên đường đi không qua
project settings:

1. Mở [vercel.com/account/tokens](https://vercel.com/account/tokens). Trang này
   thuộc **personal account** kể cả khi project nằm trong team — ở thanh chọn
   scope góc trái trên cùng của dashboard phải đang xem tài khoản cá nhân, không
   phải team, mới vào được.
2. **Create Token**, điền ba ô:
   - **Token Name** — đặt tên nói rõ nơi dùng, ví dụ `github-actions-cd-saa`.
     Tên là thứ duy nhất phân biệt token sau này; `token1` thì ba tháng nữa
     không ai dám thu hồi vì không biết nó đang chạy ở đâu.
   - **Scope** — dropdown có ba mức, chọn **hẹp nhất đủ dùng**: bấm vào **team
     sở hữu project SAA** để nó xổ ra danh sách project, rồi **chọn đúng project
     SAA**. Token project-scoped chỉ đụng được một project đó, và đủ cho toàn bộ
     `vercel pull` / `build` / `deploy` của `cd.yml`.

     Chọn **All Projects** thì thành team-scoped (rộng hơn, vẫn chạy). Chọn
     **Full Account** là trao quyền trên tài khoản cá nhân lẫn mọi team bạn tham
     gia — đừng dùng cho CI.

     Scope phải khớp với `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` ở § 5.4. Lệch là
     token vẫn hợp lệ nhưng Vercel từ chối ⇒ job `deploy` đỏ ở step **Pull Vercel
     environment** với `Could not retrieve Project Settings` — đọc như lỗi cấu
     hình workflow, thực ra là lỗi scope.

     Một số team bắt buộc bật 2FA hoặc SAML mới cho tạo token scope vào team đó;
     dashboard sẽ báo ngay lúc bạn chọn.
   - **Expiration** — chọn theo chính sách của bạn. Cân nhắc thật: token hết hạn
     thì `cd.yml` đỏ ở đúng step trên, và vì CD chỉ chạy khi có commit vào `main`,
     bạn sẽ phát hiện đúng lúc đang cần deploy gấp. Chọn hạn dài cho tiện thì phải
     tự đặt lịch xoay vòng; chọn hạn ngắn thì ghi ngày hết hạn vào `plans/action-items.md`.
3. Bấm **Create**, rồi **copy ngay**. Giá trị chỉ hiện **một lần**; đóng dialog là
   mất, không có cách xem lại — chỉ có tạo cái mới.
4. Nạp vào GitHub bằng lệnh ở 5.2 (`gh secret set VERCEL_TOKEN --env production`),
   hoặc dán qua UI. Đừng để nó nằm lại trong Notes/Slack/clipboard manager.

Một token cho một mục đích, và **Revoke** ngay ở chính trang trên khi nghi ngờ lộ
hoặc khi người tạo rời dự án. Thu hồi không làm hỏng deployment đang chạy, chỉ
khiến lần deploy sau đỏ cho tới khi thay token mới.

#### Kiểm token vừa tạo — **đừng dùng `vercel whoami`**

`whoami` đọc user-level resource, mà token scope Project hoặc Team bị từ chối mọi
request tới tài nguyên mức đó. Nó trả `Error: User not found` **kể cả khi token
hoàn toàn đúng** — dùng nó làm phép thử là tự dẫn mình đi sai hướng (đã dính
2026-09-11). `whoami` chỉ có nghĩa với token Full Account.

Phép thử thật là chạy đúng lệnh CI chạy:

```bash
rm -r .vercel 2>/dev/null
VERCEL_ORG_ID="<org id>" VERCEL_PROJECT_ID="<project id>" \
  vercel pull --yes --environment=production --token="<token>"
```

- Chạy được ⇒ token và cặp ID khớp nhau, nạp secret rồi re-run CD.
- `Could not retrieve Project Settings` ⇒ hoặc scope token, hoặc cặp ID. Lấy ID
  thật bằng `vercel link` ở § 5.4 rồi so lại.

Token nằm trong lệnh ⇒ nó vào shell history. `history -d` dòng đó, hoặc gõ lệnh
với một dấu cách ở đầu nếu shell của bạn bật `HIST_IGNORE_SPACE`.

### 5.4 — Lấy `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID`

Hai ID này không phải secret, chỉ là định danh; cách chắc nhất để lấy đúng cả hai
là để CLI tự điền thay vì copy tay từ dashboard:

```bash
npm i -g vercel@59.16.0   # cùng version cd.yml ghim
vercel login
vercel link               # chọn scope + project đã tạo ở Bước 4
cat .vercel/*.json        # đọc orgId + projectId/id
```

`vercel link` ghi ra một trong hai file tuỳ nhánh bạn chọn lúc hỏi: link đúng
một project ⇒ `.vercel/project.json` (`orgId` + `projectId`); link cả repository
⇒ `.vercel/repo.json`, ID nằm trong mảng `projects[]` với khoá `id` thay vì
`projectId`. Giá trị như nhau — `cd.yml` nhận chúng qua env, không đọc file local,
nên không cần link lại cho khớp.

`.vercel/` đã nằm trong `.gitignore`.

Credential mà **app** cần (`NEXT_PUBLIC_*`) cố ý không nằm trong GitHub secret ở
bất kỳ Environment nào: `cd.yml` chạy `vercel pull` để kéo chúng từ Vercel xuống
lúc build, nên chúng chỉ tồn tại đúng một chỗ và không bao giờ lệch nhau.

### 5.5 — Chạy migration (thủ công, mỗi lần đều vậy)

Migration **không bao giờ** tự chạy. Mỗi lần cần đổi schema production:

1. **Actions → Migrate production database → Run workflow**.
2. Ô `confirm`: gõ đúng chữ `migrate`. Gõ khác là workflow chạy nhưng không job
   nào thực thi — cố ý, để một cú bấm nhầm không đổi được gì.
3. Job **`plan`** chạy trước, in danh sách migration pending ra **Summary** của
   run (ngay đầu trang, không phải trong log).
4. Job **`migrate`** hiện **Review deployments** → đọc Summary ở bước 3 → tick
   `production-db` → **Approve and deploy**.

Không có migration nào pending thì Summary in `Remote database is up to date`;
duyệt là xong, không gì thay đổi.

Workflow này **chỉ đổi schema, không deploy code**. Nếu migration vừa chạy có
code đi kèm thì merge code đó vào `main` sau — `cd.yml` lo phần deploy.

**Nếu `migrate` chạy thẳng qua, không hiện Review deployments** — đó không phải
"không có gì để duyệt", đó là chưa có cổng. Quay lại § 5.1 và kiểm bằng lệnh
`gh api` ở đó: `[]` nghĩa là environment rỗng luật.

### 5.6 — Bật branch protection cho `main`

Đã bật sẵn trên repo này (2026-09-11). Ghi lại đây vì nó là **điều kiện** để CD
được phép deploy thẳng lúc merge — không có nó thì commit chưa test đi ra
production:

```bash
R=thangdx-1076/agentic-coding-hands-on
gh api -X PUT repos/$R/branches/main/protection --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["Quality", "E2E (CI-safe)"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
JSON
gh api repos/$R/branches/main/protection --jq '.required_status_checks'   # kiểm lại
```

Từng khoá, và vì sao:

- `contexts` — đúng hai chuỗi trong `name:` của hai job ở `ci.yml`. Gõ sai hoặc
  đổi tên job sau này ⇒ check bị bỏ yêu cầu **trong im lặng**, PR treo pending
  vĩnh viễn chờ một check không ai phát ra.
- `strict: true` — branch phải cập nhật với `main` trước khi merge. Đây là thứ
  làm cho "CI đã xanh" nói về đúng cái cây code sẽ nằm trên `main`, chứ không
  phải một ảnh chụp cũ.
- `enforce_admins: true` — bạn cũng không bypass được. Cần đường thoát khẩn cấp
  thì tắt rule, push, bật lại; chậm hơn nhưng để lại dấu vết, khác hẳn một cú
  push lặng lẽ.
- `required_pull_request_reviews: null` — repo một người thì không tự approve PR
  của mình được, bật lên là tự khoá mình ra ngoài. Thêm người thứ hai thì mở.

---

## Bước 6 — Deploy lần đầu và nghiệm thu

Lần đầu, schema đi trước — và đây cũng là thứ tự cho mọi lần sau có migration.

1. **Chạy migration trước** (§ 5.5): Actions → **Migrate production database** →
   Run workflow → gõ `migrate` → duyệt. Lần đầu thì bạn đã `db push` tay ở Bước 2
   rồi, nên Summary sẽ in `Remote database is up to date` — chạy một lượt để xác
   nhận CI cũng nói vậy là đáng giá.
2. **Trên PR**: CI chạy (~5–8 phút). Nút Merge khoá cho tới khi cả `Quality` lẫn
   `E2E (CI-safe)` xanh. Đây là chỗ duy nhất test chặn được bạn.
3. **Merge xong**: CD khởi động **ngay**, không đợi CI chạy lại trên `main`. Nó
   chỉ deploy code — không đụng database.
4. Job `deploy` build, ship, rồi `curl` vào deployment URL. URL production in ra ở
   phần Summary của run. Nếu commit vừa deploy có đụng `supabase/migrations/`,
   Summary còn kèm một cảnh báo ⚠️ nhắc bạn kiểm lại đã chạy migration chưa.

### Nghiệm thu thủ công — bắt buộc

CI **không** cover luồng đăng nhập. Test tag `@auth` và `@local-db` bị loại khỏi CI,
còn nhánh đổi code PKCE thành công ở `/auth/callback` thì không có test tự động ở bất
kỳ đâu (lý do đầy đủ nằm ở header `ci.yml`). Nên sau deploy đầu tiên, tự đi qua:

- [ ] `/` mở được, countdown chạy đúng số (không phải 00/00/00 → sai `EVENT_START_AT`)
- [ ] `/awards`, `/standards`, `/kudos` render có dữ liệu, không rơi empty state
- [ ] Bấm **LOGIN With Google** → qua Google → quay về `/` đã đăng nhập
      (rơi về `/login?error=...` ⇒ sai redirect URI ở Bước 3)
- [ ] Header hiện chuông thông báo + menu tài khoản, avatar Google load được
      (avatar vỡ ⇒ xem `OAUTH_AVATAR_PATTERNS`)
- [ ] Viết một Kudo có đính ảnh → ảnh hiện trên board (kiểm tra cả bucket lẫn
      `remotePatterns` của Supabase Storage)
- [ ] `/profile` và `/todo` vào được khi đã login, đá về `/login` khi logout
- [ ] Đổi ngôn ngữ VN/EN, reload vẫn giữ (cookie `NEXT_LOCALE`)

### Mở khoá site ngày launch

Đổi `PRELAUNCH_LOCK_ENABLED` sang `false` trong Vercel env → **Redeploy**. Biến này
đọc ở `src/proxy.ts` lúc runtime nhưng Vercel chỉ nạp env mới khi deploy lại; sửa giá
trị mà không redeploy thì site vẫn khoá.

Chạy lại pipeline mà không cần commit rỗng: **Actions → CD → Run workflow**.

---

## Rollback

| Hỏng cái gì            | Làm gì                                                                 |
| ---------------------- | ---------------------------------------------------------------------- |
| Code                   | Vercel → Deployments → bản tốt trước đó → **Promote to Production**. Tức thì. |
| Schema                 | Không có undo. Viết migration mới đảo ngược, push qua pipeline. Mỗi file migration đều có sẵn câu rollback ở header. |
| Env var sai            | Sửa trong Vercel → Redeploy (hoặc CD → Run workflow).                   |
| OAuth gãy sau đổi domain | Cập nhật Site URL + Redirect URLs ở Supabase, và redirect URI ở Google Console. |

---

## Những gì pipeline này **không** đảm bảo

Nói thẳng để không ai đọc nhầm dấu tick xanh:

- Luồng đã đăng nhập chưa từng chạy trong CI. Test `@auth`/`@local-db` cần Supabase
  thật nên chỉ chạy ở máy dev.
- Nhánh thành công của `/auth/callback` không có test ở đâu cả — cần một lần đăng
  nhập Google thật mới sinh ra được cặp code/verifier.
- Smoke check sau deploy chỉ là probe sống/chết trên `/`. Nó bắt được app chết,
  không bắt được UI sai.
- Branch protection chặn **merge**, không chặn **push**. Rule khoá force-push và
  xoá nhánh, bắt buộc qua PR có check xanh — nhưng nó bảo vệ đúng `main`. Mọi
  đường khác vào production (bấm Run workflow trên CD, `vercel deploy` tay từ
  máy bạn, promote một deployment cũ trên dashboard) không đi qua check nào.
- Rule khớp theo **tên check**. Đổi `name:` của job trong `ci.yml` mà quên sửa
  rule là check bị bỏ yêu cầu trong im lặng: PR treo mãi ở trạng thái pending
  chờ một check không bao giờ tồn tại, chứ không đỏ để bạn nhận ra.
- `strict` bật nghĩa là branch phải cập nhật với `main` mới merge được. Nhiều PR
  chạy song song thì cái sau phải update rồi chờ CI chạy lại — đúng mục đích
  (kết quả merge mới là thứ được test), nhưng chậm hơn, đừng tưởng CI lỗi.
