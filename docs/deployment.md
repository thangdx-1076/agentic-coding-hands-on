# Deployment — SAA 2025 lên production

Hạ tầng đích: **Vercel** (Next.js app) + **Supabase Cloud** (database, auth, storage).

Chọn Vercel vì app dùng ba thứ chỉ chạy ngon trên runtime Next gốc: `src/proxy.ts`
(middleware chạy trước mọi route), Server Actions với `bodySizeLimit: "28mb"`, và
image optimizer với `remotePatterns` sinh động từ env. Tự host được, nhưng phải tự
dựng Node server + `sharp` + reverse proxy — không đáng cho một event site.

Toàn bộ deploy do GitHub Actions chạy, không do Vercel tự bắt commit:

| File                      | Chạy khi nào                        | Làm gì                                       |
| ------------------------- | ----------------------------------- | -------------------------------------------- |
| `.github/workflows/ci.yml` | push feat/fix/chore + PR + push main | lint, format, unit + coverage, build, typecheck, storybook, e2e |
| `.github/workflows/cd.yml` | **chỉ khi CI trên `main` xanh**     | `supabase db push` → `vercel deploy --prod` → smoke check |

CD nối vào CI qua `workflow_run`, không phải `push`. Nghĩa là commit vào `main` mà CI
đỏ thì không deploy gì cả. Chi tiết lý do nằm trong comment đầu `cd.yml`.

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

   Không có khoá này thì mỗi push vào `main` deploy **hai lần**: một lần Vercel tự
   chạy ngay khi commit về — không qua test nào, và **không chờ job `migrate`** —
   một lần nữa do `cd.yml`. Lần ungated đó mới là lần lên sóng trước, mang code mới
   chạy trên schema cũ.

   Hai cách thay thế, nếu muốn khoá ngay mà chưa merge được file này:
   - **Settings → Git → Ignored Build Step** → *Custom*, lệnh `exit 0` (Vercel hiểu
     exit code 0 là "bỏ qua build này").
   - **Settings → Git → Disconnect** hẳn repo. Dứt điểm nhất, đổi lại mất preview
     comment trên PR.

   Muốn **giữ preview cho PR nhưng chặn production**, dùng Ignored Build Step với
   `[ "$VERCEL_ENV" = "production" ] && exit 0 || exit 1` thay vì `vercel.json`.
   Trước khi làm vậy phải tách Supabase project riêng cho Preview: hiện
   `NEXT_PUBLIC_SUPABASE_URL` set cho cả Production lẫn Preview, nên preview của
   mọi PR đang đọc ghi thẳng vào database thật.
5. **Settings → Domains**: gắn domain thật nếu có. Nhớ quay lại Bước 3.3 cập nhật
   Site URL và Redirect URLs cho khớp.

---

## Bước 5 — Nạp secret và Environment cho GitHub Actions

Thứ tự bắt buộc: **tạo Environment trước, nạp secret sau**. Secret phải gắn vào
một Environment đã tồn tại; làm ngược lại thì không có chỗ để chọn.

### 5.1 — Tạo hai Environment

**Repo → Settings → Environments → New environment**:

| Environment     | Job dùng nó | Protection rule                     |
| --------------- | ----------- | ----------------------------------- |
| `production-db` | `migrate`   | **Required reviewers** → thêm bạn   |
| `production`    | `deploy`    | không cần                           |

Tên phải khớp **chính xác** (phân biệt hoa thường) với `environment:` trong
`cd.yml` — [`production-db`](../.github/workflows/cd.yml) ở job `migrate`,
`production` ở job `deploy`. Gõ sai tên thì GitHub **tự tạo một Environment mới
rỗng** mang tên trong workflow thay vì báo lỗi, job chạy thẳng không qua luật nào,
và secret bạn vừa nạp vào cái tên gõ sai sẽ không bao giờ được đọc tới.

Vì sao là hai chứ không phải một: protection rule gắn theo Environment, nên gộp
lại chỉ còn hai lựa chọn, cả hai đều dở. Bật reviewer ⇒ **mọi** deploy đều phải
duyệt, kể cả commit sửa CSS, và duyệt nhiều thì thành phản xạ. Tắt reviewer ⇒
`supabase db push` đổi schema production mà không ai nhìn. Migration không có nút
undo, deploy code thì rollback được bằng một click trên Vercel — hai mức rủi ro
khác nhau thì cần hai cái cổng khác nhau.

