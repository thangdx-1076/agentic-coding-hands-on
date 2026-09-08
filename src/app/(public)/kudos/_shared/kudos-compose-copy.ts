/**
 * Presentational copy contract for the Kudos Compose dialog
 * (mm:I520:11647 "Viết Kudo",
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/ihQ26W78P2).
 *
 * Scoped to only the strings the dialog itself renders — like
 * `kudos-copy.ts`, this does NOT compose `SiteChromeCopy`: the dialog never
 * renders header/footer chrome. Real values come from
 * `messages/{vi,en}.json`'s `kudos.composeModal.*` namespace via phase 13's
 * `build-kudos-copy.ts`; `defaultKudosComposeCopy` below is the static
 * fallback Storybook and each field component's own tests use, never
 * fetched or computed here (clarifications.md § "Copy đặt ở đâu" — i18n in
 * this repo is Server-Component-only, so client leaves never call
 * `useTranslations` and instead receive this shape as props).
 *
 * Every field is threaded to whichever of phases 08-12's components render
 * it; this file is intentionally the ONE place all 5 of those phases read
 * their copy shape from, so none of them has to edit a file it does not own.
 */
export type KudosComposeCopy = {
  /** mm:I520:11647;520:9870 (A) — dialog heading, "cám ơn" spelling verbatim. */
  title: string;
  /** mm:I520:11647;520:9872 (B.1) — "Người nhận" label (required, has `*`). */
  recipientLabel: string;
  /** mm:I520:11647;520:9873 (B.2) — search input placeholder "Tìm kiếm". */
  recipientPlaceholder: string;
  /**
   * No design node covers this state (clarifications.md § "Frame phụ trợ" —
   * the suggestion dropdown frames carry no node data). Invented per
   * `kudos-sidebar`'s `emptyBoard` tone; see
   * `reports/implementer-phase-03-decisions.md`.
   */
  recipientEmpty: string;
  /** Same no-data gap as `recipientEmpty` — see decisions report. */
  recipientLoading: string;
  /**
   * mm:I520:11647;1688:10448 (Frame 552, not in the spec CSV table —
   * clarifications.md § "Hai node có trong design nhưng KHÔNG có trong spec")
   * — "Danh hiệu" label, required (has `*`).
   */
  titleLabel: string;
  /** Same node as `titleLabel` — placeholder "Dành tặng một danh hiệu cho đồng đội". */
  titlePlaceholder: string;
  /** Same node as `titleLabel` — hint line 1 of 2. */
  titleHintExample: string;
  /** Same node as `titleLabel` — hint line 2 of 2. */
  titleHintUsage: string;
  /** mm:I520:11647;520:9886 (D) — "Nội dung" textarea label. */
  contentLabel: string;
  /** mm:I520:11647;520:9886 (D) — textarea placeholder. */
  contentPlaceholder: string;
  /** mm:I520:11647;520:9887 (D.1) — mention hint, curly quotes verbatim. */
  contentHint: string;
  /**
   * mm:I520:11647;3053:11619 (not in the spec CSV table —
   * clarifications.md § "Hai node có trong design nhưng KHÔNG có trong spec")
   * — "Tiêu chuẩn cộng đồng" link text, target `/standards`.
   */
  standardsLink: string;
  /**
   * mm:I520:11647;520:9881..520:9886 (C.1-C.6) — accessible names for the 6
   * format-toolbar buttons. The visible glyphs are icons/letters; these are
   * `aria-label` text derived from each item's own functional description.
   */
  toolbar: {
    bold: string;
    italic: string;
    strike: string;
    number: string;
    link: string;
    quote: string;
  };
  /** mm:I520:11647;520:9891 (E.1) — "Hashtag" label, kept English both locales. */
  hashtagLabel: string;
  /** mm:I520:11647;520:9890 (E) — "+ Hashtag" button, kept English both locales. */
  hashtagAdd: string;
  /** mm:I520:11647;520:9890 (E) / mm:I520:11647;520:9896 (F) — "Tối đa 5" note, shared by hashtag and image sections (same text both places). */
  limitNote: string;
  /** No design node (picker frame `p9zO-c4a4x` has no accessible-name data) — invented listbox `aria-label`, see decisions report. */
  hashtagPickerLabel: string;
  /** No design node — invented `aria-label` template for a chip's remove button, `{tag}` interpolated by the caller. */
  hashtagRemove: string;
  /** mm:I520:11647;520:9897 (F.1) — "Image" label, kept English both locales. */
  imageLabel: string;
  /** mm:I520:11647;662:9132 (F.5) — "+ Image" button, kept English both locales. */
  imageAdd: string;
  /** No design node — invented `aria-label` template for a thumbnail's remove button, `{index}` interpolated by the caller. */
  imageRemove: string;
  /** mm:I520:11647;520:14099 (G) — "Gửi lời cám ơn và ghi nhận ẩn danh" checkbox label. */
  anonymousLabel: string;
  /**
   * No design node (frame `p9vFVBE_tc` "Ẩn danh" carries no node data) — used
   * as BOTH the field's accessible label and its `placeholder`, mirroring
   * `kudos-hero-search-pill.tsx`'s label-doubles-as-placeholder pattern. See
   * `reports/implementer-phase-03-decisions.md`.
   */
  anonymousNameLabel: string;
  /** Same value as `anonymousNameLabel` — see that field's doc comment. */
  anonymousNamePlaceholder: string;
  /** mm:I520:11647;520:9906 (H.1) — "Hủy" button. */
  cancel: string;
  /** mm:I520:11647;520:9907 (H.2) — "Gửi" button. */
  submit: string;
  /** No literal design string (spec only says "show loading") — invented in-flight label for the Submit button. */
  submitting: string;
  /** functional-spec.md § 9 edge cases table, verbatim — generic per-field required-field message. */
  errorRequired: string;
  /** functional-spec.md § 9, verbatim — 6th hashtag blocked (FR-403). */
  errorHashtagMax: string;
  /**
   * Invalid file type / over 5 images (FR-404). NOT functional-spec.md § 9's
   * verbatim text — `tests/e2e/kudos-compose.spec.ts` C17 (ID-55) asserts
   * `/định dạng|format/` on this message, a substring the spec's original
   * "Chỉ nhận file .jpg hoặc .png, tối đa 5 ảnh." never contains. Reworded
   * to keep the spec's file-type/count guidance while satisfying the e2e
   * DOM contract — see `reports/implementer-phase-03-decisions.md`.
   */
  errorImageInvalid: string;
  /** functional-spec.md § 9, verbatim — generic "submit blocked" summary message. */
  errorFormIncomplete: string;
  /** functional-spec.md § 9, verbatim — shown when an unauthenticated request reaches the compose flow (FR-102/FR-601). */
  unauthenticatedHint: string;
};

