---
status: draft
authored_by: takumi
created: 2026-09-07
lang: vi
fcode: F006
---

# F006_ProfilePage

**Priority**: P1
**Type**: mixed
**Generated**: 2026-09-07

**See also:** [`functional-spec.md`](./functional-spec.md) — tổng quan, Open Decisions, FR/BR
one-liner, screens, user stories, scenarios, edge cases cho độc giả BA/QA.

**How to read this file:** § 2 bảng chỉ mục. § 3 chi tiết action. § 4 content contract/DOM/asset.
§ 5 verification + nguồn.

## 1. Technical Overview

Trang **có gác đăng nhập** mới `/profile` (`src/app/(protected)/profile/page.tsx`) — 1 Server
Component nằm trong nhóm `(protected)`, dùng lại nguyên vẹn `src/app/(protected)/layout.tsx` làm
gate duy nhất (cùng cơ chế `/todo`). **XÁC NHẬN qua MoMorph (`get_frame` `362:5037`, "Profile bản
thân", 1440×4660): trang này TÁI DÙNG nguyên vẹn `SiteHeader`/`SiteFooter`** (node
`mms_1_Button` `I362:5041;186:1597` ở header, `mms_7.4_Button-IC` `I435:3154;1161:9487` ở footer)
— khác `/standards` (F005), nơi frame không chứa chrome nào. Component tự đọc lại
`getCurrentUser()` (accepted extra round-trip, cùng pattern `TodoPage`) để biết id người xem,
phân giải `?id=` (self/other/404), rồi đọc ĐÚNG 1 nguồn dữ liệu cho cả 2 nhánh — view
`public.profile_cards` (migration `0005`, mới) — không đọc `public.users` trực tiếp cho mục đích
hiển thị hồ sơ; đây là quyết định CHỐT (không phải suy luận riêng của spec draft — màn hình không
hiển thị `email`/`role`/`locale` ở bất kỳ node nào trong frame, xem § 3.1, § 5.2). Mọi bề mặt phụ
thuộc Kudos (bộ sưu tập huy hiệu, statistics card, dropdown chiều Kudos, thanh Viết Kudo) là nội
dung TĨNH/rỗng có chủ đích — không bảng `kudos` nào được query. 2 capability (`CAP-01` self,
`CAP-02` other), 3 action, không action nào ghi DB.

## 2. Action Index

| # | Action (handler) | Method · Path | Codes | Writes | Detail |
|---|---|---|---|---|---|
| **A1** | `ProfilePage` (Server Component) → phân giải `?id=` → đọc `profile_cards` → `ProfileScreen` | `GET` `/profile[?id=]` | FR-001, FR-002, FR-003, FR-101, FR-102, FR-201, FR-202, FR-401-FR-406, FR-501, BR-001, BR-003, BR-004, BR-005 | — *(read-only)* | § 3.1 |
| **A2** | Dropdown chiều Kudos (`KudosDirectionSelect`, client, no BE) | — *(chọn, không HTTP)* | FR-303, FR-304, FR-305, BR-006, US001, US002 | — *(read-only, dữ liệu tĩnh)* | § 3.2 |
| **A3** | Slot `362:5073` — statistics card (self) **hoặc** thanh "Viết Kudo" (other), loại trừ lẫn nhau; cả 2 control con luôn `disabled` | — *(render-only, không JS)* | FR-301, FR-302, FR-306, BR-002 | — *(read-only)* | § 3.3 |

## 3. Actions

### 3.1 CAP-01/CAP-02 — Render `/profile` (phân giải + đọc hồ sơ)

`GET` `/profile[?id=]` → `` `ProfilePage` ``
`FR-001` `FR-002` `FR-003` `FR-101` `FR-102` `FR-201` `FR-202` `FR-401`-`FR-406` `FR-501` ·
`SCR006_Profile` · `US001` `US002` `US003`

**Who** · Bất kỳ Sunner đã đăng nhập nào — anonymous đã bị `(protected)/layout.tsx` redirect
`/login` trước khi action này chạy (FR-001, ACC_001, ACC_002).

**FE** · `src/app/(protected)/profile/page.tsx` — `searchParams: Promise<{ id?: string | string[] }>`
(cùng shape `LoginPageSearchParams`, `src/app/(public)/login/page.tsx:16-22`). Pseudocode phân giải:

```ts
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const viewer = await getCurrentUser(); // non-null được đảm bảo bởi layout, đọc lại lấy id
  const { id: rawId } = await searchParams;

  // FR-401 — rỗng/vắng mặt → self
  if (rawId === undefined || rawId === "") {
    return renderProfile(viewer!.id, /* isSelf */ true);
  }

  // FR-403 — lặp key: Next trả string[] khi ?id= xuất hiện >1 lần
  if (typeof rawId !== "string") {
    notFound();
  }

  // FR-402 — shape-check UUID TRƯỚC khi query, chặn Postgres 22P02
  if (!UUID_RE.test(rawId)) {
    notFound();
  }

  // FR-404 — trùng chính người xem → canonicalize
  if (rawId === viewer!.id) {
    redirect(ROUTES.PROFILE);
  }

  const card = await getProfileCard(supabase, rawId); // FR-003, § 5.2 D011
  if (!card) {
    notFound(); // FR-405 — UUID hợp lệ, không có hàng
  }

  return renderProfile(card, /* isSelf */ false); // FR-406
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
```

