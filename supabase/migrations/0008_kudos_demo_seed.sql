-- 0008_kudos_demo_seed.sql
--
-- Demo data for `/kudos` (F007_KudosLiveBoard, F008_KudosHeartReaction,
-- MoMorph screen MaZUn5xHXZ, frame `2940:13431`). 8 Sunner + 12 kudos +
-- kudo_hearts, enough for the Highlight carousel's top-5, the Hashtag/Phòng
-- ban filters, feed pagination past page 1, and the Spotlight total to all
-- be real data instead of empty states.
--
-- DO NOT run `supabase db reset` on this project. `auth.users` holds real
-- sign-ins; a reset drops and rebuilds the database and loses every one of
-- them. Apply this file with `supabase migration up` only.
--
-- Rollback (removes every row this file adds, cascades kudos/kudo_hearts):
--   DELETE FROM auth.users WHERE email LIKE '%@kudos-demo.saa';
--
-- Content provenance — full detail in
-- plans/260907-1725-kudos-live-board/evidence/seed-transcript.md:
--   * The 8 full names are copied verbatim from the frame's Spotlight
--     scatter (`mms_B.7_Spotlight`, 2940:14174 — 7 names) plus item D.3.2
--     (2940:13516 — "Huỳnh Dương Xuân"), per clarifications.md.
--   * `content`, the `IDOL GIỚI TRẺ` featured tag, the `Dedicated`/`Inspring`
--     hashtags (typo kept as-is), and the `10:00 - 10/30/2025` timestamp are
--     copied verbatim from the repeated card mock-up (`mms_C.3_KUDO Post`,
--     3127:21871). The mock-up's own sender/receiver placeholder names
--     ("Huỳnh Dương Xuân Nhật" / "Huỳnh Dương Xuân") are NOT used as seed
--     identities — they are the same two placeholder strings repeated on
--     every card instance, not 8 distinct people.
--   * `department` ships the frame's own example value `CEVC10` (spec item
--     C.3.3 literally calls it an example — "vd: CEVC10" — and item B.1.2
--     says the department list "sẽ được truy vấn từ cơ sở dữ liệu", i.e. this
--     is operational data, not fixed design copy) for 5 of 8 Sunner, plus
--     `CEVC20` for the remaining 3 so the Phòng ban filter has more than one
--     option to select — `CEVC20` matches the second department value
--     `src/dal/kudos.test.ts` already uses for the same reason.
--   * `heart_count` is never set directly — every count below comes from the
--     kudo_hearts rows this file inserts, read back by the `0007` trigger.
--   * Attachment image URLs have no readable source (the frame only embeds
--     pixels, no URLs) — C.3.6 coverage uses the repo's own real MoMorph
--     export instead of an invented URL: `public/kudos/sample-image.png`,
--     the 88x88 attachment thumbnail already downloaded from this screen
--     (`MM_MEDIA_Sample Image`, node `I3127:21871;256:5177;513:8436`) and
--     used as `/kudos/sample-image.png` elsewhere on this screen (e.g.
--     `kudos-card.stories.tsx`). Avatar URLs are left NULL rather than
--     invented — no equivalent real asset exists for those.
--
-- Seed identities (id / full name / department / email):
--   a0000000-0000-4000-8000-000000000001  Đỗ hoàng Hiệp       CEVC10  do-hoang-hiep@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000002  Dương thúy An       CEVC10  duong-thuy-an@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000003  Mai phương Thúy     CEVC10  mai-phuong-thuy@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000004  Lê Kiều Trang       CEVC10  le-kieu-trang@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000005  Nguyễn Văn Quy      CEVC10  nguyen-van-quy@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000006  Nguyễn Bá Chức      CEVC20  nguyen-ba-chuc@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000007  Nguyễn Hoàng Linh   CEVC20  nguyen-hoang-linh@kudos-demo.saa
--   a0000000-0000-4000-8000-000000000008  Huỳnh Dương Xuân    CEVC20  huynh-duong-xuan@kudos-demo.saa
--
-- These 8 accounts carry no `encrypted_password` and no `auth.identities`
-- row, so they can never sign in — they exist only as the owners of display
-- data on the public board (Security Considerations, phase-05 plan).

-- =============================================================================
-- Step 1 — auth.users. Fixed UUIDs + ON CONFLICT (id) DO NOTHING make this
-- idempotent; the `on_auth_user_created` trigger (migration 0002) mirrors
-- each row into public.users immediately after this statement commits.
-- =============================================================================

