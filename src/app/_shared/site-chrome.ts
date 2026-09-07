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
  notifications: {
    empty: string;
  };
};

export const defaultSiteChromeCopy: SiteChromeCopy = {
  nav: {
    about: "About SAA 2025",
    // Design says "Award Information" (singular); spec A1.3/7.3 + TC ID-21/23
    // win as content acceptance (clarifications.md § Header).
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
};
