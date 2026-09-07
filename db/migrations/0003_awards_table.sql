-- 0003_awards_table.sql
--
-- Read-only award-category content for the public `/awards` page
-- (F004_AwardSystemPage, MoMorph screen zFYDgyj_pD).
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Differs from 0001_users_table.sql on purpose:
--   * `/awards` is a PUBLIC page, so SELECT is granted to `anon` as well as
--     `authenticated` — an anonymous visitor is the one rendering it.
--   * No owner column, so the policy is `USING (true)` rather than
--     `auth.uid() = id`.
--   * No INSERT/UPDATE/DELETE policy at all — default-deny is the whole
--     mutation story for a content table.

CREATE TABLE IF NOT EXISTS public.awards (
    slug            text         NOT NULL,
    locale          text         NOT NULL CHECK (locale IN ('vi', 'en')),
    sort_order      smallint     NOT NULL,
    title           text         NOT NULL,
    description     text         NOT NULL,
    quantity_value  text         NOT NULL,
    quantity_unit   text         NOT NULL,
    prize_values    jsonb        NOT NULL,
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (slug, locale)
);

COMMENT ON TABLE public.awards IS
  'Read-only SAA award category content for /awards (F004_AwardSystemPage), one row per (slug, locale).';
COMMENT ON COLUMN public.awards.quantity_value IS
  'Text, not a number: leading zeros are content ("02", "01") and are asserted verbatim by the E2E suite.';
COMMENT ON COLUMN public.awards.prize_values IS
  'Array of {amount: string, note: string}. Signature 2025 has 2 entries, the other 5 have 1. Empty note means the design shows no caption under the amount.';

ALTER TABLE public.awards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.awards FORCE  ROW LEVEL SECURITY;

-- Dropped first because CREATE POLICY has no IF NOT EXISTS: without this the
-- whole file stops being re-runnable, and re-running the directory is exactly
-- how `pnpm db:migrate` works.
DROP POLICY IF EXISTS awards_select_all ON public.awards;

CREATE POLICY awards_select_all ON public.awards
    FOR SELECT TO anon, authenticated
    USING (true);

-- RLS is not sufficient on its own: a role with no table GRANT still gets
-- "permission denied" from PostgREST. `anon` has never been confirmed to hold
-- a default SELECT on this instance's `public` schema, so grant it explicitly.
GRANT SELECT ON public.awards TO anon, authenticated;

-- Seed (locale 'vi' only — the MoMorph source is Vietnamese; no EN copy exists
-- and inventing a translation is out of scope). Text is verbatim from the
-- design: en dashes, curly quotes and the `*` in "Sun*" are all intentional.
INSERT INTO public.awards
    (slug, locale, sort_order, title, description, quantity_value, quantity_unit, prize_values)
