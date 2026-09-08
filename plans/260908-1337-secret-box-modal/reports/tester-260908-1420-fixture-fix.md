# Phase 01 Report — Fixture Direction Fix (E2E RED)

## Summary
Fixed fixture bug: seeded kudo direction was backwards (hearts credited receiver instead of sender). Viewer now correctly becomes sender of 5-heart kudo → entitlement floor(5/5) = 1. Test RED remains valid (12 failed, 2 passed, exit 1). No assertions changed.

## Changes Made

**File:** `tests/e2e/secret-box.spec.ts`

1. **seedHeartCount docstring** (lines 64-68): Updated to clarify hearts credit the SENDER per BR-002
   ```
   OLD: "Creates sender → viewer kudo with specified heart_count. Viewer entitlement becomes: floor(heart_count/5)."
   NEW: "Creates kudo from sender to receiver with specified heart_count. Sender entitlement increases by heart_count (hearts credit the SENDER per BR-002, src/dal/kudos-stats.ts:19-25)."
   ```

2. **Seeding strategy comment** (lines 46-50): Clarified viewer sends hearts, not receives
   ```
   OLD: "Create sender user who has sent 5+ hearts to the viewer"
   NEW: "Create counterpart user to receive kudos FROM the viewer. Viewer sends 5 hearts to counterpart (viewer becomes the sender)"
   ```

3. **Variable rename** (line 174): `senderId` → `counterpartId` within first describe block
   ```ts
   OLD: let senderId: string;
   NEW: let counterpartId: string;
   ```

4. **Counterpart setup** (lines 197-206): Renamed email template + variable assignment
   ```ts
   OLD: const senderEmail = ...; const senderAuth = ...; senderId = senderAuth.user_id;
   NEW: const counterpartEmail = ...; const counterpartAuth = ...; counterpartId = counterpartAuth.user_id;
   ```

5. **Seed call** (line 209): Swapped argument order (viewer → sender position)
   ```ts
   OLD: await seedHeartCount(supabaseUrl, serviceRoleKey, senderId, viewerSession.user_id, 5);
   NEW: await seedHeartCount(supabaseUrl, serviceRoleKey, viewerSession.user_id, counterpartId, 5);
   ```

6. **Seed comment** (lines 208-209): Added BR-002 citation
   ```
   unopened = floor(5/5) − 0 = 1 (hearts credit the sender per BR-002, src/dal/kudos-stats.ts:19-25)
   ```

## Database Verification

Query: Recent viewer with ID `2cbb6493-118b-44b4-8ddd-0f8e0c1e656c` (email: `viewer-1788853421950-hl6xsm@secret-box-e2e.dev`)

**Seeded kudos (viewer as sender):**
```json
{
  "id": "d37c4087-81af-4b4d-8ceb-040841013564",
  "sender_id": "2cbb6493-118b-44b4-8ddd-0f8e0c1e656c",
  "receiver_id": "c31a3b85-9eed-4de8-80d7-718289eff056",
  "heart_count": 5,
  "created_at": "2026-09-08T07:43:42.326694+00:00"
}
```

**Entitlement calculation:**
- sum(heart_count WHERE sender_id = viewer) = **5**
- floor(5/5) = **1** unopened box per BR-002 ✓

## Test Results

**Command:** `pnpm run test:e2e tests/e2e/secret-box.spec.ts`

**Exit Code:** 1 (non-zero, RED valid)

**Summary:** 12 failed, 2 passed (1.6m total)

**Failures (feature unimplemented, not fixture):**
- S01: `toBeEnabled()` fails — button hardcoded disabled (unopened=0 at page.tsx:146-147)
- S02-S12: Modal/RPC missing (component + backend not implemented)

**Passes (design checks, unchanged):**
- S13: Zero hearts case — button visible+disabled, no modal open
- S15: Anonymous regression — button hidden for anon users

**Assertion check:** 0 lines containing `expect(` were modified ✓

## Sign-Off

- ✅ Fixture entitlement direction corrected (viewer is sender of 5 hearts)
- ✅ Database confirms seeded heart_count is credited to sender
- ✅ RED preserved: exit code 1, 12 failed / 2 passed
- ✅ S01 failure reason is correct: hardcoded unopened=0 (not missing entitlement)
- ✅ Zero assertions modified (Success Criteria: `grep -c expect` = 0)
- ✅ Single file changed (tests/e2e/secret-box.spec.ts only)

**Status:** DONE
