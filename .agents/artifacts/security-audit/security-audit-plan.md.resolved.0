# Phase 1: Security & RBAC Audit — Findings & Fix Plan

## Summary

I audited **every API endpoint** across 6 backend files against IDOR, data-leak, and RBAC bypass vulnerabilities. The main API files (`api.py`, `transaction_api.py`, `settings_api.py`) are **well-written** — nearly every endpoint correctly filters by `business=get_user_business(request)`. However, I found **3 critical vulnerabilities** and **2 medium-severity issues** that must be fixed before shipping.

---

## 🔴 Critical Vulnerabilities

### VULN-1: IDOR in `vehicle_api.py` — `get_models_for_make` leaks cross-business data

**File:** [vehicle_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/vehicle_api.py#L448-L459)

```python
@vehicle_router.get("/makes/{make_id}/models")
def get_models_for_make(request: HttpRequest, make_id: int):
    models = VehicleModel.objects.filter(
        make_id=make_id,       # ❌ No business filter!
        is_active=True
    ).values_list('name', flat=True)
```

**Impact:** Any authenticated user can query `/api/makes/{ANY_ID}/models` and see vehicle models belonging to ANY business. This leaks proprietary business data (custom model names) across tenants.

**Fix:** Add `business=request.user.business` to the filter and validate the `make_id` belongs to the user's business.

---

### VULN-2: IDOR in `vehicle_api.py` — `vehicle_router` has NO authentication

**File:** [vehicle_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/vehicle_api.py#L20)

```python
vehicle_router = Router(tags=["Vehicles"])  # ❌ No auth=django_auth!
```

**Impact:** The `vehicle_router` is registered WITHOUT `auth=django_auth`, meaning **all its endpoints are potentially accessible without authentication** (depending on how NinjaAPI is configured). While the endpoints check `request.user.is_authenticated` manually and return empty data for unauthenticated users, they return **200 OK with empty data instead of 401 Unauthorized**. This is an information disclosure issue (confirms endpoint existence) and breaks the security posture — an attacker sees structure rather than being rejected.

**Fix:** Add `auth=django_auth` to the Router constructor, matching the pattern used in all other API files.

---

### VULN-3: Missing manager-only check on multiple choice/entity endpoints

**File:** [api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/api.py#L927-L1112)

The following endpoints in `api.py` perform **write operations** (create, deactivate, reactivate choices) but have **no `is_manager` check**:

- `POST /api/choices/{choice_type}` — create_choice (line 927)
- `POST /api/choices/{choice_type}/{id}/deactivate` — deactivate_choice (line 1038)  
- `POST /api/choices/{choice_type}/{id}/reactivate` — reactivate_choice (line 1079)

**Impact:** A standard employee user can create, deactivate, or reactivate business settings (payment methods, vehicle types, makes, etc.) which should be manager-only operations. This violates RBAC.

**Fix:** Add `if not request.user.is_manager: return 403, {"detail": "Only managers can modify choices."}` to these endpoints.

---

## 🟡 Medium Severity Issues

### VULN-4: `vehicle_api.py` returns 200 with empty data instead of 401

**File:** [vehicle_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/vehicle_api.py#L249-L250)

```python
if not request.user.is_authenticated:
    return {"items": [], "total": 0, ...}  # ❌ Returns 200 OK
```

**Impact:** Instead of returning HTTP 401, unauthenticated requests get a 200 OK response with empty data. This allows attackers to confirm which endpoints exist and their response structure.

**Fix:** After adding `auth=django_auth` to the router (VULN-2 fix), these manual checks can be removed entirely — Django Ninja will auto-return 401.

---

### VULN-5: Password minimum length is only 4 characters

**File:** [auth_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/auth_api.py#L683)

```python
if not new_password or len(new_password) < 4:
    return 400, {"detail": "Password must be at least 4 characters."}
```

**Impact:** A 4-character minimum is extremely weak for a production application. Brute-force attacks become trivially easy.

**Fix:** Increase to minimum 8 characters and ideally use Django's built-in password validators.

---

## 🟢 Low Severity / Recommendations

### REC-1: Excessive debug `print()` statements in production code

**Files:** `api.py` (lines 75-118), `transaction_api.py` (lines 57-82, 467-495), `activity_logs_api.py` (lines 52-60, 97, 123)

Sensitive business data (usernames, business names, transaction counts) is printed to stdout. In production, this ends up in server logs and could be accessed by hosting providers or leaked.

**Fix:** Replace with proper `logging` module calls at DEBUG level, or remove entirely.

---

### REC-2: No rate limiting on auth endpoints

**File:** `auth_api.py`

The login, password reset, and email change endpoints have no rate limiting. An attacker could brute-force credentials or trigger email floods.

**Fix:** Add Django rate limiting middleware or per-view rate limits.

---

### REC-3: CSV import lacks file size limit

**File:** [transaction_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/transaction_api.py#L679-L683)

No file size validation on CSV upload. A malicious user could upload a multi-GB file and cause memory exhaustion.

**Fix:** Add `if transactions_file.size > 10 * 1024 * 1024: return 400, {"detail": "File too large"}` check.

---

### REC-4: `views.py` file is 320KB — should be audited separately

The legacy `views.py` file is massive (>2600 lines). It contains PDF generation logic that's called from API endpoints. Those PDF endpoints in `api.py` correctly validate business ownership before delegating, but the legacy views themselves may have their own entry points via `urls.py`.

**Fix:** Audit `manager/urls.py` to ensure legacy view routes are also protected.

---

## Proposed Changes

### [vehicle_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/vehicle_api.py)

1. **Add authentication to router** — Add `auth=django_auth` import and argument
2. **Fix IDOR in `get_models_for_make`** — Add `business` filter
3. **Remove manual auth checks** — They become redundant after router-level auth

### [api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/api.py)

1. **Add `is_manager` checks** to `create_choice`, `deactivate_choice`, `reactivate_choice`

### [auth_api.py](file:///d:/Files/code/cars%20project/antigravity_application/acar/backend/manager/auth_api.py)

1. **Increase password minimum** from 4 to 8 characters

---

## What's Secure ✅ (Endpoints That Passed Audit)

| File | Endpoints | Verdict |
|------|-----------|---------|
| `api.py` | Vehicle CRUD (list, get, create, update, delete, activate, change-status) | ✅ All filter by `business` |
| `api.py` | Legal Entity CRUD | ✅ All filter by `business` + `internal_id` |
| `api.py` | PDF generation endpoints | ✅ Validate `business` + `internal_id` before delegating |
| `api.py` | `/choices` (GET) and `/choices/models/{make_id}` | ✅ Correctly scoped to business |
| `api.py` | Activity Logs | ✅ Filter by `business` |
| `transaction_api.py` | All transaction endpoints | ✅ All filter by `business` |
| `transaction_api.py` | Transaction choices, subcategories | ✅ All filter by `business` |
| `transaction_api.py` | CSV import | ✅ Creates transactions under user's `business` |
| `settings_api.py` | All endpoints | ✅ Require `is_manager` + filter by `business` |
| `auth_api.py` | Login, password reset, email change | ✅ Proper validation |
| `activity_logs_api.py` | All endpoints | ✅ Filter by `business` |

---

## Open Questions

> [!IMPORTANT]
> **Q1:** Should standard employees be allowed to create/modify choices (VULN-3)? I'm assuming this should be manager-only, but please confirm if employees should have some of these abilities.

> [!IMPORTANT]  
> **Q2:** The `vehicle_api.py` router appears to be a **duplicate/alternative** implementation of the vehicle endpoints in `api.py`. Both are registered on the same NinjaAPI instance. Are both actively used by the frontend, or can one be removed? Having duplicates increases the attack surface.

---

## Verification Plan

### Automated
- After applying fixes, attempt to access `vehicle_router` endpoints without authentication → should get 401
- Attempt `GET /api/makes/1/models` → should only return models for the requesting user's business
- Attempt `POST /api/choices/make` as a non-manager employee → should get 403

### Manual
- Check frontend still works correctly after adding auth to `vehicle_router`
- Verify PDF generation still works
