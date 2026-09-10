# Risk gate — nội dung reviewer viết ngoài schema

`inspection-verdict.json` chỉ nhận 3 key trong `riskGate`:
`touchesSensitiveArea`, `signoffRequired`, `humanSignedOff`. Reviewer tự nghĩ ra 6 key
khác nên hard gate từ chối. Tôi viết lại đúng schema, **không đổi phán quyết**
(`signoffRequired: true`, `humanSignedOff: false`), và giữ lại nội dung ở đây.

---

riskGate rewritten by the orchestrator to the 3 keys the gate's schema allows (touchesSensitiveArea/signoffRequired/humanSignedOff); the reviewer had invented 6 non-schema keys and the hard gate rejected them. No judgement was changed: signoffRequired stays true and humanSignedOff stays false, so the gate correctly blocks an autonomous finalize until a human reviews the privacy-boundary change.

---

Privacy-boundary summary (was riskGate.privacyBoundaryChangeSummary): 0015 deliberately makes 'who opened a Secret Box, when, and which badge' (id/full_name/avatar_url/badge_key/opened_at, top 10 by recency) readable by anon+authenticated on the public /kudos page via a SECURITY DEFINER view, while leaving secret_box_openings' own own-row RLS (0011) completely untouched underneath it. Verified column list excludes email/role/locale/created_at/updated_at (the forbidden set the view's own COMMENT names). Verified security_invoker stays false (explicit, matches 0005/0006/0009's existing posture for this same public screen) and REVOKE ALL + GRANT SELECT anon,authenticated matches the sibling views' grant shape. 0016's is_own is a boolean-only comparison (k.sender_id = auth.uid()) against the unmasked base column, never re-exposing the real sender_id value that 0009 masks for anonymous kudos; NULL for anon (auth.uid() NULL) is handled correctly by the UI as 'not mine'. LIMIT 10 is documented in-file as a display constraint, not a security boundary, matching the request's specific concern.

---

Production-doc gap (was riskGate.productionDocGap): docs/vi/system/permissions.md:408-414 was not updated to match 0015's reversal (see Medium finding above) — the change itself is sound and well-verified in the migration files, but the canonical security doc is now stale/wrong on this specific point.


---

## Chữ ký người — 2026-09-10

`riskGate.humanSignedOff` chuyển `false → true`.

**Ai ký:** dang.xuan.thang, trả lời trực tiếp trong phiên qua `AskUserQuestion`.
**Câu hỏi đã đặt:** migration `0015` làm "ai đã mở hộp quà, lúc nào, badge nào" thành công
khai cho cả khách chưa đăng nhập, đảo quyết định đã ghi ở `docs/vi/system/permissions.md:408-414`.
**Ba lựa chọn đưa ra:** (1) ký và mở PR · (2) bỏ Top-10 khỏi PR, giữ 11 phase còn lại ·
(3) push branch, chưa mở PR.
**Đã chọn:** (1) — ký, mở PR.

Orchestrator KHÔNG tự set cờ này. Trước khi hỏi, hard gate chặn đúng ở một điểm này và
không điểm nào khác; tôi để nó chặn thay vì lách.

Điều gì được nới, nói lại cho rõ ràng trên bản ghi: view `public.recent_gift_recipients`
phơi `id, full_name, avatar_url, badge_key, opened_at` của 10 lượt mở hộp gần nhất cho
`anon` + `authenticated`. Không có `email`/`role`/`locale`/`created_at`/`updated_at`.
RLS own-row của `secret_box_openings` (`0011`) giữ nguyên — view là đường đọc thứ hai,
hẹp hơn, không nới policy bảng gốc. `LIMIT 10` là ràng buộc hiển thị, KHÔNG phải tường
bảo mật: ai query view trực tiếp vẫn thấy 10 lượt mở gần nhất của toàn hệ thống.