`notFound()`/`redirect()` từ `next/navigation`, cùng import đã dùng ở `(protected)/layout.tsx` và
`(public)/login/page.tsx`. Thứ tự kiểm tra CỐ Ý: shape-check TRƯỚC self-match TRƯỚC query — không
bao giờ query DB bằng 1 giá trị chưa qua shape-check.

**Request** · `?id={uuid}` (optional) — không tham số nào khác.

**BE** · Migration `0005` (mới) thêm view:

- **Tên:** `public.profile_cards`
- **Cột phơi ra:** `id uuid`, `full_name text`, `avatar_url text` — CHỈ 3 cột này, KHÔNG `email`,
  KHÔNG `role` (FR-501, SEC_004).
- **Cơ chế bỏ qua RLS own-row của `public.users`:** view được owner là role có `BYPASSRLS` (role
  chạy migration của Supabase, thường là `postgres`) tạo với **`security_invoker = false`**
  (mặc định của Postgres — nghĩa là view thực thi với quyền của OWNER, không phải của người gọi
  query). Vì `public.users` đã `FORCE ROW LEVEL SECURITY` (migration `0001`), CHỈ một role có
  `BYPASSRLS` mới đọc được toàn bảng qua view này — một plain permissive policy (`USING (true)`)
  sẽ mở SELECT cho MỌI cột kể cả `email`/`role`, đây là lý do D002 chọn view thay vì policy.
  `GRANT SELECT ON public.profile_cards TO authenticated;` — không `anon` (trang có gác đăng
  nhập, không cần công khai hơn mức cần).
- **Không phải column-level GRANT trên chính `public.users`:** cách đó sẽ phá `getUserRole`'s
  own-row `role` read (`src/dal/users-role-client.ts`) vì nó SELECT `role` qua route khác.
- **`AwardsClient`-style typed client** (mirror `src/dal/awards.ts:61-75`): DAL mới
  `src/dal/profile-cards.ts` export `ProfileCardsClient` hẹp (chỉ `.from("profile_cards")
  .select(columns).eq("id", value).maybeSingle()`), và:

```ts
export type ProfileCard = { id: string; fullName: string | null; avatarUrl: string | null };

export async function getProfileCard(
  supabase: ProfileCardsClient,
  id: string,
): Promise<ProfileCard | null> {
  try {
    const { data, error } = await supabase
      .from("profile_cards")
      .select("id,full_name,avatar_url")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) return null;

    return { id: data.id, fullName: data.full_name, avatarUrl: data.avatar_url };
  } catch {
    return null;
  }
}
```

Fail-open-tới-`null` mirror chính xác `getUserRole` (`src/dal/users-role-client.ts:51-70`) — khác
với `getAwards` (fail-open tới `[]`, vì đó là danh sách): ở đây `null` được `ProfilePage` xử lý
bằng `notFound()`, không phải một empty-state render (một request lỗi mạng thoáng qua và một hồ
sơ thật-sự-không-tồn-tại render CÙNG một kết quả quan sát được — chấp nhận được vì cả 2 đều là
"không có gì để hiển thị", không phải một quyết định phân quyền, cùng triết lý fail-open đã ghi ở
`docs/vi/system/permissions.md` § Special Conditions cho `getUserRole`/`getAwards`).

**Rule**
- **FR-001/BR-001 — Gác đăng nhập DUY NHẤT là `(protected)/layout.tsx`.** Không gate riêng.
- **FR-003/BR-003 — Self và other CÙNG đọc `profile_cards`.** CHỐT: màn hình không có node nào
  hiển thị `email`/`role`/`locale` (frame `362:5037` xác nhận) nên 1 đường đọc phục vụ cả 2 mặt
  (DRY) — không cần nhánh đọc `public.users` riêng cho self. Xem § 5.2 cho chi tiết.
- **FR-402 — Shape-check UUID trước mọi query** (chặn `22P02`).
- **FR-403 — `string[]` (lặp key) → `notFound()`**, không lấy `[0]`.
- **FR-404 — Trùng self → `redirect(ROUTES.PROFILE)`**, không render trực tiếp bằng nhánh other.
- **FR-405 — UUID hợp lệ, không có hàng → `notFound()`.**

**Result** · read-only. Props xuống `ProfileScreen`: `profile: ProfileCard`, `isSelf: boolean`.

**Source:** `src/app/(protected)/profile/page.tsx` → `src/dal/profile-cards.ts`
(`getProfileCard`) → `_components/profile-client.tsx` → `_components/profile-screen.tsx`

---

### 3.2 A2 — Dropdown chiều Kudos

— *(client, không HTTP)* → `` `KudosDirectionSelect` `` (node `mms_C.3_Button`, `362:5089`)
`FR-303` `FR-304` `FR-305` · `SCR006_Profile` · `US001` `US002`

**Who** · Bất kỳ Sunner nào đang xem `/profile` (self hoặc other).

