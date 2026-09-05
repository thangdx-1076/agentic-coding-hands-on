---
status: draft
authored_by: takumi
created: 2026-09-05
lang: vi
---

# Functional Spec — F000_TestingStorybookStandards

**Priority**: P1
**Type**: background

**See also:** [`technical-spec.md`](./technical-spec.md) — cấu hình vitest/Storybook/MSW cụ thể,
Action Index, Source citation cho độc giả Dev/QA/SA.

## 1. Overview

**Problem:** Repo hiện không có quy tắc bắt buộc nào về unit test hay tài liệu component: nhiều
hook, cả ba lớp kết nối Supabase, và các Server Action/Route Handler mới không có test co-located;
component dùng chung (nút đăng nhập Google, bộ chọn ngôn ngữ...) không có nơi nào xem trước cách
dùng ngoài việc đọc code hoặc chạy cả app.
**Solution:** Một chuẩn bắt buộc, enforce qua CI: mọi file thuộc logic layer phải có unit test
co-located và coverage đạt 100%; mọi common component phải có Storybook story; mỗi route chính có
story riêng; và một lớp mock API (MSW) dùng chung cho cả Storybook lẫn unit test, để không ai phải
nuôi 2 bộ mock khác nhau cho cùng một API.
**Scope:** Áp dụng cho toàn bộ logic layer (hook, hàm thuần, Server Action, Route Handler chỉ
định); áp dụng cho mọi component đạt ranh giới "common"; áp dụng cho story của từng route chính
đang có UI trình bày thật.
**Non-Scope:** Không yêu cầu unit test cho component UI thuần (composition/feature); không yêu cầu
Storybook story cho component composition; không đổi cơ chế E2E (Playwright) hiện có; không mock
được hành động chuyển hướng đăng nhập Google qua MSW — đó là redirect top-level của trình duyệt,
nằm ngoài khả năng chặn của MSW (xem BR-003).

**Actors**

| Actor | Description | Primary goal |
|-------|--------------|---------------|
| Developer | Người viết hook/hàm thuần/Server Action hoặc common component | Biết chắc code logic mình viết có test co-located, đạt coverage yêu cầu, và component chung mình viết có nơi xem trước cách dùng |
| Reviewer | Người review Pull Request, hoặc người bảo trì codebase sau này | Tin được CI xanh nghĩa là logic layer đã test đầy đủ, và xem UI của common component/route chính qua Storybook mà không cần dựng lại toàn bộ app hay tài khoản Google thật |

## 2. Functional Capabilities

| ID | Capability | What the user can do | User Stories | Requirements | Business Rules | Screens |
|----|------------|------------------------|-----------------|---------------|-------------------|---------|
| CAP-01 | Kiểm thử tự động cho logic layer | Viết hook/hàm thuần/Server Action kèm unit test co-located ngay cạnh; CI tự chặn merge nếu coverage của toàn bộ logic layer chưa đạt 100% | US001 | FR-001, FR-002 | BR-001 | — |
| CAP-02 | Lớp mock API dùng chung | Chạy unit test hoặc mở Storybook mà không cần một Supabase instance thật đang sống — cả 2 runtime cùng đọc từ một module handler MSW duy nhất | US002 | FR-003 | BR-003 | — |
| CAP-03 | Tài liệu sống cho common component & route chính | Mở Storybook, thấy từng common component với đúng props/variant chính, và thấy UI của từng route chính mà không cần đăng nhập hay chạy dev server | US003, US004 | FR-004, FR-005 | BR-002 | — |

## 3. Open Decisions

None — no unresolved domain confirmations.

## 4. Requirements

### Foundation (0xx)

- **FR-001** Mọi file thuộc logic layer (hook, hàm thuần, Server Action, Route Handler nằm trong
  danh sách chỉ định) phải có kèm một file unit test co-located ngay cạnh nó.
- **FR-002** Coverage của toàn bộ danh sách file thuộc FR-001 phải đạt 100% (statements/
  branches/functions/lines); CI chặn merge nếu bất kỳ file hoặc nhánh nào trong danh sách chưa đạt.
- **FR-003** Một module mock API (MSW) dùng chung duy nhất phải được cả runtime Node (unit test)
  và runtime trình duyệt (Storybook) cùng import — không được định nghĩa 2 bộ handler trùng lặp
  cho cùng một endpoint.
- **FR-004** Mỗi common component (theo ranh giới BR-002) phải có một file story Storybook
  co-located, thể hiện được props/variant chính của nó.
- **FR-005** Mỗi route chính đang render UI trình bày thật (hiện tại: màn Đăng nhập, màn Todo)
  phải có đúng một Storybook story xem được, dựng từ component trình bày của route đó.

