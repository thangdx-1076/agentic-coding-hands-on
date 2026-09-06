---
title: "Vendor ba Vercel agent skills vào `.claude/skills/` — `.gitignore` cascade trap nearly silenced a broken repo"
date: 2026-09-06
time: "22:35 → 22:50"
tags: [vendoring, skills, gitignore, agent-skills, vercel, third-party-content, reviewer]
severity: medium
---

# Bối cảnh

Dự định: copy ba Vercel agent skill từ github.com/vercel-labs/agent-skills (`vercel-react-best-practices`, `vercel-react-view-transitions`, `vercel-composition-patterns`) vào `.claude/skills/` scope `--copy` để mỗi clone repo này đều có sẵn ba cái. Toàn bộ: 101 file markdown + JSON, ~636 KB. Không touch code ứng dụng. Planner cảnh báo: "bước gitignore có khả năng bị im lặng tối cao" — đó là lần duy nhất orchestrator prediction đóng điểm chính xác.

---

## Cái gì hỏng / gây kinh hãi

### `.gitignore` cascade đóng cửa toàn bộ skill directory mới vendored

**Triệu chứng**: Sau khi `npx skills add vercel-labs/agent-skills -s vercel-react-best-practices -s vercel-react-view-transitions -s vercel-composition-patterns --copy -y` chạy xong, 101 file được ghi xuống `.claude/skills/vercel-*/**`. Lập tức kiểm tra: `git status --porcelain --untracked-files=all .claude/skills/` → **KHÔNG CÓ GÌ**. Hoàn toàn vô hình.

**Nguyên nhân**: Repo's `.gitignore` là một cascade:
```
.claude/*          # rule 1: ignore all .claude/
!.claude/skills/   # rule 2: except skills dir itself
.claude/skills/*   # rule 3: ignore everything inside skills/
!.claude/skills/custom-skill-name/  # rule 4: except this one hand-authored skill
```

Hệ quả: một skill directory **mới được vendored không nằm trong rule 4** → bị rule 3 bắt → bị ignore hoàn toàn. `git status` không thấy, không throw error, không warning. Nếu lỡ merge branch này, `skills-lock.json` sẽ reference 3 skill mà file không bao giờ committed — silent broken repo cho toàn bộ clone. CI green vì không kiểm tra "skill file có tồn tại không", chỉ check đó là lint/build/test valid.

**Bằng chứng**:
- `.gitignore` dòng 17-21 (trước fix): cascade rule 3 + rule 4
- `git ls-files .claude/skills/ | grep vercel` → empty (các file vercel-* không tracked)
- Sau khi thêm ba dòng vào `.gitignore`:
  ```
  !.claude/skills/vercel-react-best-practices/
  !.claude/skills/vercel-react-view-transitions/
  !.claude/skills/vercel-composition-patterns/
  ```
  `git status` ngay lập tức liệt kê 101 untracked file

**Bài học chảy máu**: `.gitignore` cascade không có error message. Cái bạn tưởng là committed hoàn toàn có thể ẩn sau hàng chục layer negation rule, và team chỉ phát hiện lúc lên production hoặc lúc người khác clone. Pattern này ("bắt mọi thứ, trừ danh sách trắng nhỏ") rất nguy hiểm cho vendored content — phải **proactively add rule mới**, không phải "đợi tới lần tới".

### `--skill a,b,c` flag lỗi: CLI treat comma-list như single skill name

**Triệu chứng**: Lần đầu chạy `npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices,vercel-react-view-transitions,vercel-composition-patterns --copy -y` → fail với `No matching skills found for: vercel-react-best-practices,vercel-react-view-transitions,vercel-composition-patterns`. Đến sau nó in danh sách "Available skills" — chính xác là ba cái tên tôi vừa gõ, tạo cảm giác "mình gõ đúng mà nó nói không tìm thấy".

**Nguyên nhân**: CLI's argument parser treat `--skill a,b,c` như một string duy nhất, không split trên dấu phẩy. Phía CLI search "có skill nào tên là `a,b,c` không?" → không → fail. Thông báo lỗi in danh sách skills có sẵn (là `a`, `b`, `c`), mà bằng đúng cái tên tôi vừa gõ, tạo fake sense của "contradiction".

**Fix**: Repeat flag: `npx skills add ... -s a -s b -s c`. Lần 2 chạy thành công.

**Bằng chứng**:
- Lệnh fail: `npx -y skills@1.5.23 add vercel-labs/agent-skills --skill vercel-react-best-practices,vercel-react-view-transitions,vercel-composition-patterns --copy -y -a claude-code`
- Lệnh success: `npx -y skills@1.5.23 add vercel-labs/agent-skills -s vercel-react-best-practices -s vercel-react-view-transitions -s vercel-composition-patterns --copy -y -a claude-code`
- Claude Code harness registered all 3 skills trong available-skills list ngay sau install thành công