**FE** · Dropdown nằm trong header section "KUDOS" (`mms_C_Header Giải thưởng`, `362:5084` —
eyebrow `mms_C.1_title` `362:5085` = "Sun* Annual Awards 2025"; heading `mms_C.2_KUDOS title`
`362:5088` = "KUDOS", vàng, cỡ lớn). Client component nhận `directions: KudosDirection[]` từ
props (server đã quyết định danh sách theo `isSelf`: self → `["received", "sent"]`, other →
`["received"]` — FR-303/FR-304). State chọn chiều là `useState` client-side thuần, KHÔNG gọi API
nào (không có feed thật để fetch — `FR-002`). Trigger hiển thị theo mẫu `{Nhãn} ({count})` — design
cho `Đã gửi (5)` làm ví dụ chiều đang chọn; bản build của ta LUÔN khởi tạo `Đã nhận (0)` trước
(count luôn `0` — FR-303/FR-304). Mỗi chiều render copy rỗng cố định
(`profile.kudos.emptyReceived` / `profile.kudos.emptySent`, FR-305 — nội dung verbatim CHƯA xác
nhận với design, xem § 5.2) — không danh sách trống-không-giải-thích.

**Request** · không có (không network call).
**BE** · không có.
**Rule**
- **FR-303 — Self có cả 2 chiều, trigger `{Nhãn} ({count})`, count luôn `0`.**
- **FR-304/BR-006/SEC_001 — Other CHỈ có Received; Sent bị bỏ hẳn khỏi mảng `directions`, không
  phải render rồi `disabled`/`hidden`** — kiểm chứng được bằng đếm số `<option>`/tab trong DOM.
- **FR-305 — Copy trạng thái rỗng theo chiều đang chọn, luôn hiển thị (không phải danh sách
  trống im lặng).**
**Result** · read-only, không ghi DB, không network.
**Source:** `src/app/(protected)/profile/_components/kudos-direction-select.tsx`

### 3.3 A3 — Slot `362:5073` (`mms_B_Thống kê`): statistics card ↔ thanh "Viết Kudo"

— *(render-only)* → statistics card (self) **HOẶC** "Viết Kudo" (other) — loại trừ lẫn nhau ``
`FR-301` `FR-302` `FR-306` · `SCR006_Profile` · `US001` `US002`

**Who** · Bất kỳ Sunner nào đang xem `/profile`.