INSERT INTO auth.users (id, email, raw_user_meta_data)
VALUES
    ('a0000000-0000-4000-8000-000000000001', 'do-hoang-hiep@kudos-demo.saa', '{"full_name": "Đỗ hoàng Hiệp"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000002', 'duong-thuy-an@kudos-demo.saa', '{"full_name": "Dương thúy An"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000003', 'mai-phuong-thuy@kudos-demo.saa', '{"full_name": "Mai phương Thúy"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000004', 'le-kieu-trang@kudos-demo.saa', '{"full_name": "Lê Kiều Trang"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000005', 'nguyen-van-quy@kudos-demo.saa', '{"full_name": "Nguyễn Văn Quy"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000006', 'nguyen-ba-chuc@kudos-demo.saa', '{"full_name": "Nguyễn Bá Chức"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000007', 'nguyen-hoang-linh@kudos-demo.saa', '{"full_name": "Nguyễn Hoàng Linh"}'::jsonb),
    ('a0000000-0000-4000-8000-000000000008', 'huynh-duong-xuan@kudos-demo.saa', '{"full_name": "Huỳnh Dương Xuân"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Step 2 — backfill `department`. Runs after Step 1 so the trigger has
-- already created the public.users rows; handle_new_user (0002) has no
-- department column to write, so this UPDATE is the only writer. Re-running
-- sets the same values again — harmless, not a second INSERT.
-- =============================================================================

UPDATE public.users AS u
SET department = v.department
FROM (VALUES
    ('a0000000-0000-4000-8000-000000000001'::uuid, 'CEVC10'),
    ('a0000000-0000-4000-8000-000000000002'::uuid, 'CEVC10'),
    ('a0000000-0000-4000-8000-000000000003'::uuid, 'CEVC10'),
    ('a0000000-0000-4000-8000-000000000004'::uuid, 'CEVC10'),
    ('a0000000-0000-4000-8000-000000000005'::uuid, 'CEVC10'),
    ('a0000000-0000-4000-8000-000000000006'::uuid, 'CEVC20'),
    ('a0000000-0000-4000-8000-000000000007'::uuid, 'CEVC20'),
    ('a0000000-0000-4000-8000-000000000008'::uuid, 'CEVC20')
) AS v(id, department)
WHERE u.id = v.id;

-- =============================================================================
-- Step 3 — public.kudos. 12 rows (> FEED_PAGE_SIZE=10 in src/dal/kudos.ts so
-- the feed's keyset cursor has a second page to fetch, C18). `content`, the
-- featured tag, and the two hashtags are the frame's own repeated card copy
-- (evidence § 3–4); `created_at` is spread across distinct instants (not
-- restricted design content) so feed order/pagination is well-defined.
-- `heart_count` is left at its `0006` default — Step 4 populates it via the
-- `0007` trigger. Fixed UUIDs + ON CONFLICT (id) DO NOTHING make this
-- idempotent.
-- =============================================================================

INSERT INTO public.kudos (id, sender_id, receiver_id, content, hashtags, image_urls, created_at)
VALUES
    (
        'b0000000-0000-4000-8000-000000000001',
        'a0000000-0000-4000-8000-000000000001', -- Đỗ hoàng Hiệp
        'a0000000-0000-4000-8000-000000000002', -- Dương thúy An
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Dedicated', 'Inspring'],
        ARRAY['/kudos/sample-image.png', '/kudos/sample-image.png'],
        '2025-10-30 22:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000002',
        'a0000000-0000-4000-8000-000000000002', -- Dương thúy An
        'a0000000-0000-4000-8000-000000000003', -- Mai phương Thúy
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Dedicated'],
        '{}',
        '2025-10-30 19:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000003',
        'a0000000-0000-4000-8000-000000000003', -- Mai phương Thúy
        'a0000000-0000-4000-8000-000000000004', -- Lê Kiều Trang
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Inspring'],
        '{}',
        '2025-10-30 16:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000004',
        'a0000000-0000-4000-8000-000000000004', -- Lê Kiều Trang
        'a0000000-0000-4000-8000-000000000005', -- Nguyễn Văn Quy
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Dedicated', 'Inspring'],
        '{}',
        '2025-10-30 13:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000005',
        'a0000000-0000-4000-8000-000000000005', -- Nguyễn Văn Quy
        'a0000000-0000-4000-8000-000000000006', -- Nguyễn Bá Chức
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['Dedicated'],
        '{}',
        '2025-10-30 10:00:00+07'::timestamptz -- matches the literal design sample "10:00 - 10/30/2025"
    ),
    (
        'b0000000-0000-4000-8000-000000000006',
        'a0000000-0000-4000-8000-000000000006', -- Nguyễn Bá Chức
        'a0000000-0000-4000-8000-000000000007', -- Nguyễn Hoàng Linh
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['Inspring'],
        '{}',
        '2025-10-30 07:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000007',
        'a0000000-0000-4000-8000-000000000007', -- Nguyễn Hoàng Linh
        'a0000000-0000-4000-8000-000000000008', -- Huỳnh Dương Xuân
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Dedicated'],
        '{}',
        '2025-10-30 04:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000008',
        'a0000000-0000-4000-8000-000000000008', -- Huỳnh Dương Xuân
        'a0000000-0000-4000-8000-000000000001', -- Đỗ hoàng Hiệp
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ', 'Inspring'],
        '{}',
        '2025-10-30 01:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000009',
        'a0000000-0000-4000-8000-000000000001', -- Đỗ hoàng Hiệp
        'a0000000-0000-4000-8000-000000000003', -- Mai phương Thúy
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['Dedicated', 'Inspring'],
        '{}',
        '2025-10-29 22:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000010',
        'a0000000-0000-4000-8000-000000000002', -- Dương thúy An
        'a0000000-0000-4000-8000-000000000004', -- Lê Kiều Trang
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['IDOL GIỚI TRẺ'],
        '{}',
        '2025-10-29 19:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000011',
        'a0000000-0000-4000-8000-000000000003', -- Mai phương Thúy
        'a0000000-0000-4000-8000-000000000005', -- Nguyễn Văn Quy
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        ARRAY['Inspring'],
        '{}',
        '2025-10-29 16:00:00+07'::timestamptz
    ),
    (
        'b0000000-0000-4000-8000-000000000012',
        'a0000000-0000-4000-8000-000000000004', -- Lê Kiều Trang
        'a0000000-0000-4000-8000-000000000006', -- Nguyễn Bá Chức
        $kudo$Cảm ơn người em bình thường nhưng phi thường :D Cảm ơn sự chăm chỉ, cần mẫn của em đã tạo động lực rất nhiều cho team, để luôn nhắc mình luôn phải nỗ lực hơn nữa trong công việc. <3 và cuộc sống...$kudo$,
        '{}',
        '{}',
        '2025-10-29 13:00:00+07'::timestamptz
    )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- Step 4 — public.kudo_hearts. Never writes heart_count directly — each
-- INSERT here fires the `0007` trigger, which adds exactly 1 (special stays
-- false, per phase-04's default) to the target kudo. Distribution below
-- gives the 5 highest-hearted kudos pairwise-distinct counts (7/6/5/4/3) with
-- a clean gap to the 6th (2), so the Highlight carousel's top-5 selection
-- (BR-001) is never a tie. No row here uses a kudo's own sender_id as
-- heart-giver (BR-002). ON CONFLICT matches the `0007` UNIQUE(kudo_id,
-- user_id) constraint, making this idempotent on a second `migration up`.
-- =============================================================================

INSERT INTO public.kudo_hearts (kudo_id, user_id)
VALUES
    -- kudo #1 (sender Đỗ hoàng Hiệp) — 7 hearts, everyone else
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000003'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000005'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000006'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000007'),
    ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000008'),
    -- kudo #2 (sender Dương thúy An) — 6 hearts
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000003'),
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000005'),
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000006'),
    ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000007'),
    -- kudo #3 (sender Mai phương Thúy) — 5 hearts
    ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000004'),
    ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005'),
    ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000006'),
    -- kudo #4 (sender Lê Kiều Trang) — 4 hearts
    ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003'),
    ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000005'),
    -- kudo #5 (sender Nguyễn Văn Quy) — 3 hearts
    ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000002'),
    ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000003'),
    -- kudo #6 (sender Nguyễn Bá Chức) — 2 hearts
    ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000002'),
    -- kudo #7 (sender Nguyễn Hoàng Linh) — 2 hearts
    ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001'),
    ('b0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000002'),
    -- kudo #8 (sender Huỳnh Dương Xuân) — 1 heart
    ('b0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000002'),
    -- kudo #9 (sender Đỗ hoàng Hiệp) — 1 heart
    ('b0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000002')
    -- kudos #10, #11, #12 — 0 hearts (empty tail of the feed page, on purpose)
ON CONFLICT (kudo_id, user_id) DO NOTHING;

-- =============================================================================
-- Step 5 — repair a previously-applied run. This file's first apply seeded
-- `kudo #1` with a placeholder `https://example.com/kudos/*` attachment URL
-- before switching to the repo's own real asset (see evidence
-- § "Ảnh đính kèm"). Step 3's `ON CONFLICT (id) DO NOTHING` never touches an
-- already-existing row, so on a database that already ran the old version of
-- this file, this UPDATE is what corrects `kudo #1`'s `image_urls`. No-op on
-- a fresh apply (Step 3 already inserts the corrected value) and on any
-- later re-run of this file (the WHERE clause stops matching once fixed).
-- =============================================================================

UPDATE public.kudos
SET image_urls = ARRAY['/kudos/sample-image.png', '/kudos/sample-image.png']
WHERE id = 'b0000000-0000-4000-8000-000000000001'
  AND image_urls @> ARRAY['https://example.com/kudos/demo-attachment-1.jpg'];