## 5. Business Rules

- Component UI thuần (nhận props, render JSX, không giữ logic nghiệp vụ) được miễn yêu cầu unit
  test co-located — hành vi của chúng do Playwright E2E phủ, không phải vitest (BR-001)
- Component được tính "common" khi nhận toàn bộ dữ liệu qua props, không import copy/dữ liệu đặc
  thù tính năng hay từ `app/`, và không lắp ghép ≥2 component khác đã đặt tên — thiếu 1 điều kiện
  thì tính là composition, không bắt buộc có story (BR-002)
- MSW chỉ chặn được lệnh gọi mạng thật nên chỉ có tác dụng ở runtime chạy unit test; hành động
  chuyển hướng đăng nhập Google là redirect top-level của trình duyệt nên MSW không chặn được —
  story mô phỏng việc bấm nút đăng nhập qua callback giả lập, không qua MSW (BR-003)

## 6. Screens

N/A — background feature; no user-facing screens.

## 7. User Stories

### US001_CoLocatedCoverage — Kiểm thử co-located & coverage 100%

**Actor:** Developer
**Goal:** Viết hook/hàm thuần/Server Action kèm test co-located và biết chắc coverage đạt 100%
trước khi merge.
**Business value:** Lỗi logic được bắt sớm ngay ở unit test, không phải khi lên production hay
phải chờ bộ E2E chạy chậm hơn nhiều.

**Acceptance Criteria:**
- [ ] File mới thuộc logic layer không có test co-located làm CI fail ở bước unit test.
- [ ] Coverage của danh sách file thuộc logic layer dưới 100% làm CI fail, kể cả khi mọi test đều
      pass.

### US002_SharedMswMocks — Mock API dùng chung qua MSW

**Actor:** Developer
**Goal:** Chạy unit test và Storybook mà không cần một Supabase instance thật đang sống.
**Business value:** Test chạy nhanh, không flaky vì mạng hay rate-limit, và không phải nuôi 2 bộ
mock riêng cho 2 runtime khác nhau.

**Acceptance Criteria:**
- [ ] Một unit test mock được lời gọi xác thực (đổi mã lấy phiên, lấy thông tin người dùng, đăng
      xuất) qua cùng một module handler dùng chung.
- [ ] Sửa một handler trong module dùng chung thì cả unit test lẫn Storybook đều thấy thay đổi,
      không phải sửa 2 nơi.

### US003_CommonComponentStory — Story cho common component

**Actor:** Developer
**Goal:** Mở Storybook và thấy từng common component với props/variant chính của nó.
**Business value:** Hiểu cách dùng một component chung mà không cần đọc hết code hoặc hỏi lại tác
giả.

**Acceptance Criteria:**
- [ ] Mỗi component đạt ranh giới "common" có một story hiển thị được trong Storybook.
- [ ] Story thể hiện được ít nhất biến thể chính của component (ví dụ trạng thái đang xử lý/vô
      hiệu hoá của một nút bấm).

### US004_MainRouteStory — Story cho route chính

**Actor:** Reviewer
**Goal:** Xem UI của một route chính trong Storybook mà không cần đăng nhập hay chạy dev server.
**Business value:** Review UI nhanh hơn, không phụ thuộc tài khoản Google thật hay một Supabase
instance đang chạy.

**Acceptance Criteria:**
- [ ] Mỗi route chính đang có UI trình bày thật có đúng 1 story dựng từ component trình bày của
      route đó.
- [ ] Route chưa có component trình bày riêng phải được tách ra trước khi có story — không viết
      story trực tiếp trên một trang render phía server bất đồng bộ.

## 8. Scenarios

### US001_CoLocatedCoverage — Happy Path

**Given** một Pull Request thêm 1 file logic layer mới kèm test co-located phủ hết nhánh, **When**
CI chạy bước unit test, **Then** build tiếp tục bình thường (test pass, coverage vẫn ở 100%).

### US001_CoLocatedCoverage — Error: Thiếu test co-located

**Given** một Pull Request thêm 1 file logic layer mới nhưng không kèm test, **When** CI chạy bước
unit test kèm coverage, **Then** build fail vì file mới kéo coverage xuống dưới 100%.

### US002_SharedMswMocks — Happy Path

**Given** một unit test gọi hàm đổi mã xác thực lấy phiên đăng nhập, **When** test chạy, **Then**
handler MSW dùng chung trả về kết quả giả lập thành công mà không có request nào ra mạng thật.

### US002_SharedMswMocks — Error: Xác thực thất bại

**Given** handler MSW dùng chung được cấu hình trả lỗi xác thực, **When** test chạy nhánh lỗi,
**Then** code xử lý đúng nhánh lỗi mà không cần một Supabase instance thật.

