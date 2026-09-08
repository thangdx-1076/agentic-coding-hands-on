---
phase: 02
feature: F009
track: B
status: completed
priority: P2
test_policy: e2e-red-first
effort: 1.5h
owner: implementer
file_ownership:
  [
    "messages/vi.json",
    "messages/en.json",
    "src/app/(public)/kudos/_shared/kudos-compose-copy.ts",
    "src/app/(public)/kudos/_utils/insert-markdown-marker.ts",
    "src/app/(public)/kudos/_utils/insert-markdown-marker.test.ts",
    "src/app/(public)/kudos/_utils/validate-link-draft.ts",
    "src/app/(public)/kudos/_utils/validate-link-draft.test.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-link-dialog.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-link-dialog.test.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-compose-content.ts",
    "src/app/(public)/kudos/_hooks/use-kudos-compose-content.test.ts",
  ]
---

# Phase 02 — Track B: validate + marker + copy + hook thuần

Ref: Addlink Box https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/OyDLDuSGEa · `clarifications.md` · `e2e-red-first`. Hợp đồng: `tests/e2e/kudos-link-dialog.spec.ts` (read-only).

1. **`insert-markdown-marker.ts`**: `insertMarkdownMarker`/`insertLink` +tham số 6 `linkText?`. Có giá trị → thay `[start,end)` bằng `[linkText](url)`, caret collapsed sau `)`. Không có → giữ hành vi cũ. Test case mới + case cũ xanh nguyên.
2. **`use-kudos-compose-content.ts`**: `applyFormat` (dòng 21-25 type, 55-73 impl) +tham số 4 `linkText?`, truyền thẳng vào `insertMarkdownMarker`. 5 kind cũ không đổi hành vi. +1 test case.
3. **`validate-link-draft.ts`** (mới): `validateLinkDraft({text,url}) => {text?,url?}`. Text: trim rỗng→`errorRequired`; >100 ký tự (đếm bản gốc)→`errorTextTooLong`. URL: trim <5 hoặc >2048→`errorUrlLength`; `new URL()` throw hoặc protocol∉{http:,https:}→`errorUrlInvalid` (test rõ `javascript:` phải lỗi). Test phủ mọi biên.
4. **`kudos-compose-copy.ts`**: thêm `linkDialog: {title,textLabel,urlLabel,cancel,save,errorTextTooLong,errorUrlInvalid,errorUrlLength}` (type + default), dùng lại `errorRequired` cho rỗng.
5. **`messages/{vi,en}.json`**: `kudos.composeModal.linkDialog.*` parity 8 key, nguyên văn theo clarifications.md § "Copy lỗi và namespace".
6. **`use-kudos-link-dialog.ts`** (mới): state `{text,url,errors}` + `selectionRef` (useRef). `registerDialog`/`onCancel` như `use-kudos-compose-dialog.ts`. `open(textarea)` snapshot selection + prefill text từ selection (rỗng nếu không chọn), `showModal()`. `setText`/`setUrl` xoá lỗi field đó. `onUrlBlur()` validate riêng URL. `save()` → `validateLinkDraft`; lỗi→giữ mở; hợp lệ→trả `{text,url,selection}`, `close()`, reset. `cancel()`/`close()` reset không insert.

Coverage 100% mọi file trên (`pnpm exec vitest run <path>` từng file). File <200 dòng.

## Delivered

✓ All 6 hooks, utilities, and i18n messages complete. `insert-markdown-marker.ts` supports optional `linkText`; `validate-link-draft.ts` validates text (1-100) and URL (http/https, 5-2048); `use-kudos-link-dialog.ts` manages dialog state with selection snapshot. **Proof:** `pnpm test:unit:coverage` exit 0, 534/534 green, 100% coverage all modules. No deviations from spec.

## Next
Song song phase 03. Phase 04 tiêu thụ `useKudosLinkDialog`, `applyFormat(...,linkText)`, `copy.linkDialog`.