### 5.2 — Nạp secret, đúng phạm vi cho từng cái

Sáu secret, chia theo job tiêu thụ chúng:

| Secret                  | Job dùng           | Đặt ở đâu                        | Lấy ở đâu                                            |
| ----------------------- | ------------------ | -------------------------------- | ---------------------------------------------------- |
| `SUPABASE_PROJECT_REF`  | `plan` + `migrate` | **Repository secret**            | project ref ở Bước 1                                 |
| `SUPABASE_ACCESS_TOKEN` | `plan` + `migrate` | **Repository secret**            | Supabase → Account → Access Tokens → Generate        |
| `SUPABASE_DB_PASSWORD`  | `plan` + `migrate` | **Repository secret**            | database password đặt ở Bước 1                       |
| `VERCEL_TOKEN`          | `deploy`           | Environment secret, `production` | Vercel → Account Settings → Tokens → Create          |
| `VERCEL_ORG_ID`         | `deploy`           | Environment secret, `production` | Vercel → Team/Account Settings → **Team ID**         |
| `VERCEL_PROJECT_ID`     | `deploy`           | Environment secret, `production` | Vercel → Project Settings → General → **Project ID** |

**Vì sao bộ Supabase phải là repository secret, không phải environment secret
của `production-db`.** Required reviewers chặn **toàn bộ job** trước khi step đầu
tiên chạy. Nếu dry-run nằm trong job `migrate`, lúc bạn bấm Approve chưa có dòng
log nào tồn tại — bạn duyệt mù. Nên nó được tách thành job `plan` chạy trước,
không gắn Environment nào, và một job không có Environment thì không đọc được
environment secret. Đó là cái giá để có danh sách SQL trước cổng duyệt: ba
credential đó rộng phạm vi hơn mức tối thiểu.

Bộ Vercel không vướng ràng buộc đó — job `deploy` là nơi duy nhất dùng chúng và
nó khai báo `environment: production`, nên cứ để làm environment secret.

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

### 5.3 — Ghi chú về giá trị

`VERCEL_TOKEN` chỉ hiện **một lần** lúc tạo — copy ngay, mất thì tạo cái mới.
Hai ID còn lại không phải secret, chỉ là định danh; cách chắc nhất để lấy đúng
cả hai là để CLI tự điền thay vì copy tay từ dashboard:

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

### 5.4 — Duyệt lần chạy đầu

Với **Required reviewers** trên `production-db`, job `migrate` dừng chờ bạn. Thứ
tự trên màn hình Actions:

1. Job **`plan`** chạy xong trước, in danh sách migration pending ra **Summary**
   của run (ngay đầu trang, không phải trong log).
2. Job **`migrate`** hiện **Review deployments** → đọc Summary ở bước 1 → tick
   `production-db` → **Approve and deploy**.

Không có migration nào pending thì Summary in `Remote database is up to date`;
duyệt là xong, không gì thay đổi.

---

## Bước 6 — Deploy lần đầu và nghiệm thu

Pipeline đã nằm trên `main`, nên mỗi lần merge là một lần deploy. Theo dõi ở tab
**Actions**:

1. **CI** chạy trước (~5–8 phút). Đỏ ⇒ dừng, không có gì được deploy.
2. **CD** tự khởi động sau khi CI xanh — không phải lúc commit về. Job `plan`
   chạy trước, in danh sách migration pending ra **Summary** của run.
3. Job `migrate` hiện **Review deployments**. Đọc Summary ở bước 2 rồi mới
   **Approve**.
4. Job `deploy` build, ship, rồi `curl` vào deployment URL. URL production in ra ở
   phần Summary của run.

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
- `main` không có branch protection (xác nhận 2026-09-05). CI đỏ không chặn được
  merge — nó chỉ chặn deploy. Nên `main` có thể chứa code chưa bao giờ lên
  production; muốn biết cái gì đang chạy thì đọc pipeline, đừng đọc branch.