### US003_CommonComponentStory — Happy Path

**Given** một common component có file story co-located, **When** mở Storybook, **Then** thấy
được cả trạng thái bình thường lẫn trạng thái đang xử lý của component mà không cần chạy cả app.

### US003_CommonComponentStory — Error: Thiếu story

**Given** một common component mới không kèm file story, **When** review Pull Request, **Then**
reviewer từ chối vì thiếu story bắt buộc (FR-004) — đây là kiểm tra thủ công khi review, xem thêm
Gaps for Clarification #1 về mức độ tự động hoá.

### US004_MainRouteStory — Happy Path

**Given** route Đăng nhập đã có component trình bày nhận toàn bộ dữ liệu qua props, **When** thêm
story co-located cho component đó, **Then** Storybook hiển thị đúng giao diện route mà không cần
đăng nhập Google thật.

### US004_MainRouteStory — Error: Route chưa có component trình bày

**Given** route Todo chưa tách component trình bày khỏi trang render phía server, **When** cố viết
story trực tiếp cho trang đó, **Then** Storybook không render được — phải tách component trình bày
ra trước.

## 9. Edge Cases

| Scenario | What Happens | User-Facing Message |
|----------|--------------|----------------------|
| Một Pull Request thêm file logic layer mới nhưng thiếu test co-located hoặc chưa đạt 100% coverage | CI fail ở bước unit test, chặn merge | "Coverage chưa đạt ngưỡng bắt buộc — xem log CI để biết file/nhánh còn thiếu" |
| Một component vừa lắp ghép ≥2 component khác vừa nhận toàn bộ dữ liệu qua props | Tính là composition (đã lắp ghép ≥2 component đặt tên), không bắt buộc story dù mọi điều kiện khác đều thoả | "None — silent handling" |
| Một route mới chỉ chuyển hướng, không render UI nào của riêng nó | Không bắt buộc story cho route này — chuẩn chỉ áp dụng route có UI trình bày thật | "None — silent handling" |
| Hai handler mock API dùng chung được viết trùng cho cùng một endpoint | Handler đăng ký sau ghi đè handler trước, không có cảnh báo trùng lặp nào | "None — silent handling" |

## 10. Edge Behaviours to Verify

- **FR-001** → Tester xác nhận một Pull Request thêm file logic layer mới mà thiếu test co-located
  sẽ bị CI chặn.
- **FR-002** → Tester xác nhận coverage tụt dưới 100% ở bất kỳ file/nhánh nào trong logic layer sẽ
  làm CI fail.
- **FR-003** → Tester xác nhận cả unit test lẫn Storybook đều dùng chung một module mock API, chạy
  test/mở Storybook mà không cần một Supabase instance thật.
- **FR-004** → Tester xác nhận mỗi common component mở được story riêng trong Storybook, thấy đúng
  props/variant chính.
- **FR-005** → Tester xác nhận mỗi route chính có đúng 1 story xem được mà không cần đăng nhập.

## 11. Risks & Known Issues

| ID | Type | Description | Impact | Status |
|----|------|--------------|--------|--------|
| RISK-01 | risk | Storybook, framework Next.js đi kèm, và addon MSW-Storybook đều là bản rất mới, gần như phát hành đồng thời — nhiều khả năng gặp vấn đề chưa được tài liệu chính thức ghi nhận | Có thể phát sinh thời gian debug ngoài dự kiến khi cài đặt/nâng cấp, không phải một lỗi đã xảy ra | [UNVERIFIED] |

## 12. Dependencies

| Dependency | Type | Why this feature needs it | Evidence |
|------------|------|-----------------------------|----------|
| Quy tắc tách hook/logic khỏi component (đã áp dụng trong dự án) | infrastructure | Coverage 100% chỉ khả thi vì logic đã được đẩy xuống lớp thuần/hook từ trước — chuẩn này build on quy tắc đó, không định nghĩa lại ranh giới 3 lớp | FR-001, FR-002 |
| next-intl (thư viện dịch, phiên bản 4.14.2) | infrastructure | Story Storybook cho route Đăng nhập cần decorator hiển thị đúng nội dung tiếng Việt mặc định | FR-005 |
| Thư viện kết nối Supabase (`@supabase/ssr`) | infrastructure | Ba lớp kết nối Supabase cần được mock đúng theo export của thư viện này để đạt coverage 100% | FR-002 |
| F001_GoogleOAuthLogin, F002_LanguageSwitch | feature | Cả 2 feature này là nguồn logic/component đầu tiên phải tuân theo chuẩn này (hook, action, common component hiện có đều thuộc 2 feature đó) | BR-001, BR-002 |

## 13. Configuration

N/A — no user-facing configuration constants for this feature.