VALUES
    (
        'top-talent', 'vi', 1, 'Top Talent',
        $desc$Giải thưởng Top Talent vinh danh những cá nhân xuất sắc toàn diện – những người không ngừng khẳng định năng lực chuyên môn vững vàng, hiệu suất công việc vượt trội, luôn mang lại giá trị vượt kỳ vọng, được đánh giá cao bởi khách hàng và đồng đội. Với tinh thần sẵn sàng nhận mọi nhiệm vụ tổ chức giao phó, họ luôn là nguồn cảm hứng, thúc đẩy động lực và tạo ảnh hưởng tích cực đến cả tập thể.$desc$,
        '10', 'Cá nhân',
        '[{"amount": "7.000.000 VNĐ", "note": "cho mỗi giải thưởng"}]'::jsonb
    ),
    (
        'top-project', 'vi', 2, 'Top Project',
        $desc$Giải thưởng Top Project vinh danh các tập thể dự án xuất sắc với kết quả kinh doanh vượt kỳ vọng, hiệu quả vận hành tối ưu và tinh thần làm việc tận tâm. Đây là các dự án có độ phức tạp kỹ thuật cao, hiệu quả tối ưu hóa nguồn lực và chi phí tốt, đề xuất các ý tưởng có giá trị cho khách hàng, đem lại lợi nhuận vượt trội và nhận được phản hồi tích cực từ khách hàng. Các thành viên tuân thủ nghiêm ngặt các tiêu chuẩn phát triển nội bộ trong phát triển dự án, tạo nên một hình mẫu về sự xuất sắc và chuyên nghiệp.$desc$,
        '02', 'Tập thể',
        '[{"amount": "15.000.000 VNĐ", "note": "cho mỗi giải thưởng"}]'::jsonb
    ),
    (
        'top-project-leader', 'vi', 3, 'Top Project Leader',
        $desc$Giải thưởng Top Project Leader vinh danh những nhà quản lý dự án xuất sắc – những người hội tụ năng lực quản lý vững vàng, khả năng truyền cảm hứng mạnh mẽ, và tư duy “Aim High – Be Agile” trong mọi bài toán và bối cảnh. Dưới sự dẫn dắt của họ, các thành viên không chỉ cùng nhau vượt qua thử thách và đạt được mục tiêu đề ra, mà còn giữ vững ngọn lửa nhiệt huyết, tinh thần Wasshoi, và trưởng thành để trở thành phiên bản tinh hoa – hạnh phúc hơn của chính mình.$desc$,
        '03', 'Cá nhân',
        '[{"amount": "7.000.000 VNĐ", "note": "cho mỗi giải thưởng"}]'::jsonb
    ),
    (
        'best-manager', 'vi', 4, 'Best Manager',
        $desc$Giải thưởng Best Manager vinh danh những nhà lãnh đạo tiêu biểu – người đã dẫn dắt đội ngũ của mình tạo ra kết quả vượt kỳ vọng, tác động nổi bật đến hiệu quả kinh doanh và sự phát triển bền vững của tổ chức. Dưới sự lãnh đạo của họ, đội ngũ luôn chinh phục và làm chủ mọi mục tiêu bằng năng lực đa nhiệm, khả năng phối hợp hiệu quả, và tư duy ứng dụng công nghệ linh hoạt trong kỷ nguyên số. Họ truyền cảm hứng để tập thể trở nên tự tin tràn đầy năng lượng, sẵn sàng đón nhận, thậm chí dẫn dắt tạo ra những thay đổi có tính cách mạng.$desc$,
        '01', 'Cá nhân',
        '[{"amount": "10.000.000 VNĐ", "note": ""}]'::jsonb
    ),
    (
        'signature-2025-creator', 'vi', 5, 'Signature 2025 - Creator',
        $desc$Giải thưởng Signature vinh danh cá nhân hoặc tập thể thể hiện tinh thần đặc trưng mà Sun* hướng tới trong từng thời kỳ.

Trong năm 2025, giải thưởng Signature vinh danh Creator - cá nhân/tập thể mang tư duy chủ động và nhạy bén, luôn nhìn thấy cơ hội trong thách thức và tiên phong trong hành động. Họ là những người nhạy bén với vấn đề, nhanh chóng nhận diện và đưa ra những giải pháp thực tiễn, mang lại giá trị rõ rệt cho dự án, khách hàng hoặc tổ chức. Với tư duy kiến tạo và tinh thần “Creator” đặc trưng của Sun*, họ không chỉ phản ứng tích cực trước sự thay đổi mà còn chủ động tạo ra cải tiến, góp phần định hình chuẩn mực mới cho cách mà người Sun* tạo giá trị.$desc$,
        '01', 'Cá nhân hoặc tập thể',
        '[{"amount": "5.000.000 VNĐ", "note": "cho giải cá nhân"}, {"amount": "8.000.000 VNĐ", "note": "cho giải tập thể"}]'::jsonb
    ),
    (
        'mvp', 'vi', 6, 'MVP (Most Valuable Person)',
        $desc$Giải thưởng MVP vinh danh cá nhân xuất sắc nhất năm – gương mặt tiêu biểu đại diện cho toàn bộ tập thể Sun*. Họ là người đã thể hiện năng lực vượt trội, tinh thần cống hiến bền bỉ, và tầm ảnh hưởng sâu rộng, để lại dấu ấn mạnh mẽ trong hành trình của Sun* suốt năm qua.

Không chỉ nổi bật bởi hiệu suất và kết quả công việc, họ còn là nguồn cảm hứng lan tỏa – thông qua suy nghĩ, hành động và ảnh hưởng tích cực của mình đối với tập thể. MVP là người hội tụ đầy đủ phẩm chất của người Sun* ưu tú, đồng thời mang trên mình trọng trách lớn lao: trở thành hình mẫu đại diện cho con người và tinh thần Sun*, góp phần dẫn dắt tập thể vươn tới những đỉnh cao mới.$desc$,
        '01', 'Cá nhân',
        '[{"amount": "15.000.000 VNĐ", "note": ""}]'::jsonb
    )
ON CONFLICT (slug, locale) DO NOTHING;
