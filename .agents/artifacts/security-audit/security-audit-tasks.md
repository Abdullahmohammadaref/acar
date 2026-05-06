# Phase 1 & 2: Security Audit + Test Suite — Task Tracker

## Phase 1: Critical Fixes ✅
- [x] VULN-1: Fix IDOR in `vehicle_api.py` `get_models_for_make` — add business filter
- [x] VULN-2: Add `auth=django_auth` to `vehicle_router` + remove manual auth checks
- [x] VULN-3: Add `is_manager` checks to choice mutation endpoints in `api.py`
- [x] VULN-4: Handled by VULN-2 fix (remove manual 200-OK-for-unauth)
- [x] VULN-5: Increase password minimum from 4 to 8 chars in `auth_api.py`

## Phase 2: Automated Test Suite ✅
- [x] Create test infrastructure (BaseTestCase with two isolated businesses)
- [x] Write model unit tests (33 tests)
- [x] Write API integration tests (42 tests)
- [x] Write security/RBAC tests (35 tests)
- [x] Fix migration state issue (0060/0061 for Manufacturer→Make rename)
- [x] Fix production bug: `pdf_helpers.py` crash (property has no setter)
- [x] All 110 tests pass ✅

## Phase 3: Browser E2E Testing (next)
- [ ] Temporarily disable 2FA for testing
- [ ] Browser-based E2E tests
