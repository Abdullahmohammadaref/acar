"""
Settings API for User Management and Business Settings.

Provides REST API endpoints for:
- Employee management (list, create, update)
- Business settings (get, update)
- Branch management (create, update)
"""

from ninja import Router, Schema, File
from ninja.security import django_auth
from ninja.files import UploadedFile
from django.http import HttpRequest
from typing import Optional, List
from pydantic import Field
from django.conf import settings as django_settings

from .models import User, Business, Branch, AuthActionRequest

# Create router with session authentication
settings_router = Router(auth=django_auth, tags=["Settings"])


# =============================================================================
# Schemas
# =============================================================================

class EmployeeOut(Schema):
    id: int
    username: str
    is_active: bool
    transactions_access: bool
    legal_entities_access: bool


class EmployeeCreate(Schema):
    username: str
    password: str
    transactions_access: bool = False
    legal_entities_access: bool = False


class EmployeeUpdate(Schema):
    username: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None
    transactions_access: Optional[bool] = None
    legal_entities_access: Optional[bool] = None


class BranchOut(Schema):
    id: int
    name: str
    address: str
    is_active: bool


class BranchCreate(Schema):
    name: str
    address: str = ""


class BranchUpdate(Schema):
    name: Optional[str] = None
    address: Optional[str] = None
    is_active: Optional[bool] = None


class BusinessOut(Schema):
    id: int
    name: str
    logo_url: Optional[str] = None
    # Address
    address_country: Optional[str] = None
    address_city: Optional[str] = None
    address_street: Optional[str] = None
    address_street_number: Optional[str] = None
    address_postal_code: Optional[str] = None
    # Contact
    telephone_number: Optional[str] = None
    fax_number: Optional[str] = None
    email: Optional[str] = None
    # Bank
    bank_name: Optional[str] = None
    bank_bic_swift: Optional[str] = None
    bank_iban: Optional[str] = None
    # Company Registration
    managing_director: Optional[str] = None
    tax_id: Optional[str] = None
    eori_number: Optional[str] = None
    ust_id_nr: Optional[str] = None
    headquarters_city: Optional[str] = None
    court_district: Optional[str] = None
    court_registration_number: Optional[str] = None
    # Preferences
    target_annual_return: float = 10.00
    target_days_on_stock: int = 45
    # Branches
    branches: List[BranchOut] = []


class BusinessUpdate(Schema):
    name: Optional[str] = None
    address_country: Optional[str] = None
    address_city: Optional[str] = None
    address_street: Optional[str] = None
    address_street_number: Optional[str] = None
    address_postal_code: Optional[str] = None
    telephone_number: Optional[str] = None
    fax_number: Optional[str] = None
    email: Optional[str] = None
    bank_name: Optional[str] = None
    bank_bic_swift: Optional[str] = None
    bank_iban: Optional[str] = None
    managing_director: Optional[str] = None
    tax_id: Optional[str] = None
    eori_number: Optional[str] = None
    ust_id_nr: Optional[str] = None
    headquarters_city: Optional[str] = None
    court_district: Optional[str] = None
    court_registration_number: Optional[str] = None
    target_annual_return: Optional[float] = None
    target_days_on_stock: Optional[int] = None


class ErrorResponse(Schema):
    detail: str


class SuccessResponse(Schema):
    success: bool
    message: str


# =============================================================================
# Helper Functions
# =============================================================================

def get_user_business(request: HttpRequest) -> Business:
    """Get the authenticated user's business."""
    return request.user.business


def require_manager(request: HttpRequest) -> bool:
    """Check if user is a manager."""
    return request.user.is_manager


# =============================================================================
# Employee Management Endpoints
# =============================================================================