**Bài học**: CLI help text (khi chạy `skills add --help`) không ghi rõ là flag không support comma-list. Mà error message (in danh sách "Available skills") vô tình chứng minh tên bạn vừa gõ đâu nó cũng có, tạo tâm lý "chắc tôi gõ sai format". Flag repeat là pattern chuẩn cho CLI args mà có thể multiple values; nên document nó rõ.

---

## Reversal tại forge time: bỏ `THIRD_PARTY_NOTICES.md`

Blueprint gọi cho `.claude/skills/THIRD_PARTY_NOTICES.md` — một attribution file để track tất cả vendored skill + license. Lúc code, nó bị drop vì hai lý do độc lập:

1. **Session rule forbid**: Dự án này CLAUDE.md nói "Không viết markdown file ngoài `plans/` và `docs/`". `.claude/skills/` không nằm trong danh sách.
2. **Duplication thực sự**: Mỗi vendored skill đã có `license: MIT` ghi trong frontmatter; `skills-lock.json` đã record `skillPath`, `computedHash`, `source` per skill. Attribution không "bị thiếu", nó đã encode rõ. Reviewer verify: upstream (github.com/vercel-labs/agent-skills) không ship `LICENSE` file, `package.json` chỉ có 1 dòng README mention license. In-tree frontmatter + lock file **mạnh hơn** upstream's own declaration.

**Quyết định**: Drop `.claude/skills/THIRD_PARTY_NOTICES.md`. Không phải vì "thiếu thời gian", mà vì nó bao dư + không match pattern.

---

## Reviewer finding: vendored README describe upstream layout — disposition flipped

Reviewer flag một Low concern: vendored `SKILL.md` file describe "authoring repo structure" (e.g. "Run `npm install` in the skill repo's own directory"). Nó không match this project's layout (các file là read-only under `.claude/skills/`). Flag disposition: "Accept" (must-fix).

**Reversal**: Downgrade thành "Defer". Lý do: vendored markdown là third-party content. Sửa nó thì `computedHash` drift khỏi upstream's published version, và lần tới `npx skills update` override lại. Cách fix đúng là upstream cần update doc, không repository này đổi các file vendored. Generalize: "Accept" disposition gần như luôn sai cho vendored content — fix belongs upstream, không ở fork.

---

## Evidence

**Gates lần đầu** (trước gitignore catch):
- `pnpm format:check` — exit 0 ✓
- `pnpm lint` — exit 0 ✓
- `pnpm test:unit` — 19 file / 124 test, exit 0 ✓
- `pnpm typecheck` — exit 0 ✓
- `git diff --stat -- src/` — empty (không có application code change) ✓

**`.gitignore` không cần config thêm**: `.prettierignore` và `eslint.config.*` đã blanket-exclude `.claude/**`, nên 101 vendored markdown không trigger formatter/linter rules — đó là right-by-construction, không may mắn.

**Inspection**: SEALED, score 9, 0 critical, 2 Low (cả hai Defer). Evidence gate hard: SEALED, exit 0.

**Verify**: Lệnh thực thi cuối cùng:
```bash
npx -y skills@1.5.23 add vercel-labs/agent-skills \
  -s vercel-react-best-practices \
  -s vercel-react-view-transitions \
  -s vercel-composition-patterns \
  --copy -y -a claude-code
```

Kích thước:
- `vercel-react-best-practices/`: 416 KB
- `vercel-react-view-transitions/`: 140 KB
- `vercel-composition-patterns/`: 80 KB

---

## Còn mở

Không có. Ba skill đã commit, `.gitignore` cascad fix sẵn, `skills-lock.json` stamped, CI run xanh. Toàn bộ pipeline seal.

---

**Evidence**: `.gitignore` dòng 19-21 added; `git log --oneline` show 1 commit (chore: vendor Vercel agent skills); 101 file under `.claude/skills/vercel-*/` tracked; inspection-verdict.json SEALED; `npx skills list` confirm 3 skill registered.

**Status:** DONE
**Summary:** Vendor 101 file từ 3 Vercel agent skill. `.gitignore` cascade trap nearly silent—301 untracked file vô hình, `skills-lock.json` reference 3 broken skill, CI green nhưng repo silently broken lúc clone. Catch lúc fix, add 3 rule whitelist vào `.gitignore`. Dropped `THIRD_PARTY_NOTICES.md` vì duplication + session rule. Reviewer finding flipped từ "Accept" thành "Defer" (third-party content fix belongs upstream). All gates green.
**Concerns/Blockers:** None.