**FE** · Node `mms_B_Thống kê` (`362:5073`) là container DUY NHẤT ở vị trí này trong design — xác
nhận đọc từ MoMorph: đây **là chính cái slot mà thanh Viết Kudo thay thế** ("the slot the
write-Kudo bar replaces"). Vì vậy `ProfileStatisticsCard` render 1-trong-2 biến thể, KHÔNG BAO GIỜ
cả 2:
- `isSelf === true` → statistics card đầy đủ: 5 dòng (`mms_B.1`…`mms_B.5`, `362:5076`-`362:5081`,
  copy thật § 4.3) + nút "Mở Secret Box 🎁" (`mms_B.6_Button mở quà`, `362:5082`), `disabled` cứng
  — không `onClick` nào gắn phía sau (không có modal, không có API để gọi).
- `isSelf === false` → CHỈ thanh "Viết Kudo", `disabled` cứng, không modal — hồ sơ mình không bao
  giờ render thanh này (không tự gửi Kudos cho chính mình).

**Request** · không có.
**BE** · không có.
**Rule**
- **FR-301/FR-302 — Statistics card + "Mở Secret Box" CHỈ render khi `isSelf === true`, luôn
  `disabled`, không điều kiện runtime nào bật nó** (cùng nguyên tắc BR-005 của F005 `/standards`).
- **FR-306 — "Viết Kudo" CHỈ render khi `isSelf === false`, THAY THẾ toàn bộ slot trên, luôn
  `disabled`, không modal.** TC FUN_006 (mở modal)/FUN_007 hoãn sang F007+ — chỉ nhánh
  render/disabled này (FUN_008) nằm trong phạm vi F006.
**Result** · read-only, không ghi DB. Click không có hiệu ứng (không handler nào gắn).
**Source:** `src/app/(protected)/profile/_components/profile-statistics-card.tsx`

### 3.4 Edge cases

| Action | Scenario | Behavior |
|---|---|---|
| A1 | `?id=not-a-uuid` | Regex fail → `notFound()` trước khi chạm DB |
| A1 | `?id=a&id=b` | `typeof rawId !== "string"` → `notFound()` |
| A1 | `?id=` rỗng | Self view, không query `profile_cards` bằng giá trị rỗng |
| A1 | `?id=` = id chính người xem | `redirect(ROUTES.PROFILE)` — 1 round-trip HTTP thêm, chấp nhận được vì đây là nhánh hiếm (URL thủ công/link cũ) |
| A1 | `?id=` UUID hợp lệ, `getProfileCard` trả `null` (không hàng HOẶC lỗi Supabase thoáng qua) | `notFound()` — cả 2 nguyên nhân render CÙNG kết quả quan sát được (§ 3.1) |
| A2/A3 | Hồ sơ người khác | Dropdown chỉ Received; slot `362:5073` render "Viết Kudo" disabled (KHÔNG có statistics card) |
| A2/A3 | Hồ sơ mình | Dropdown 2 chiều; slot `362:5073` render statistics card 5 dòng + "Mở Secret Box" (KHÔNG có "Viết Kudo") |

## 4. Shared Foundation

### 4.1 Components

| Component | Responsibility | Used in | File | Status |
|---|---|---|---|---|
| `ProfilePage` (Server Component) | Entry point `/profile`, phân giải `?id=`, đọc `profile_cards` | A1 | `src/app/(protected)/profile/page.tsx` | draft |
| `getProfileCard` (DAL) | Đọc `public.profile_cards` cho 1 `id`, fail-open `null` | A1 | `src/dal/profile-cards.ts` | draft |
| `ProfileClient` | Client boundary — truyền `profile`, `isSelf` xuống presentational tree | A1, A2, A3 | `src/app/(protected)/profile/_components/profile-client.tsx` | draft |
| `ProfileScreen` | Presentational root — hero, bộ sưu tập huy hiệu, statistics card, dropdown | A1, A2, A3 | `src/app/(protected)/profile/_components/profile-screen.tsx` | draft |
| `ProfileHero` | Full-bleed keyvisual (`mms_3_Keyvisual`, `I1210:12622;2167:5140`) + avatar tròn đè mép dưới (`mms_A.2_Avatar`... xem `mms_A.1_Avatar` `362:5053`) + tên vàng (`mms_A.2_Name` `362:5054`), KHÔNG dept/tier/stars (`mms_A.2.2_Thông tin chi tiết` `362:5056` (dept `362:5057` + danh hiệu `3053:6061`) — bỏ hẳn, GUI_009) | A1 | `src/app/(protected)/profile/_components/profile-hero.tsx` | draft |
| `BadgeCollection` | 6 ô cố định (`362:5066`-`362:5071`), luôn khoá; nằm GIỮA hero và statistics card, tiêu đề BÊN DƯỚI hàng ô; tiêu đề self/other split, copy thật (GUI_003, § 4.3) | A1 | `src/app/(protected)/profile/_components/badge-collection.tsx` | draft |
| `ProfileStatisticsCard` | Slot `362:5073` — 5 dòng `0` + nút "Mở Secret Box 🎁" (self) HOẶC thanh "Viết Kudo" thay thế toàn bộ slot (other), loại trừ lẫn nhau (§ 3.3) | A1, A3 | `src/app/(protected)/profile/_components/profile-statistics-card.tsx` | draft |
| `KudosDirectionSelect` | Dropdown chiều Kudos (`mms_C.3_Button` `362:5089`), danh sách chiều theo `isSelf`, trigger `{Nhãn} ({count})` (§ 3.2) | A2 | `src/app/(protected)/profile/_components/kudos-direction-select.tsx` | draft |
| `ProfileCopy` (type) + `buildProfileCopy` | Content contract — i18n namespace `profile` | A1 | `src/app/(protected)/profile/_shared/profile-copy.ts`, `_shared/build-profile-copy.ts` | draft |

**`SiteHeader`/`SiteFooter` — XÁC NHẬN tái dùng nguyên vẹn** (khác F005 `/standards`, nơi frame
không có chrome nào): MoMorph frame `362:5037` chứa node header (`mms_1_Button`,
`I362:5041;186:1597` — nút tài khoản) VÀ node footer (`mms_7.4_Button-IC`,
`I435:3154;1161:9487`) — logo, `About SAA 2025`, `Award Information`, `Sun* Kudos`, bell, `VN`
switcher, avatar button ở đầu; footer chuẩn ở cuối. Vì `/profile` LUÔN đã đăng nhập khi render
(gate `(protected)/layout.tsx` chạy trước), `SiteHeader` chỉ bao giờ render biến thể "đã đăng
nhập" (bell + menu tài khoản) — không bao giờ nút "Đăng nhập" như trên `/`/`/awards` cho khách
ẩn danh.

**Route registry:** thêm `PROFILE: "/profile"` vào `ROUTES` (`src/constants/routes.ts`) — cùng
pattern `AWARDS`/`STANDARDS` đã có, dùng làm đích canonicalize của A1 (FR-404).

**`src/proxy.ts` — 2 thay đổi:**
1. `config.matcher` (literal array, không thể dùng `ROUTES.*` — Next static-analyze tại build
   time, xem comment hiện có `proxy.ts:119-122`): thêm `"/profile"`.
2. `isProtectedPage` hiện là `pathname.startsWith(ROUTES.TODO)` (`proxy.ts:36`) — widen thành
   test theo danh sách (`[ROUTES.TODO, ROUTES.PROFILE].some((p) => pathname.startsWith(p))`)
   thay vì so khớp 1 route đơn lẻ. Đây là optimistic pre-check thêm — `(protected)/layout.tsx`
   vẫn là gate AUTHORITATIVE duy nhất (không đổi).

### 4.2 Content Model (không phải DB entity mới, ngoại trừ `profile_cards`)

```ts
export type ProfileCard = {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
};

export type BadgeSlot = {
  slug: string; // 6 slug cố định, node id: 362:5066, 362:5067, 362:5068, 362:5069, 362:5070,
                // 362:5071 — semantic slug/tên riêng từng ô KHÔNG có trong specs.csv (khác 6
                // icon "REVIVAL"... của F005); implementer đặt tên kỹ thuật, giữ đúng SỐ LƯỢNG 6
};

export type ProfileCopy = {
  hero: { fallbackName: string }; // khi fullName null — copy CHƯA xác nhận (§ 5.2)
  badges: {
    headingSelf: string;   // "Bộ sưu tập icon của tôi" (GUI_003, verbatim xác nhận)
    headingOther: string;  // "Bộ sưu tập icon" (GUI_003, verbatim xác nhận — KHÔNG interpolate tên)
  };
  stats: {
    rows: [string, string, string, string, string]; // 5 nhãn dòng verbatim, giá trị luôn "0"
    openSecretBox: string;       // "Mở Secret Box" + glyph 🎁, luôn disabled, self-only
    writeKudos: string;          // "Viết Kudo", thay thế toàn bộ slot khi !isSelf, luôn disabled
  };
  kudos: {
    receivedLabel: string;
    sentLabel: string;           // chỉ dùng khi isSelf
    emptyReceived: string;       // FR-305 — copy CHƯA xác nhận (§ 5.2)
    emptySent: string;           // FR-305, chỉ dùng khi isSelf — copy CHƯA xác nhận (§ 5.2)
  };
};
```

`BadgeSlot` là mảng **tĩnh cứng** — không fetch, không props từ props khác (giống `tiers`/`badges`
của `standards-copy.ts`, F005 § 4.2) — luôn 6 phần tử, luôn khoá.

### 4.3 i18n Keys — namespace `profile` (`messages/{vi,en}.json`, MỚI)

Đề xuất shape khoá; giá trị **verbatim đã xác nhận qua MoMorph** được đánh dấu rõ, phần còn lại
vẫn là đề xuất (implementer xác nhận cuối cùng trước khi khoá tên key):

```
profile.hero.fallbackName            "Sunner" *(CHƯA xác nhận — đề xuất, dùng khi full_name null)*
profile.badges.headingSelf           "Bộ sưu tập icon của tôi"           [XÁC NHẬN — GUI_003]
profile.badges.headingOther          "Bộ sưu tập icon"                  [XÁC NHẬN — GUI_003,
                                       KHÔNG chèn tên, khác bản draft trước]
profile.stats.rows.received          "Số Kudos bạn nhận được:"          [XÁC NHẬN — 362:5076]
profile.stats.rows.sent              "Số Kudos bạn đã gửi:"             [XÁC NHẬN — 362:5077]
profile.stats.rows.hearts            "Số tim bạn nhận được:"            [XÁC NHẬN — 362:5078]
                                      — divider trong design, giữa dòng 3 và 4 —
profile.stats.rows.secretBoxOpened   "Số Secret Box bạn đã mở:"         [XÁC NHẬN — 362:5080]
profile.stats.rows.secretBoxLeft     "Số Secret Box chưa mở:"           [XÁC NHẬN — 362:5081]
profile.stats.openSecretBox          "Mở Secret Box" + glyph 🎁         [XÁC NHẬN — 362:5082]
profile.stats.writeKudos             "Viết Kudo"                        (giữ nguyên từ bản trước)
profile.kudos.receivedLabel          "Đã nhận"                          (trigger dạng "Đã nhận (0)")
profile.kudos.sentLabel              "Đã gửi"                           (trigger dạng "Đã gửi (0)";
                                       design cho ví dụ "Đã gửi (5)", build của ta luôn 0)
profile.kudos.emptyReceived          *(CHƯA xác nhận — đề xuất)* "Bạn chưa nhận Kudos nào." /
                                       "{name} chưa nhận Kudos nào."
profile.kudos.emptySent              *(CHƯA xác nhận — đề xuất)* "Bạn chưa gửi Kudos nào."
```

`profile.stats.rows.*` giờ là verbatim ĐÃ XÁC NHẬN (5 nhãn, mỗi nhãn kết thúc bằng dấu `:`, đúng
thứ tự trên) — không còn là khoảng hở của spec draft này. Khoảng hở CÒN LẠI: copy trạng thái rỗng
của dropdown Kudos (`emptyReceived`/`emptySent`) và `hero.fallbackName` — 2 mục này KHÔNG nằm
trong dữ liệu MoMorph coordinator đã xác nhận (chỉ xác nhận số lượng/nhãn dropdown, không xác
nhận copy empty-state của feed rỗng) — implementer xác nhận lại bằng `get_frame`/`download_specs`
nếu cần verbatim chính xác trước khi khoá tên key (§ 5.2).

### 4.4 Assets

Node id xác nhận cho từng asset (file thật chưa export — implementer chạy `get_frame_image` theo
từng id dưới đây để lấy file, KHÔNG suy diễn tên file):

| Asset | Node id | Dùng cho |
|---|---|---|
| Hero keyvisual (full-bleed artwork band) | `mms_3_Keyvisual` — `I1210:12622;2167:5140` | `ProfileHero` background |
| Avatar (ảnh động, không phải asset tĩnh) | — (đọc từ `profile_cards.avatar_url`, không phải MoMorph asset) | `ProfileHero` |
| 6 artwork badge-slot | `mms_B2.1_Ảnh Huy hiệu` — `I362:5066;3053:10046` (và tương đương cho 5 ô còn lại, cùng pattern `I{slotId};3053:10046`) | `BadgeCollection`, mỗi ô 1 artwork (luôn xám/khoá) |
| Icon nút "Mở Secret Box" (glyph 🎁) | thuộc `mms_B.6_Button mở quà` — `362:5082` | `ProfileStatisticsCard` |

Giả định tái dùng icon sẵn có nếu khớp ngữ nghĩa (vd. icon bút cho "Viết Kudo" — cân nhắc tái dùng
`IconPencil`, `(public)/_components/icons/icon-pencil.tsx`, đã climb lên scope-ladder từ F005,
DRY) — asset thật của MoMorph không thay thế icon hệ thống này trừ khi `get_frame_image` cho thấy
"Viết Kudo" dùng 1 artwork khác hẳn.

### 4.5 DOM / a11y Contract (khoá theo node id MoMorph — xác nhận, xem § 5.2 cho phần còn hở)

Layout order xác nhận (frame `362:5037`, nền `#00101A`): `SiteHeader` → hero keyvisual full-bleed
(avatar tròn đè lên mép dưới, căn giữa) → tên vàng ngay dưới avatar → 1 dòng gộp
department+tier+stars (BỎ HẲN, GUI_009) → 6 ô badge căn giữa 1 hàng → tiêu đề bộ sưu tập BÊN DƯỚI
hàng ô → slot `362:5073` (statistics card dark panel, hairline border, max-width ~600px, căn giữa
— HOẶC thanh "Viết Kudo" thay thế) → header "KUDOS" (eyebrow + heading vàng lớn) + dropdown chiều
→ feed container `mms_D_Post all` (`362:5091`, luôn rỗng — KHÔNG build nội dung card, xem § 3.4)
→ `SiteFooter`.

Bảng dưới dùng ký hiệu `C#` để implementer/tester nối tiếp thành `tests/e2e/profile.spec.ts` (cùng
convention `[C#]` mà `tests/e2e/standards.spec.ts` đã dùng cho F005):

| # | Contract | TC |
|---|---|---|
| C1 | `page.locator("header")` và `page.locator("footer")` count `1` mỗi cái (KHÁC F005 — chrome CÓ mặt) | (layout, xác nhận) |
| C2 | Đúng 1 heading chứa tên hồ sơ, ngay dưới avatar tròn (self: tên người xem; other: tên Sunner được xem) | GUI_001 |
| C3 | Hero KHÔNG chứa bất kỳ text node nào ứng với dòng department+tier+stars (`362:5056`) | GUI_009 |
| C4 | Đúng 6 phần tử badge-slot (`362:5066`-`362:5071`) trong 1 hàng căn giữa, tất cả mang class/attribute "khoá" nhất quán; tiêu đề nằm SAU (DOM order) hàng ô | GUI_002 |
| C5 | Tiêu đề bộ sưu tập: self = `Bộ sưu tập icon của tôi`; other = `Bộ sưu tập icon` (không tên) | GUI_003 |
| C6 | Self: đúng 5 dòng trong statistics card, mỗi dòng đúng nhãn verbatim § 4.3 + text `0`, có 1 divider giữa dòng 3-4 | GUI_004 |
| C7 | Self: nút "Mở Secret Box 🎁" có thuộc tính `disabled` trong MỌI trường hợp | GUI_005 |
| C8 | Other: slot `362:5073` KHÔNG chứa 5 dòng/nút Secret Box — chỉ chứa thanh "Viết Kudo" `disabled` | FUN_008 |
| C9 | Dropdown chiều Kudos (`362:5089`): self → 2 option, trigger `Đã nhận (0)`/`Đã gửi (0)`; other → đúng 1 option Received, KHÔNG có Sent kể cả disabled | FUN_009, SEC_001 |
| C10 | Chọn 1 chiều → hiển thị đúng copy rỗng tương ứng (không danh sách trống không chữ) | FUN_011, FUN_012 |
| C11 | Click "Viết Kudo" không mở modal/không network call | FUN_008 |
| C12 | `page.goto("/profile?id=not-a-uuid")` → response/URL phản ánh 404 (Next not-found), KHÔNG network call tới Supabase | FUN_004 |
| C13 | `page.goto("/profile?id=a&id=b")` → 404 | FUN_005 |
| C14 | `page.goto("/profile")` (không tham số, đã đăng nhập) → hero là hồ sơ mình | FUN_005 |
| C15 | `page.goto("/profile?id={id chính mình}")` → URL cuối cùng là `/profile` (đã redirect) | FUN_002 |
| C16 | Network response của action đọc hồ sơ (other) KHÔNG chứa field `email`/`role` | SEC_004 |
| C17 | Anonymous (không cookie session) → `page.goto("/profile")` → URL cuối cùng là `/login` | ACC_001 |
| C18 | Chip Spam (`I3127:24455;3127:24095`, `I3127:24169;3127:24095`) KHÔNG BAO GIỜ xuất hiện trong DOM (feed luôn rỗng) | GUI_007 (deferred, negative-assertion only) |

## 5. Verification & Technical Notes

### 5.1 Technical Verification (checklist cho tester khi implement, `e2e-red-first`)

- **SC-001** *(A1)* `/profile` redirect `/login` cho anonymous; render cho authenticated — không
  redirect nào cho authenticated (covers FR-001, ACC_001, ACC_002)
- **SC-002** *(A1)* Self view render đúng tên/avatar của viewer, không dept/tier/stars (FR-101,
  FR-102, GUI_001, GUI_008, GUI_009)
- **SC-003** *(A1)* Other view (`?id=` hợp lệ) render đúng tên/avatar người đó, không email/role
  (FR-406, FR-501, SEC_004)
- **SC-004** *(A1)* 4 nhánh `?id=` bất thường đều đúng: rỗng→self, sai định dạng→404, lặp
  key→404, trùng self→redirect canonical (FR-401, FR-402, FR-403, FR-404, FUN_002, FUN_004,
  FUN_005)
- **SC-005** *(A1)* `?id=` hợp lệ không tồn tại hàng → 404 (FR-405)
- **SC-006** *(A2)* Dropdown self có 2 chiều `(0)`; other chỉ Received (FR-303, FR-304, FUN_009,
  SEC_001)
- **SC-007** *(A2)* Copy rỗng đúng theo chiều đang chọn (FR-305, FUN_011, FUN_012)
- **SC-008** *(A3)* Slot `362:5073`: self → statistics card + "Mở Secret Box 🎁" disabled; other →
  CHỈ "Viết Kudo" disabled (không co-render), không mở modal — 2 biến thể loại trừ lẫn nhau
  (FR-301, FR-302, FR-306, GUI_005, FUN_008)
- **SC-009** *(A1)* Bộ sưu tập huy hiệu luôn đúng 6 ô khoá, tiêu đề đúng verbatim self/other, nằm
  dưới hàng ô (FR-201, FR-202, GUI_002, GUI_003)
- **SC-010** *(A1)* Statistics card (self) luôn đúng 5 dòng verbatim + `0` (FR-301, GUI_004)
- **SC-011** *(A1)* `SiteHeader`/`SiteFooter` render đúng 1 lần mỗi cái, biến thể "đã đăng nhập"
  (không nút "Đăng nhập") — khác F005 `/standards`

**Kết quả Delivery:** CHƯA CÓ — đây là spec draft (status: `draft`), chưa qua Track A/Track B.
Phiên implement kế tiếp chạy `pnpm test:e2e tests/e2e/profile.spec.ts --reporter=list` RED trước
code (404 vì route chưa tồn tại), GREEN sau — ghi lại đúng format § 14 của functional-spec.md khi
hoàn tất, cùng cách F004/F005 đã ghi.

### 5.2 Assumptions & Unresolved Questions

- **XÁC NHẬN 2026-09-07 (2 lượt):** Bản đầu tiên của spec draft này được viết KHÔNG có quyền gọi
  MoMorph MCP tools. Coordinator sau đó tự chạy `get_frame` (`362:5037`, 1440×4660, "Profile bản
  thân", design_status/spec_status `done`), `download_specs` (28 item), `download_test_cases`
  (30), `get_frame_image` và gửi lại node id + copy verbatim + layout facts — TOÀN BỘ node id và
  copy đã dùng ở § 3, § 4 của bản hiện tại phản ánh dữ liệu THẬT đó, không còn là suy diễn. 2 sửa
  lớn so với bản đầu: (1) `SiteHeader`/`SiteFooter` ĐÃ XÁC NHẬN có mặt (đảo ngược giả định ban đầu
  "chưa xác nhận được, khác F005"); (2) thanh "Viết Kudo" THAY THẾ TOÀN BỘ slot statistics-card
  (`362:5073`), không co-render — bản đầu chỉ nói "render ở slot đó" mà chưa xác định rõ là loại
  trừ lẫn nhau.
- **Vẫn còn hở sau 2 lượt xác nhận** (KHÔNG nằm trong dữ liệu coordinator gửi):
  - Copy trạng thái rỗng của dropdown Kudos (`profile.kudos.emptyReceived`/`emptySent`, § 4.3) —
    chỉ xác nhận SỐ LƯỢNG/nhãn dropdown, không xác nhận copy empty-state.
  - `profile.hero.fallbackName` (tên hiển thị khi `full_name` null) — không có trong dữ liệu
    MoMorph (frame luôn có `full_name` thật của user demo).
  - Semantic slug/tên riêng của 6 badge slot (`362:5066`-`362:5071`) — chỉ có node id, không có
    tên như 6 icon "REVIVAL"... của F005; implementer đặt tên kỹ thuật tự do, giữ đúng số lượng.
  - Asset PNG/SVG thật (hero keyvisual, 6 badge artwork) — có node id nhưng chưa export file;
    implementer chạy `get_frame_image` theo từng id ở § 4.4 trước khi code.
  - Tên/số lượng chính xác của 18 TC "implementable now" trong bảng `test-case disposition` của
    `clarifications.md` vẫn được TIN TƯỞNG nguyên văn (brief đánh dấu file đó authoritative) —
    coordinator không gửi lại toàn bộ `test-cases.csv`, chỉ gửi các node id/copy liên quan.
- **§ 3.1 D011 (self VÀ other cùng đọc `profile_cards`) — CHỐT, không còn là suy luận riêng của
  spec draft.** Lý do 1 dòng: màn hình không hiển thị `email`, `role`, hay `locale` ở bất kỳ node
  nào trong frame `362:5037`, nên 1 đường đọc phục vụ cả 2 mặt (DRY) và KHÔNG cần nhánh đọc
  `public.users` riêng cho self.
- **Migration `0005` chưa viết** — spec này mô tả contract (view, cột, GRANT), không phải SQL file
  thật; implementer viết migration theo đúng § 3.1, review kỹ trước merge (RISK-03,
  functional-spec.md § 11).
- Department/Hero tier/hoa-thị stars vẫn là câu hỏi sản phẩm CHƯA trả lời (không có cột nguồn) —
  dòng gộp này CÓ mặt trong design (`362:5056`) nhưng KHÔNG build được vì thiếu cột nguồn — xem
  functional-spec.md § 11 RISK-02.

### 5.3 Source References

| Action | Order | Symbol | Path | Purpose |
|---|---|---|---|---|
| A1 | 1 | `ProfilePage` | `src/app/(protected)/profile/page.tsx` | Entry point `/profile`, phân giải `?id=` |
| A1 | 2 | `getProfileCard` | `src/dal/profile-cards.ts` | Đọc `public.profile_cards` cho 1 `id`, fail-open `null` |
| A1 | 3 | `ProfileClient`, `ProfileScreen` | `_components/profile-client.tsx`, `_components/profile-screen.tsx` | Client boundary + render hero/badge/stats |
| A1 | 4 | `ProfileHero`, `BadgeCollection` | `_components/profile-hero.tsx`, `_components/badge-collection.tsx` | Render hero (`362:5052`-`362:5064`, GUI_009) + 6-ô badge (`362:5066`-`362:5071`, GUI_002/003) |
| A2 | 5 | `KudosDirectionSelect` | `_components/kudos-direction-select.tsx` | Dropdown chiều Kudos (`362:5089`), danh sách theo `isSelf` |
| A3 | 6 | `ProfileStatisticsCard` | `_components/profile-statistics-card.tsx` | Slot `362:5073` — 5 dòng `0` + nút disabled (self) HOẶC "Viết Kudo" disabled thay thế (other) |

#### Data Flow

```text
GET /profile[?id=] -> (protected)/layout.tsx [gate: getCurrentUser() hoặc redirect /login]
  -> ProfilePage [getCurrentUser() lại lấy id] -> phân giải ?id=
     rỗng            -> self = viewer.id
     string[]         -> notFound()
     !UUID_RE.test()  -> notFound()
     === viewer.id    -> redirect(ROUTES.PROFILE)
     hợp lệ, khác self -> getProfileCard(supabase, id)
        -> null       -> notFound()
        -> ProfileCard -> render other view
  -> ProfileClient -> ProfileScreen render SiteHeader + hero + badge (6 khoá) + slot 362:5073
     [isSelf ? stats card 5×0 + "Mở Secret Box" : "Viết Kudo" (thay thế slot)]
     + dropdown Kudos (self: 2 chiều; other: chỉ Received) + SiteFooter
client: đổi dropdown -> state cục bộ, không network -> hiện copy rỗng tương ứng
client: click "Mở Secret Box"/"Viết Kudo" -> không hiệu ứng (disabled, không handler)
```

### 5.4 Artifact References

| Artifact | File | Codes Used | Reviewed |
|----------|------|------------|----------|
| F005_StandardsRulesPage (pattern tham chiếu — disabled-control, Secret Box, DOM contract `[C#]`) | [technical-spec.md](../F005_StandardsRulesPage/technical-spec.md) | BR-005 disabled pattern, `[C#]` E2E contract convention | [x] |
| F004_AwardSystemPage (pattern tham chiếu — DAL fail-open shape, typed narrow client) | [technical-spec.md](../F004_AwardSystemPage/technical-spec.md) | `AwardsClient` narrow-client pattern, fail-open-to-`[]` | [x] |
| Clarifications | [clarifications.md](../../../clarifications.md) | Toàn bộ quyết định route/nội dung/`profile_cards`/test-case disposition | [x] |
| MoMorph frame `362:5037` ("Profile bản thân", 1440×4660) — node id + copy verbatim xác nhận trực tiếp bởi coordinator qua `get_frame`/`download_specs`/`get_frame_image` | *(không phải file — dữ liệu nhận qua tin nhắn coordinator, 2026-09-07)* | Toàn bộ node id/copy ở § 3, § 4 | [x] |
| Screens | SCR006_Profile *(chưa có file `screen-list.md`/`SCR006_Profile/spec.md` riêng — spec draft, chưa registry)* | SCR006_Profile | [ ] |