export const defaultKudosComposeCopy: KudosComposeCopy = {
  title: "Gửi lời cám ơn và ghi nhận đến đồng đội",
  recipientLabel: "Người nhận",
  recipientPlaceholder: "Tìm kiếm",
  recipientEmpty: "Không tìm thấy Sunner phù hợp",
  recipientLoading: "Đang tìm kiếm…",
  titleLabel: "Danh hiệu",
  titlePlaceholder: "Dành tặng một danh hiệu cho đồng đội",
  titleHintExample: "Ví dụ: Người truyền động lực cho tôi.",
  titleHintUsage: "Danh hiệu sẽ hiển thị làm tiêu đề Kudos của bạn.",
  contentLabel: "Nội dung",
  contentPlaceholder:
    "Hãy gửi gắm lời cám ơn và ghi nhận đến đồng đội tại đây nhé!",
  contentHint: "Bạn có thể “@ + tên” để nhắc tới đồng nghiệp khác",
  standardsLink: "Tiêu chuẩn cộng đồng",
  toolbar: {
    bold: "In đậm",
    italic: "In nghiêng",
    strike: "Gạch ngang",
    number: "Đánh số",
    link: "Chèn liên kết",
    quote: "Trích dẫn",
  },
  hashtagLabel: "Hashtag",
  hashtagAdd: "+ Hashtag",
  limitNote: "Tối đa 5",
  hashtagPickerLabel: "Chọn hashtag",
  hashtagRemove: "Xóa hashtag {tag}",
  imageLabel: "Image",
  imageAdd: "+ Image",
  imageRemove: "Xóa ảnh {index}",
  anonymousLabel: "Gửi lời cám ơn và ghi nhận ẩn danh",
  anonymousNameLabel: "Tên ẩn danh",
  anonymousNamePlaceholder: "Tên ẩn danh",
  cancel: "Hủy",
  submit: "Gửi",
  submitting: "Đang gửi…",
  errorRequired: "Không được để trống.",
  errorHashtagMax: "Tối đa 5 hashtag.",
  errorImageInvalid:
    "Sai định dạng file — chỉ nhận .jpg hoặc .png, tối đa 5 ảnh.",
  errorFormIncomplete: "Vui lòng điền đầy đủ thông tin bắt buộc.",
  unauthenticatedHint: "Vui lòng đăng nhập để gửi Kudo.",
};
