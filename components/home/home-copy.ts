/**
 * Presentational copy contract for the Homepage screen
 * (mm:2167:9026 — https://momorph.ai/files/9ypp4enmFmdK3YAFJLIu6C/screens/i87tDx10uM).
 * `defaultHomeCopy` holds the exact `vi` strings from `momorph/texts.json`
 * (content acceptance overrides per `clarifications.md` where noted below) —
 * do not translate or edit these values here. Track B mirrors this exact leaf
 * path into `messages/{vi,en}.json` under `home.*` (see plan.md § Integration
 * contract) and supplies the localized `en` variant via next-intl.
 */
export type AwardItem = {
  slug: string;
  title: string;
  description: string;
  image: string;
};

export type HomeCopy = {
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
  hero: {
    heading: string;
    comingSoon: string;
    days: string;
    hours: string;
    minutes: string;
  };
  event: {
    timeLabel: string;
    timeValue: string;
    venueLabel: string;
    venueValue: string;
    liveNote: string;
  };
  cta: {
    aboutAwards: string;
    aboutKudos: string;
  };
  rootFurther: {
    heading: string;
    paragraphs: string[];
  };
  awards: {
    caption: string;
    heading: string;
    items: AwardItem[];
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
  widget: {
    label: string;
    kudosItem: string;
    awardsItem: string;
  };
};

export const defaultHomeCopy: HomeCopy = {
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
  hero: {
    heading: "ROOT FURTHER",
    // Design typo "Comming soon" fixed per clarifications.md § Header.
    comingSoon: "Coming soon",
    days: "DAYS",
    hours: "HOURS",
    minutes: "MINUTES",
  },
  event: {
    timeLabel: "Thời gian:",
    timeValue: "18h30",
    venueLabel: "Địa điểm:",
    venueValue: "Nhà hát nghệ thuật quân đội",
    liveNote: "Tường thuật trực tiếp tại Group Facebook Sun* Family",
  },
  cta: {
    aboutAwards: "ABOUT AWARDS",
    aboutKudos: "ABOUT KUDOS",
  },
  rootFurther: {
    heading: "ROOT FURTHER",
    paragraphs: [
      "Đứng trước bối cảnh thay đổi như vũ bão của thời đại AI và yêu cầu ngày càng cao từ khách hàng, Sun* lựa chọn chiến lược đa dạng hóa năng lực để không chỉ nỗ lực trở thành tinh anh trong lĩnh vực của mình, mà còn hướng đến một cái đích cao hơn, nơi mọi Sunner đều là “problem-solver” - chuyên gia trong việc giải quyết mọi vấn đề, tìm lời giải cho mọi bài toán của dự án, khách hàng và xã hội.\nLấy cảm hứng từ sự đa dạng năng lực, khả năng phát triển linh hoạt cùng tinh thần đào sâu để bứt phá trong kỷ nguyên AI, “Root Further” đã được chọn để trở thành chủ đề chính thức của Lễ trao giải Sun* Annual Awards 2025.\nVượt ra khỏi nét nghĩa bề mặt, “Root Further” chính là hành trình chúng ta không ngừng vươn xa hơn, cắm rễ mạnh hơn, chạm đến những tầng “địa chất” ẩn sâu để tiếp tục tồn tại, vươn lên và nuôi dưỡng đam mê kiến tạo giá trị luôn cháy bỏng của người Sun*. Mượn hình ảnh bộ rễ liên tục đâm sâu vào lòng đất, mạnh mẽ len lỏi qua từng lớp “trầm tích” để thẩm thấu những gì tinh tuý nhất, người Sun* cũng đang “hấp thụ” dưỡng chất từ thời đại và những thử thách của thị trường để làm mới mình mỗi ngày, mở rộng năng lực và mạnh mẽ “bén rễ” vào kỷ nguyên AI - một tầng “địa chất” hoàn toàn mới, phức tạp và khó đoán, nhưng cũng hội tụ vô vàn tiềm năng cùng cơ hội.",
      " “A tree with deep roots fears no storm”\n (Cây sâu bén rễ, bão giông chẳng nề - Ngạn ngữ Anh)",
      "Trước giông bão, chỉ những tán cây có bộ rễ đủ mạnh mới có thể trụ vững. Một tổ chức với những cá nhân tự tin vào năng lực đa dạng, sẵn sàng kiến tạo và đón nhận thử thách, làm chủ sự thay đổi là tổ chức không chỉ vững vàng trước biến động, mà còn khai thác được mọi lợi thế, chinh phục các thách thức của thời cuộc. Không đơn thuần là tên gọi của chương mới trên hành trình phát triển tổ chức, “Root Further” còn như một lời cổ vũ, động viên mỗi chúng ta hãy dám tin vào bản thân, dám đào sâu, khai mở mọi tiềm năng, dám phá bỏ giới hạn, dám trở thành phiên bản đa nhiệm và xuất sắc nhất của mình. Bởi trong thời đại AI, đa dạng năng lực và tận dụng sức mạnh thời cuộc chính là điều kiện tiên quyết để trường tồn.\nKhông ai biết trước ẩn sâu trong “lòng đất” của ngành công nghệ và thị trường hiện đại còn biết bao tầng “địa chất” bí ẩn. Chỉ biết rằng khi “Root Further” đã trở thành tinh thần cội rễ, chúng ta sẽ không sợ hãi, mà càng thấy háo hức trước bất cứ vùng vô định nào trên hành trình tiến về phía trước. Vì ta luôn tin rằng, trong chính những miền vô tận đó, là bao điều kỳ diệu và cơ hội vươn mình đang chờ ta.",
    ],
  },
  awards: {
    caption: "Sun* annual awards 2025",
    heading: "Hệ thống giải thưởng",
    items: [
      {
        slug: "top-talent",
        title: "Top Talent",
        // Node I2167:9075;214:1022 returns no `characters` — spec C2.1.3 text
        // used instead per clarifications.md § Header.
        description: "Vinh danh top cá nhân xuất sắc trên mọi phương diện",
        image: "/home/Award_BG.png",
      },
      {
        slug: "top-project",
        title: "Top Project",
        description:
          "Vinh danh dự án xuất sắc trên mọi phương diện, dự án có doanh thu nổi bật",
        image: "/home/Award_BG.png",
      },
      {
        slug: "top-project-leader",
        title: "Top Project Leader",
        description:
          "Vinh danh người quản lý truyền cảm hứng và dẫn dắt dự án bứt phá, ",
        image: "/home/Award_BG.png",
      },
      {
        slug: "best-manager",
        title: "Best Manager",
        // Figma reuses this same placeholder description for the next 3
        // cards verbatim — flagged as content debt in clarifications.md
        // § Unresolved, not fabricated here.
        description:
          "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
        image: "/home/Award_BG.png",
      },
      {
        slug: "signature-2025-creator",
        title: "Signature 2025 - Creator",
        description:
          "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
        image: "/home/Award_BG.png",
      },
      {
        slug: "mvp",
        title: "MVP (Most Valuable Person)",
        description:
          "Vinh danh người quản lý có năng lực quản lý tốt, dẫn dắt đội nhóm",
        image: "/home/Award_BG.png",
      },
    ],
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
  widget: {
    label: "Hành động nhanh",
    // Menu content inferred from the 2 widget icons — user override pending,
    // see clarifications.md § Widget button.
    kudosItem: "Sun* Kudos",
    awardsItem: "Awards Information",
  },
};
