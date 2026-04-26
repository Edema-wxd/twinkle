---
phase: 11
slug: migrate-from-supabase-to-neon-uploadthing
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | vitest.config.ts (if exists) or inline |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 11-01-01 | 01 | 1 | DB migration | — | Connection string not leaked to client | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-01-02 | 01 | 1 | Drizzle schema | — | Schema types match DB tables | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-01-03 | 01 | 1 | DB push | — | All tables exist in Neon after push | manual | `npx drizzle-kit push` exits 0 | ❌ W0 | ⬜ pending |
| 11-02-01 | 02 | 2 | Auth migration | — | Sessions invalidated cleanly on logout | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-02-02 | 02 | 2 | Better-auth | — | No Supabase auth imports remain | integration | `grep -r "supabase.auth" src/ \| wc -l` → 0 | ❌ W0 | ⬜ pending |
| 11-03-01 | 03 | 3 | Uploadthing | — | File upload route handler exists | type-check | `npx tsc --noEmit` | ❌ W0 | ⬜ pending |
| 11-03-02 | 03 | 3 | Cleanup | — | No @supabase packages remain | integration | `grep -r "@supabase" src/ \| wc -l` → 0 | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Verify `npx tsc --noEmit` passes on clean codebase before migration begins
- [ ] Confirm Neon account created and `DATABASE_URL` connection string available
- [ ] Confirm Uploadthing account created and `UPLOADTHING_TOKEN` available
- [ ] Confirm `npm run build` passes before migration begins (baseline)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Data migration | All Supabase DB tables exist in Neon with correct row counts | Requires live DB access + row count comparison | Run `pg_dump` from Supabase, `pg_restore` to Neon, verify row counts match |
| Image serving | Existing product images still load after migration | Supabase Storage URLs are live external dependencies | Browse product pages, confirm images load |
| Admin login | Admin can log in via better-auth after migration | Auth system replaced end-to-end | Visit /login, enter credentials, confirm redirect to /admin |
| File upload | Admin can upload product images via Uploadthing | Requires browser + Uploadthing account wired | Visit admin product create/edit, upload an image, confirm URL saved to DB |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
