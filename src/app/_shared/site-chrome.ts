/**
 * Presentational copy contract for the site chrome shared across every
 * `(public)` route — `SiteHeader`, `SiteFooter`, `KudosSection`,
 * `AccountMenu`, `NotificationBell` (mm:2167:9091 `mms_A1_Header`,
 * mm:5001:14800 `mms_7_Footer`, mm:3390:10349 `mms_D1_Sunkudos` —
 * https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM).
 * Promoted out of `(home)/_shared/home-copy.ts` (phase-02) because these
 * components now also render on `/awards` — a route segment must never
 * import another segment's `_shared` types. `home-copy.ts`'s `HomeCopy`
 * composes this type with the leaves only the Homepage itself needs
 * (`hero`, `event`, `cta`, `rootFurther`, `awards`, `widget`).
 */
export type SiteChromeCopy = {
  nav: {
    about: string;
    awardsInfo: string;
    kudos: string;
  };
  header: {
    logoAlt: string;
    languageLabel: "VN" | "EN";
    loginLabel: string;
    notificationsLabel: string;
    accountLabel: string;
  };
  kudos: {
    label: string;
    heading: string;
    description: string;
    detailLabel: string;
  };
  footer: {
    standards: string;
    copyright: string;
  };
  account: {
    profile: string;
    admin: string;
    logout: string;
  };
  /**
   * Panel copy for `NotificationBell`/`NotificationPanel` (phase 08).
   * `types` carries the 4 raw, un-interpolated message templates keyed by
   * `NotificationType` (`src/domain/notifications/types.ts`) — `{senderName}`/
   * `{actorName}` placeholders and the `kudos_hidden` `<link>` tag are
   * resolved per-notification by the panel item, not here (see
   * `get-notifications-copy.ts`'s doc comment for why this shared copy
   * build can't call next-intl's own interpolation for these leaves).
   */
  notifications: {
    empty: string;
    title: string;
    markAllRead: string;
    loadMore: string;
    types: {
      kudos_received: string;
      heart_received: string;
      secret_box_available: string;
      kudos_hidden: string;
    };
  };
};

export const defaultSiteChromeCopy: SiteChromeCopy = {
  nav: {
    about: "About SAA 2025",
    // The Figma layer name uses the singular form of this label; spec
    // A1.3/7.3 + TC ID-21/23 win as content acceptance (clarifications.md
    // § Header) — plural, per the value below.
    awardsInfo: "Awards Information",
    kudos: "Sun* Kudos",
  },
  header: {
    logoAlt: "Sun* Annual Awards 2025",
    languageLabel: "VN",
    loginLabel: "Đăng nhập",
    notificationsLabel: "Thông báo",
    accountLabel: "Tài khoản",
  },
  kudos: {
    label: "Phong trào ghi nhận",
    heading: "Sun* Kudos",
    description:
      "ĐIỂM MỚI CỦA SAA 2025\nHoạt động ghi nhận và cảm ơn đồng nghiệp - lần đầu tiên được diễn ra dành cho tất cả Sunner. Hoạt động sẽ được triển khai vào tháng 11/2025, khuyến khích người Sun* chia sẻ những lời ghi nhận, cảm ơn đồng nghiệp trên hệ thống do BTC công bố. Đây sẽ là chất liệu để Hội đồng Heads tham khảo trong quá trình lựa chọn người đạt giải.",
    detailLabel: "Chi tiết",
  },
  footer: {
    standards: "Tiêu chuẩn chung",
    copyright: "Bản quyền thuộc về Sun* © 2025",
  },
  account: {
    profile: "Hồ sơ",
    admin: "Trang quản trị",
    logout: "Đăng xuất",
  },
  notifications: {
    empty: "Bạn chưa có thông báo",
    title: "Thông báo",
    markAllRead: "Đánh dấu đọc tất cả",
    loadMore: "Xem thêm",
    types: {
      kudos_received: "**{senderName}** đã gửi Kudos cho bạn",
      heart_received: "**{actorName}** đã thả tim Kudos của bạn",
      secret_box_available: "Bạn có một Hộp bí mật mới, mở ngay nhé!",
      kudos_hidden:
        "Kudos của bạn đã bị ẩn do vi phạm <link>Tiêu chuẩn cộng đồng ↗</link>",
    },
  },
};

/**
 * Signed-in viewer shape the header/account-menu render against. Renamed
 * from `HeaderViewer` (`(home)/_components/header.tsx`) now that the
 * component that owned it has promoted out of `(home)` — a promoted
 * component must not keep its type named after the segment it left.
 */
export type SiteViewer = {
  email: string;
  isAdmin: boolean;
  /**
   * Required, not optional (phase-07 Key Insight 1,
   * `plans/260909-0239-notifications-panel/phase-07-wire-unread-count-and-copy.md`):
   * the only 2 places that PRODUCE a `SiteViewer` (`get-viewer.ts`,
   * `(protected)/profile/page.tsx`) must both supply a real count, or the
   * omission is a compile error — never a silent `0` badge like before this
   * field existed.
   */
  unreadCount: number;
};