@settings_router.get("/users", response={200: List[EmployeeOut], 403: ErrorResponse})
def list_employees(request: HttpRequest):
    """List all employees for the business (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user management."}
    
    business = get_user_business(request)
    employees = User.objects.filter(
        business=business,
        is_manager=False
    ).order_by('username')
    
    return [
        {
            "id": emp.id,
            "username": emp.username,
            "is_active": emp.is_active,
            "transactions_access": emp.transactions_access,
            "legal_entities_access": emp.legal_entities_access,
        }
        for emp in employees
    ]


@settings_router.post("/users", response={200: EmployeeOut, 400: ErrorResponse, 403: ErrorResponse})
def create_employee(request: HttpRequest, payload: EmployeeCreate):
    """Create a new employee (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can create employees."}
    
    business = get_user_business(request)
    
    # Check if username already exists
    if User.objects.filter(username=payload.username).exists():
        return 400, {"detail": "Username already exists."}
    
    employee = User.objects.create_user(
        username=payload.username,
        password=payload.password,
        business=business,
        is_manager=False,
        transactions_access=payload.transactions_access,
        legal_entities_access=payload.legal_entities_access,
    )
    
    return {
        "id": employee.id,
        "username": employee.username,
        "is_active": employee.is_active,
        "transactions_access": employee.transactions_access,
        "legal_entities_access": employee.legal_entities_access,
    }


@settings_router.put("/users/{user_id}", response={200: EmployeeOut, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse})
def update_employee(request: HttpRequest, user_id: int, payload: EmployeeUpdate):
    """Update an employee (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can update employees."}
    
    business = get_user_business(request)
    
    try:
        employee = User.objects.get(id=user_id, business=business, is_manager=False)
    except User.DoesNotExist:
        return 404, {"detail": "Employee not found."}
    
    # Update fields if provided
    if payload.username is not None:
        # Check if new username already exists (excluding current user)
        if User.objects.filter(username=payload.username).exclude(id=user_id).exists():
            return 400, {"detail": "Username already exists."}
        employee.username = payload.username
    
    if payload.password is not None and payload.password.strip():
        employee.set_password(payload.password)
    
    if payload.is_active is not None:
        employee.is_active = payload.is_active
    
    if payload.transactions_access is not None:
        employee.transactions_access = payload.transactions_access
    
    if payload.legal_entities_access is not None:
        employee.legal_entities_access = payload.legal_entities_access
    
    employee.save()
    
    return {
        "id": employee.id,
        "username": employee.username,
        "is_active": employee.is_active,
        "transactions_access": employee.transactions_access,
        "legal_entities_access": employee.legal_entities_access,
    }


# =============================================================================
# Business Settings Endpoints
# =============================================================================

@settings_router.get("/business", response={200: BusinessOut, 403: ErrorResponse})
def get_business(request: HttpRequest):
    """Get business details (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can access business settings."}
    
    business = get_user_business(request)
    branches = Branch.objects.filter(business=business).order_by('name')
    
    return {
        "id": business.id,
        "name": business.name,
        "logo_url": business.logo.url if business.logo else None,
        "address_country": business.address_country,
        "address_city": business.address_city,
        "address_street": business.address_street,
        "address_street_number": business.address_street_number,
        "address_postal_code": business.address_postal_code,
        "telephone_number": business.telephone_number,
        "fax_number": business.fax_number,
        "email": business.email,
        "bank_name": business.bank_name,
        "bank_bic_swift": business.bank_bic_swift,
        "bank_iban": business.bank_iban,
        "managing_director": business.managing_director,
        "tax_id": business.tax_id,
        "eori_number": business.eori_number,
        "ust_id_nr": business.ust_id_nr,
        "headquarters_city": business.headquarters_city,
        "court_district": business.court_district,
        "court_registration_number": business.court_registration_number,
        "target_annual_return": float(business.target_annual_return) if business.target_annual_return else 10.00,
        "target_days_on_stock": business.target_days_on_stock,
        "branches": [
            {
                "id": b.id,
                "name": b.name,
                "address": b.address,
                "is_active": b.is_active,
            }
            for b in branches
        ],
    }


@settings_router.put("/business", response={200: SuccessResponse, 403: ErrorResponse})
def update_business(request: HttpRequest, payload: BusinessUpdate):
    """Update business details (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can update business settings."}
    
    business = get_user_business(request)
    
    # Update all provided fields
    update_fields = [
        'name', 'address_country', 'address_city', 'address_street',
        'address_street_number', 'address_postal_code', 'telephone_number',
        'fax_number', 'email', 'bank_name', 'bank_bic_swift', 'bank_iban',
        'managing_director', 'tax_id', 'eori_number', 'ust_id_nr',
        'headquarters_city', 'court_district', 'court_registration_number',
        'target_annual_return', 'target_days_on_stock'
    ]
    
    for field in update_fields:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(business, field, value)
    
    business.save()
    
    return {"success": True, "message": "Business settings updated successfully."}


@settings_router.post("/business/logo", response={200: SuccessResponse, 400: ErrorResponse, 403: ErrorResponse})
def upload_business_logo(request: HttpRequest, logo: UploadedFile = File(...)):
    """Upload business logo (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can update business settings."}
    
    business = get_user_business(request)
    
    # Validate file type
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if logo.content_type not in allowed_types:
        return 400, {"detail": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."}
    
    # Validate file size (max 5MB)
    if logo.size > 5 * 1024 * 1024:
        return 400, {"detail": "File too large. Maximum size is 5MB."}
    
    # Delete old logo if exists
    if business.logo:
        business.logo.delete(save=False)
    
    # Save new logo
    business.logo = logo
    business.save()
    
    return {"success": True, "message": "Logo updated successfully."}


# =============================================================================
# Branch Management Endpoints
# =============================================================================

@settings_router.post("/branches", response={200: BranchOut, 400: ErrorResponse, 403: ErrorResponse})
def create_branch(request: HttpRequest, payload: BranchCreate):
    """Create a new branch (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can create branches."}
    
    business = get_user_business(request)
    
    if not payload.name.strip():
        return 400, {"detail": "Branch name is required."}
    
    branch = Branch.objects.create(
        business=business,
        name=payload.name,
        address=payload.address,
        is_active=True,
    )
    
    return {
        "id": branch.id,
        "name": branch.name,
        "address": branch.address,
        "is_active": branch.is_active,
    }


@settings_router.put("/branches/{branch_id}", response={200: BranchOut, 400: ErrorResponse, 403: ErrorResponse, 404: ErrorResponse})
def update_branch(request: HttpRequest, branch_id: int, payload: BranchUpdate):
    """Update a branch (managers only)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can update branches."}
    
    business = get_user_business(request)
    
    try:
        branch = Branch.objects.get(id=branch_id, business=business)
    except Branch.DoesNotExist:
        return 404, {"detail": "Branch not found."}
    
    if payload.name is not None:
        if not payload.name.strip():
            return 400, {"detail": "Branch name cannot be empty."}
        branch.name = payload.name
    
    if payload.address is not None:
        branch.address = payload.address
    
    if payload.is_active is not None:
        branch.is_active = payload.is_active
    
    branch.save()
    
    return {
        "id": branch.id,
        "name": branch.name,
        "address": branch.address,
        "is_active": branch.is_active,
    }


# =============================================================================
# Manager Account Settings Endpoints
# =============================================================================

class ManagerProfileOut(Schema):
    id: int
    username: str
    email: str
    backup_email: Optional[str] = None


class UsernameUpdate(Schema):
    username: str


class PasswordChangeRequest(Schema):
    new_password: str
    confirm_password: str


class EmailChangeRequest(Schema):
    new_email: str


class BackupEmailChangeRequest(Schema):
    new_backup_email: str


@settings_router.get("/me", response={200: ManagerProfileOut, 403: ErrorResponse})
def get_manager_profile(request: HttpRequest):
    """Get the current manager's account profile."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user settings."}
    
    user = request.user
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "backup_email": user.backup_email or "",
    }


@settings_router.put("/me/username", response={200: SuccessResponse, 400: ErrorResponse, 403: ErrorResponse})
def update_username(request: HttpRequest, payload: UsernameUpdate):
    """Update the manager's username (instant, no email verification)."""
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user settings."}
    
    new_username = payload.username.strip()
    
    if not new_username or len(new_username) < 3:
        return 400, {"detail": "Username must be at least 3 characters."}
    
    # Check uniqueness (excluding current user)
    if User.objects.filter(username=new_username).exclude(id=request.user.id).exists():
        return 400, {"detail": "Username already exists."}
    
    request.user.username = new_username
    request.user.save()
    
    return {"success": True, "message": "Username updated successfully."}


@settings_router.post("/me/password", response={200: dict, 400: ErrorResponse, 403: ErrorResponse})
def request_password_change(request: HttpRequest, payload: PasswordChangeRequest):
    """
    Initiate a password change with email verification.
    
    Flow:
    1. Manager enters new password + confirm
    2. Verification email sent to manager's official email
    3. Manager clicks the link → password is updated via set-new-password endpoint
    """
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user settings."}
    
    user = request.user
    
    if payload.new_password != payload.confirm_password:
        return 400, {"detail": "Passwords do not match."}
    
    if len(payload.new_password) < 8:
        return 400, {"detail": "Password must be at least 8 characters."}
    
    # Import helpers from auth_api
    from .auth_api import (
        create_auth_request, get_backend_url, build_email_html,
        send_auth_email, AUTH_REQUEST_EXPIRY_MINUTES, get_client_ip
    )
    
    # Create auth request for password change verification
    auth_request = create_auth_request(
        user=user,
        action_type='password_change',
        payload={'new_password_hash': 'deferred'},  # Password set after verification
        ip_address=get_client_ip(request)
    )
    
    backend_url = get_backend_url()
    approval_url = f"{backend_url}/api/auth/approve/{auth_request.approval_token}"
    
    email_html = build_email_html(
        title="Confirm Password Change",
        body=f"Click the button below to confirm your password change for <strong>{user.username}</strong>.",
        button_text="Confirm Password Change",
        button_url=approval_url,
        expiry_mins=AUTH_REQUEST_EXPIRY_MINUTES
    )
    
    send_auth_email(user.email, "Confirm Password Change", approval_url, email_html)
    
    return {
        "success": True,
        "message": "Verification email sent. Check your email to confirm the password change.",
        "request_id": auth_request.request_id
    }


@settings_router.post("/me/email", response={200: dict, 400: ErrorResponse, 403: ErrorResponse})
def request_email_change(request: HttpRequest, payload: EmailChangeRequest):
    """
    Initiate email change with dual-stage verification.
    
    Flow:
    1. Verification email sent to CURRENT/OLD email
    2. After old email verified → confirmation sent to NEW email
    3. After new email confirmed → email updated in DB
    """
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user settings."}
    
    user = request.user
    new_email = payload.new_email.lower().strip()
    
    if not new_email:
        return 400, {"detail": "New email address is required."}
    
    if new_email == user.email:
        return 400, {"detail": "New email must be different from your current email."}
    
    if User.objects.filter(email__iexact=new_email).exclude(id=user.id).exists():
        return 400, {"detail": "This email is already in use by another account."}
    
    from .auth_api import (
        create_auth_request, get_backend_url, build_email_html,
        send_auth_email, AUTH_REQUEST_EXPIRY_MINUTES, get_client_ip
    )
    
    # Stage 1: Send verification to OLD email
    auth_request = create_auth_request(
        user=user,
        action_type='email_change_verify_old',
        payload={'new_email': new_email},
        ip_address=get_client_ip(request)
    )
    
    backend_url = get_backend_url()
    approval_url = f"{backend_url}/api/auth/approve/{auth_request.approval_token}"
    
    email_html = build_email_html(
        title="Confirm Email Change",
        body=f"Someone is trying to change the email for <strong>{user.username}</strong>'s account to <strong>{new_email}</strong>. Click the button to authorize this change.",
        button_text="Authorize Email Change",
        button_url=approval_url,
        expiry_mins=AUTH_REQUEST_EXPIRY_MINUTES
    )
    
    send_auth_email(user.email, "Confirm Email Change", approval_url, email_html)
    
    return {
        "success": True,
        "message": "Verification email sent to your current email. Check your inbox.",
        "request_id": auth_request.request_id
    }


@settings_router.post("/me/backup-email", response={200: dict, 400: ErrorResponse, 403: ErrorResponse})
def request_backup_email_change(request: HttpRequest, payload: BackupEmailChangeRequest):
    """
    Initiate backup email change with dual-stage verification.
    
    Flow:
    1. Verification email sent to OFFICIAL email
    2. After official email verified → confirmation sent to NEW backup email
    3. After new backup email confirmed → backup_email updated in DB
    """
    if not require_manager(request):
        return 403, {"detail": "Only managers can access user settings."}
    
    user = request.user
    new_backup = payload.new_backup_email.lower().strip()
    
    if not new_backup:
        return 400, {"detail": "New backup email address is required."}
    
    if new_backup == user.email:
        return 400, {"detail": "Backup email cannot be the same as your primary email."}
    
    if new_backup == user.backup_email:
        return 400, {"detail": "New backup email must be different from your current backup email."}
    
    from .auth_api import (
        create_auth_request, get_backend_url, build_email_html,
        send_auth_email, AUTH_REQUEST_EXPIRY_MINUTES, get_client_ip
    )
    
    # Stage 1: Send verification to OFFICIAL email
    auth_request = create_auth_request(
        user=user,
        action_type='backup_email_verify_official',
        payload={'new_backup_email': new_backup},
        ip_address=get_client_ip(request)
    )
    
    backend_url = get_backend_url()
    approval_url = f"{backend_url}/api/auth/approve/{auth_request.approval_token}"
    
    email_html = build_email_html(
        title="Confirm Backup Email Change",
        body=f"Click the button below to authorize changing the backup email for <strong>{user.username}</strong>'s account to <strong>{new_backup}</strong>.",
        button_text="Authorize Changes",
        button_url=approval_url,
        expiry_mins=AUTH_REQUEST_EXPIRY_MINUTES
    )
    
    send_auth_email(user.email, "Confirm Backup Email Change", approval_url, email_html)
    
    return {
        "success": True,
        "message": "Verification email sent to your official email. Check your inbox.",
        "request_id": auth_request.request_id
    }
