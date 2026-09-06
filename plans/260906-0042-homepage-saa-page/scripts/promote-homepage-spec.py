#!/usr/bin/env python3
"""Takumi Stage 3 Promote Gate for plan 260906-0042-homepage-saa-page (SINGLE, NEW feature).

Implements spec-state-registration.md § Promote P0–P5 + Steps 0–9 and § Promote — SYSTEM-DOC
against the per-lang docs root `docs/vi/` (primary_lang: vi, single-lang non-en → docs/<primary>/).
Idempotent guard: refuses to run when plan.md already carries `spec:` (already promoted).
Run from the repo root:  python3 plans/260906-0042-homepage-saa-page/scripts/promote-homepage-spec.py [--dry-run]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

PLAN_DIR = Path("plans/260906-0042-homepage-saa-page")
DOCS = Path("docs/vi")
SENTINEL = Path("docs/.spec-promote-pending.json")  # literal path takumi Stage 0 checks
DRAFT = PLAN_DIR / "spec" / "homepage"
SCREEN_DRAFT = DRAFT / "screens" / "SCR-home" / "spec.md"
SYSTEM_DRAFTS = [PLAN_DIR / "spec" / "system" / n for n in ("architecture.md", "permissions.md")]
FEATURE_NAME = "Trang chủ SAA 2025 (Homepage)"
FEATURE_SLUG_BODY = "Homepage"
SCREEN_SLUG_DIR = "Home"          # dir name pattern: SCR001_Login, SCR002_Todo
SCREEN_SLUG_LIST = "HomeScreen"   # screen-list heading pattern: SCR001_LoginScreen
PRIORITY = "P0"
FTYPE = "mixed"
PLANNED_SOURCES = [
    "app/page.tsx",
    "lib/countdown/countdown.ts",
    "lib/auth/get-user-role.ts",
    "hooks/use-countdown.ts",
    "hooks/use-select-locale.ts",
]


def die(msg: str) -> None:
    print(f"PROMOTE ABORT: {msg}", file=sys.stderr)
    sys.exit(2)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def read_json(p: Path) -> dict:
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p: Path, data: dict, dry: bool) -> None:
    if dry:
        print(f"  [dry] write {p}")
        return
    p.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_text(p: Path, text: str, dry: bool) -> None:
    if dry:
        print(f"  [dry] write {p} ({len(text)} chars)")
        return
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")


def frontmatter_set(text: str, key: str, value: str) -> str:
    """Set/replace `key: value` inside the leading YAML frontmatter block."""
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    if not m:
        die(f"missing frontmatter while setting {key}")
    block = m.group(1)
    if re.search(rf"^{key}:", block, re.M):
        block = re.sub(rf"^{key}:.*$", f"{key}: {value}", block, flags=re.M)
    else:
        block = block + f"\n{key}: {value}"
    return f"---\n{block}\n---\n" + text[m.end():]


def parse_screen_sections(text: str) -> dict[str, str]:
    """Mirror incremental_planner._parse_screen_sections: body = lines after `## SCR###` heading
    up to (exclusive) the next `## SCR` heading; keepends=True."""
    lines = text.splitlines(keepends=True)
    heading_re = re.compile(r"^## (SCR\d{3,4}[a-z]?)(?:_(\w+))?")
    result: dict[str, str] = {}
    code = None
    body: list[str] = []
    for line in lines:
        m = heading_re.match(line)
        if m:
            if code is not None:
                result[code] = "".join(body)
            code = m.group(1)
            body = []
        elif code is not None:
            body.append(line)
    if code is not None:
        result[code] = "".join(body)
    return result


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    dry = ap.parse_args().dry_run

    plan_md = PLAN_DIR / "plan.md"
    if not plan_md.is_file():
        die("plan.md not found — run the planner first")
    plan_text = plan_md.read_text(encoding="utf-8")
    if re.search(r"^spec:", plan_text, re.M) and not re.search(r"^spec_draft:", plan_text, re.M):
        print("already promoted (plan.md has spec:) — no-op")
        return
    if not re.search(r"^spec_draft:", plan_text, re.M):
        die("plan.md has neither spec_draft: nor spec:")

    tech = (DRAFT / "technical-spec.md").read_text(encoding="utf-8")
    func_path = DRAFT / "functional-spec.md"
    if not func_path.is_file():
        die("draft functional-spec.md missing")
    fm = re.match(r"^---\n(.*?)\n---\n", tech, re.S)
    if not fm:
        die("draft technical-spec.md has no YAML frontmatter")
    if re.search(r"^fcode:", fm.group(1), re.M):
        die("draft carries fcode: — EXISTING-feature path not implemented by this script")
    if SENTINEL.exists():
        die(f"{SENTINEL} already present — resolve the prior promote first")

    canonical_p = DOCS / "_canonical-fcodes.json"
    src2f_p = DOCS / "_source-to-fcode.json"
    state_p = DOCS / ".rebuild-state.json"
    feature_list_p = DOCS / "generated" / "feature-list.md"
    screen_list_p = DOCS / "generated" / "screen-list.md"
    for p in (canonical_p, src2f_p, state_p, feature_list_p, screen_list_p):
        if not p.is_file():
            die(f"required state file missing: {p}")

    # ---- Step 0: allocate + reserve ------------------------------------------------------
    canonical = read_json(canonical_p)
    max_f = 0
    for f in canonical.get("features", []):
        max_f = max(max_f, int(f["fcode"][1:]))
    for m in re.finditer(r"^\| (F\d{3})_", feature_list_p.read_text(encoding="utf-8"), re.M):
        max_f = max(max_f, int(m.group(1)[1:]))
    fcode = f"F{max_f + 1:03d}"
    slug = f"{fcode}_{FEATURE_SLUG_BODY}"
    if not re.match(r"^F\d{3}_[A-Za-z0-9]+$", slug) or len(slug) > 36:
        die(f"bad slug {slug}")

    screen_list = screen_list_p.read_text(encoding="utf-8")
    max_s = 0
    for m in re.finditer(r"^## SCR(\d{3})", screen_list, re.M):
        max_s = max(max_s, int(m.group(1)))
    scode = f"SCR{max_s + 1:03d}"
    screen_dir = f"{scode}_{SCREEN_SLUG_DIR}"
    screen_heading = f"{scode}_{SCREEN_SLUG_LIST}"

    print(f"allocating {fcode} ({slug}) + {scode} ({screen_dir} / {screen_heading})")

    reservation = {
        "fcode": fcode, "name": "RESERVED", "slug": f"{fcode}_Reserved", "priority": "P1",
        "type": "mixed",
        "related": {"screens": [], "user_stories": [], "routes": [], "models": [], "bl": [], "perms": []},
    }
    canonical["features"].append(reservation)
    canonical["features"].sort(key=lambda f: f["fcode"])
    write_json(canonical_p, canonical, dry)
    if not dry:
        again = read_json(canonical_p)
        if sum(1 for f in again["features"] if f["fcode"] == fcode) != 1:
            die(f"ID collision on {fcode} — another session claimed it first")

    # ---- P1: sentinel ----------------------------------------------------------------------
    system_docs = [str(DOCS / "system" / d.name) for d in SYSTEM_DRAFTS if d.is_file()]
    sentinel = {
        "fcode": fcode, "run_type": "new", "plan_dir": str(PLAN_DIR), "slug": slug,
        "from": str(DRAFT) + "/", "screens": [screen_dir], "ts": now_iso(),
        "system_docs": system_docs,
    }
    write_json(SENTINEL, sentinel, dry)

    # ---- P2: copy draft → docs (rename SCR-home → real code) ------------------------------
    feat_dir = DOCS / "features" / slug
    if feat_dir.exists():
        die(f"{feat_dir} already exists")
    def promote_text(text: str) -> str:
        text = text.replace("SCR-home", screen_dir)
        text = text.replace(" (F003 provisional)", "")      # provisional annotation dropped at promote
        text = text.replace("F000_Homepage", slug)           # scaffold placeholder H1 → real slug
        return re.sub(r"\bF003\b", fcode, text)             # provisional code → allocated code
    tech_out = frontmatter_set(promote_text(tech), "status", "implemented")
    tech_out = frontmatter_set(tech_out, "fcode", fcode)           # P4
    write_text(feat_dir / "technical-spec.md", tech_out, dry)
    write_text(feat_dir / "functional-spec.md", promote_text(func_path.read_text(encoding="utf-8")), dry)
    screen_out_dir = DOCS / "screens" / screen_dir
    has_screen = SCREEN_DRAFT.is_file()
    if has_screen:
        if screen_out_dir.exists():
            die(f"{screen_out_dir} already exists")
        s_text = promote_text(SCREEN_DRAFT.read_text(encoding="utf-8"))
        s_text = frontmatter_set(s_text, "fcode", fcode)
        write_text(screen_out_dir / "spec.md", s_text, dry)
    else:
        print("  WARN no screen draft at", SCREEN_DRAFT)

    # ---- Step 2: real canonical entry + .pending marker ------------------------------------
    for f in canonical["features"]:
        if f["fcode"] == fcode:
            f.update({
                "name": FEATURE_NAME, "slug": slug, "priority": PRIORITY, "type": FTYPE,
                "related": {"screens": [screen_dir] if has_screen else [], "user_stories": [],
                            "routes": [], "models": [], "bl": [], "perms": []},
            })
    canonical["generated_at"] = now_iso()
    canonical["plan"] = PLAN_DIR.name
    write_json(canonical_p, canonical, dry)
    pending = feat_dir / ".pending"
    if not dry:
        pending.touch()

    # ---- Step 3: source→fcode index + sha ------------------------------------------------------
    src2f = read_json(src2f_p)
    index = src2f.setdefault("index", {})
    for src in PLANNED_SOURCES:
        codes = index.setdefault(src, [])
        if fcode not in codes:
            codes.append(fcode)
    src2f["generated_at"] = now_iso()
    write_json(src2f_p, src2f, dry)
    fcode_index_sha = hashlib.sha256(
        json.dumps(index, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    ).hexdigest()

    # ---- Step 5: screen-list.md section (inserted right after the last SCR body) -----------
    if has_screen:
        section = (
            f"## {screen_heading}\n\n"
            f"**Feature:** {fcode} — {FEATURE_NAME}\n"
            f"**Route:** /\n"
            f"**Description:** Trang chủ công khai SAA 2025 — hero ROOT FURTHER + đồng hồ đếm ngược (`EVENT_START_AT`), "
            f"thông tin sự kiện, CTA, nội dung Root Further, 6 thẻ hạng mục giải thưởng, khối Sun* Kudos, widget hành động nhanh, "
            f"header (nav + ngôn ngữ + bell + menu tài khoản theo role) và footer.\n"
            f"**States:** anonymous, member, admin, countdown-running, event-reached (Coming soon ẩn), env-invalid (00 00 00), menu-open\n\n"
            f"---\n\n"
        )
        idx = screen_list.find("## Summary")
        if idx < 0:
            die("screen-list.md has no ## Summary anchor")
        screen_list = screen_list[:idx] + section + screen_list[idx:]
        row = f"| {screen_heading} | Trang chủ (Homepage) | atomic | 14 | MODEL002_SupabaseUser (email, role qua public.users), MODEL001_AppLocale |\n"
        screen_list = re.sub(r"(\| SCR002_TodoScreen \|[^\n]*\n)", r"\1" + row.replace("\\", "\\\\"), screen_list, count=1)
        screen_list = screen_list.replace("- **Total Screens**: 2", "- **Total Screens**: 3")
        write_text(screen_list_p, screen_list, dry)

    # ---- Step 4 + 6: state cursor + screen shas (ALL sections re-hashed) ---------------------
    state = read_json(state_p)
    head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    state["last_feature_spec_run_sha"] = head
    state["fcode_index_sha"] = fcode_index_sha
    shas = state.setdefault("screen_spec_shas", {})
    for code, body in parse_screen_sections(screen_list).items():
        shas[code] = hashlib.sha256(body.encode("utf-8")).hexdigest()
    write_json(state_p, state, dry)

    # ---- Step 7: verify --------------------------------------------------------------------
    if not dry:
        for p in (feat_dir / "technical-spec.md", feat_dir / "functional-spec.md"):
            if not p.is_file():
                die(f"promoted file missing: {p}")
        if has_screen and not (screen_out_dir / "spec.md").is_file():
            die("promoted screen spec missing")

    # ---- Step 8: feature-list.md (LAST) -----------------------------------------------------
    fl = feature_list_p.read_text(encoding="utf-8")
    fl_row = f"| {slug} | {FEATURE_NAME} | {FTYPE} | TypeScript | agentic-coding-hands-on | {PRIORITY} |\n"
    fl = re.sub(r"(\| F002_LanguageSwitch \|[^\n]*\n)", r"\1" + fl_row.replace("\\", "\\\\"), fl, count=1)
    details = (
        f"### {fcode}: {FEATURE_NAME}\n\n"
        f"**Type**: {FTYPE}\n"
        f"**Description**: Khách (ẩn danh hoặc đã đăng nhập) xem trang chủ công khai `/` của SAA 2025: hero ROOT FURTHER với đồng hồ "
        f"đếm ngược tới `EVENT_START_AT`, thông tin sự kiện, CTA sang Awards Information / Sun* Kudos, nội dung Root Further, 6 thẻ hạng mục "
        f"giải thưởng (link `/awards#<slug>`), khối Sun* Kudos, widget hành động nhanh; header hiển thị bell + menu tài khoản theo role "
        f"(`public.users.role`, fail-open `member`) cho người đã đăng nhập. `/` không còn redirect (PERM001 hết hiệu lực); đích sau đăng nhập đổi từ `/todo` sang `/`.\n\n"
        f"**Workspace**: agentic-coding-hands-on\n**Languages**: TypeScript\n"
        f"**Components**: `app/page.tsx` + `components/home/**` + `lib/countdown/countdown.ts` + `hooks/use-countdown.ts` + `lib/auth/get-user-role.ts` + `hooks/use-select-locale.ts`\n\n"
        f"**Related Screens**:\n- {screen_heading}: Trang chủ (Homepage)\n\n"
        f"**Related User Stories**:\n- TBD (draft) — xem `features/{slug}/functional-spec.md § 7`\n\n"
        f"**Related APIs/Routes**:\n- Không có ROUTE### mới — đọc `public.users` qua PostgREST (Supabase) bằng JWT của user\n\n"
        f"**Related Data Models**:\n- MODEL002_SupabaseUser (mở rộng: `role` từ `public.users`)\n- MODEL001_AppLocale\n\n"
        f"**Related Background Logic**:\n- BL002_SupabaseServerClient (dùng lại)\n\n"
        f"**Related Permissions**:\n- PERM001_RootRouteGuard — HẾT HIỆU LỰC (`/` public)\n- Role-based screen-permission cho mục \"Trang quản trị\" — TBD (draft), mã do core pass cấp\n\n"
        f"---\n\n"
    )
    idx = fl.find("## Summary")
    if idx < 0:
        die("feature-list.md has no ## Summary anchor")
    fl = fl[:idx] + details + fl[idx:]
    fl = fl.replace("- **Total Features**: 2", "- **Total Features**: 3")
    write_text(feature_list_p, fl, dry)

    # features index (navigation) — keep the human index honest
    idx_p = DOCS / "features" / "README.md"
    if idx_p.is_file():
        idx_text = idx_p.read_text(encoding="utf-8")
        if slug not in idx_text:
            idx_text = idx_text.replace("- [F002_LanguageSwitch](F002_LanguageSwitch/)\n",
                                        f"- [F002_LanguageSwitch](F002_LanguageSwitch/)\n- [{slug}]({slug}/)\n")
            write_text(idx_p, idx_text, dry)

    # ---- Step 9: duplicate check, drop .pending ---------------------------------------------
    if not dry:
        can = read_json(canonical_p)
        if sum(1 for f in can["features"] if f["fcode"] == fcode) != 1:
            die("duplicate fcode in _canonical-fcodes.json")
        if len(re.findall(rf"^\| {fcode}_", feature_list_p.read_text(encoding="utf-8"), re.M)) != 1:
            die("duplicate/missing fcode row in feature-list.md")
        if len(re.findall(rf"^## {scode}", screen_list_p.read_text(encoding="utf-8"), re.M)) > 1:
            die("duplicate SCR heading in screen-list.md")
        pending.unlink(missing_ok=True)

    # ---- SYSTEM-DOC D2/D3 -------------------------------------------------------------------
    for d in SYSTEM_DRAFTS:
        if d.is_file():
            text = frontmatter_set(d.read_text(encoding="utf-8"), "status", "implemented")
            write_text(DOCS / "system" / d.name, text, dry)

    # ---- P5: repoint plan.md ---------------------------------------------------------------
    plan_text = re.sub(r"^spec_draft:.*$", f"spec: {feat_dir}/", plan_text, flags=re.M)
    write_text(plan_md, plan_text, dry)

    print(f"⚒ Stage 3: Spec promoted — {fcode} at {feat_dir}/ ; screen {screen_dir} ; system docs: {', '.join(system_docs) or 'none'} ; sentinel {SENTINEL}")


if __name__ == "__main__":
    main()
