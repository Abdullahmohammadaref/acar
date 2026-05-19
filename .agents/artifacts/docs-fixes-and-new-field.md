# Documentation: Key Number Management & Choices Stability Fixes

## Overview
This document summarizes the implementation of the "Key Number" vehicle management feature and the stability improvements made to the Choices Management page.

## Changes

### 1. Key Number Management
- **Model**: Created `KeyNumber` model with `OneToOne` relationship to `Vehicle`.
- **API**: 
    - Implemented `KeyNumberOut` schema and integrated it into `get_all_choices` and `VehicleDetailOut`.
    - Added logic to `update_vehicle` and `create_vehicle` to handle key number assignment.
    - Automated key clearance when a vehicle is sold, deleted, or deactivated.
- **UI**:
    - Added "Key Numbers" tab to `ChoicesManagementPage`.
    - Integrated "Key Number" selector into `VehicleForm` (Identification section).
    - Displayed assigned vehicle info next to key numbers in management view.

### 2. Choices Management Stability Fixes
- **JSON Migration**: Refactored `update_choice` API and `updateMutation` frontend to use JSON payloads instead of `FormData`. This resolves issues where PATCH requests were failing due to incorrect content type or multipart parsing.
- **Robust Error Handling**:
    - Replaced browser `confirm()` calls in `handleDeactivate` with proper TanStack Query `onError` handlers.
    - Added UI alerts/notifications for mutation failures (update, deactivate, reactivate).
    - Improved error logging in both backend and frontend.

### 3. Localization
- Added translations for all new features and error messages in `en.json` and `de.json`.
- Key terms:
    - English: "Key Numbers", "Add Key Number", "Manage Key Numbers".
    - German: "Schlüsselnummern", "Schlüsselnummer hinzufügen", "Fahrzeug-Schlüsselnummern verwalten".

## Technical Implementation Details

### Backend
- **File**: `backend/manager/models.py`
    - Added `KeyNumber` class.
- **File**: `backend/manager/api.py`
    - Added `create_key_number`, `deactivate_key_number`, `reactivate_key_number`.
    - Updated `update_choice` to accept `ChoiceUpdatePayload`.
    - Updated `get_all_choices` to include `key_numbers`.
- **File**: `backend/manager/schemas.py`
    - Added `KeyNumberOut`, `ChoiceUpdatePayload`.
    - Added `key_number_id` to `VehicleCreate` and `VehicleUpdate`.

### Frontend
- **File**: `frontend/src/pages/ChoicesManagementPage.tsx`
    - Added `key_number` to `TAB_ORDER`.
    - Updated mutations to handle JSON and errors.
    - Enhanced `renderChoiceTypeContent` to show vehicle metadata.
- **File**: `frontend/src/components/vehicles/VehicleForm.tsx`
    - Integrated `key_number_id` field.
- **File**: `frontend/src/lib/validations.ts`
    - Added `key_number_id` to Zod schemas.

## Verification Steps
1. Navigate to **Settings > Choices Management**.
2. Go to the **Key Numbers** tab.
3. Add a new key number (e.g., "101").
4. Go to **Vehicles**, edit a vehicle, and assign key "101".
5. Verify the key appears as "assigned" in Choices Management.
6. Change vehicle status to "Sold" and verify the key is released.
