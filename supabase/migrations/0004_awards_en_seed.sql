-- 0004_awards_en_seed.sql
--
-- English rows for `public.awards`. The MoMorph source (screen zFYDgyj_pD)
-- carries Vietnamese only, so these are translations, not extracted design
-- copy — the one place in this feature where the text was not lifted verbatim
-- from the design. Commissioned by the project owner on 2026-09-07.
--
-- Until these existed, `getAwards` found no rows for `locale = 'en'` and the
-- whole page fell back to its empty state. `src/dal/awards.ts` still falls back
-- to the default locale for safety; with these rows that fallback simply stops
-- being reached for English.
--
-- Kept untranslated on purpose: award titles (already English in the design),
-- "Sun*", "Wasshoi", "Aim High – Be Agile", and "Creator".
--
-- Amounts are re-formatted for an English reader — "7,000,000 VND" rather than
-- "7.000.000 VNĐ" — because dot-separated thousands read as a decimal point in
-- English and would misstate the prize by six orders of magnitude.
--
-- Apply with `supabase migration up`. Never `supabase db reset`.

INSERT INTO public.awards
    (slug, locale, sort_order, title, description, quantity_value, quantity_unit, prize_values)
VALUES
    (
        'top-talent', 'en', 1, 'Top Talent',
        $desc$The Top Talent award recognizes all-round outstanding individuals — people who consistently prove deep professional expertise, deliver exceptional performance, create value beyond expectation, and earn high regard from clients and teammates alike. Ready to take on whatever the organization entrusts to them, they are a constant source of inspiration, driving motivation and shaping the whole team for the better.$desc$,
        '10', 'Individuals',
        '[{"amount": "7,000,000 VND", "note": "per award"}]'::jsonb
    ),
    (
        'top-project', 'en', 2, 'Top Project',
        $desc$The Top Project award recognizes outstanding project teams whose business results exceed expectation, whose operations run at their best, and whose people work with genuine dedication. These are technically demanding projects that optimize resources and cost, bring valuable ideas to the client, return exceptional profit, and draw positive client feedback. Their members hold strictly to Sun*'s internal development standards throughout delivery, setting a benchmark for excellence and professionalism.$desc$,
        '02', 'Teams',
        '[{"amount": "15,000,000 VND", "note": "per award"}]'::jsonb
    ),
    (
        'top-project-leader', 'en', 3, 'Top Project Leader',
        $desc$The Top Project Leader award recognizes outstanding project managers — people who combine solid management ability, a powerful gift for inspiring others, and an “Aim High – Be Agile” mindset in every problem and every context. Under their guidance, team members not only clear the obstacles together and reach the goals set for them, but keep their fire alive, carry the Wasshoi spirit, and grow into a finer, happier version of themselves.$desc$,
        '03', 'Individuals',
        '[{"amount": "7,000,000 VND", "note": "per award"}]'::jsonb
    ),
    (
        'best-manager', 'en', 4, 'Best Manager',
        $desc$The Best Manager award recognizes exemplary leaders — people who have taken their teams to results beyond expectation, with a marked effect on business performance and on the organization's long-term growth. Under their leadership, the team meets and masters every goal through versatility, effective collaboration, and a flexible grasp of technology in the digital era. They inspire the group to become confident and full of energy, ready to embrace — and even to lead — changes of a revolutionary kind.$desc$,
        '01', 'Individual',
        '[{"amount": "10,000,000 VND", "note": ""}]'::jsonb
    ),
    (
        'signature-2025-creator', 'en', 5, 'Signature 2025 - Creator',
        $desc$The Signature award recognizes the individual or team who embodies the spirit Sun* is reaching for in a given era.

For 2025, the Signature award honors the Creator — an individual or team with a proactive, quick-sighted mindset, who sees opportunity inside every challenge and moves first. They read problems sharply, name them quickly, and put practical solutions forward that deliver clear value to a project, a client, or the organization. With the constructive turn of mind and the “Creator” spirit that is distinctly Sun*, they do more than respond well to change: they set improvements in motion and help shape a new standard for how Sun* people create value.$desc$,
        '01', 'Individual or team',
        '[{"amount": "5,000,000 VND", "note": "for the individual award"}, {"amount": "8,000,000 VND", "note": "for the team award"}]'::jsonb
    ),
    (
        'mvp', 'en', 6, 'MVP (Most Valuable Person)',
        $desc$The MVP award honors the most outstanding individual of the year — the face that represents the whole of Sun*. This is someone who has shown exceptional ability, unwavering dedication, and far-reaching influence, leaving a strong mark on Sun*'s journey through the past year.

They stand out for more than performance and results: they are an inspiration that spreads — through how they think, how they act, and the positive influence they have on those around them. The MVP brings together every quality of an exemplary Sun* person and carries a weighty responsibility with it: to be the model of who Sun* people are and what they stand for, and to help carry the collective toward new heights.$desc$,
        '01', 'Individual',
        '[{"amount": "15,000,000 VND", "note": ""}]'::jsonb
    )
ON CONFLICT (slug, locale) DO NOTHING;
