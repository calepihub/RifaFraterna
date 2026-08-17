# Security Specification & Threat Model (TDD)

This document outlines the data invariants, security boundaries, and threat testing scenarios ("The Dirty Dozen" payloads) for the **Raffle Sales & Control** application.

---

## 1. Data Invariants & Access Control Policy

### Invariants:
1. **Numbers are Immutable unless state changes are legal**: 
   - A number can only transition from `available` -> `reserved` via a public transaction.
   - A number can only transition from `reserved` -> `sold` or `reserved` -> `available` via Admin actions.
   - An already `sold` number is completely locked and can never be modified except by an Admin.
2. **Reservations ownership**:
   - Creating a reservation is public, but status must always start as `pending`.
   - Modifying a reservation's status (`approved` or `rejected`) is strictly restricted to the Admin.
   - Reservation details (Name, Phone) cannot be modified after creation.
3. **Identity Verification**:
   - Admin operations require Google Authentication with the verified email `tazmaniacrvg@gmail.com`.

---

## 2. The "Dirty Dozen" Threat Payloads (Test Scenarios)

These payloads represents unauthorized attempts to bypass frontend logic and compromise the database. All of these must fail with `PERMISSION_DENIED` in the Firestore Security Rules.

### Threat 1: Direct Write as "Sold" (Public User)
- **Path**: `/numbers/42`
- **Payload**: `{ "id": "42", "status": "sold", "buyerName": "Hacker", "buyerPhone": "11999999999", "updatedAt": "request.time" }`
- **Intent**: Bypassing payment and claiming a number directly.
- **Expected**: `PERMISSION_DENIED`

### Threat 2: Overwriting an Existing Reservation (Public User)
- **Path**: `/numbers/07` (currently status: `sold` or `reserved`)
- **Payload**: `{ "id": "07", "status": "reserved", "buyerName": "Hacker", "buyerPhone": "11999999999", "updatedAt": "request.time" }`
- **Intent**: Stealing a number that is already reserved or sold.
- **Expected**: `PERMISSION_DENIED`

### Threat 3: Creating an Already Approved Reservation (Public User)
- **Path**: `/reservations/attacker_id`
- **Payload**: `{ "id": "attacker_id", "buyerName": "Hacker", "numbers": ["07"], "status": "approved", "totalValue": 7.33, "createdAt": "request.time", "updatedAt": "request.time" }`
- **Intent**: Forging an approved purchase record.
- **Expected**: `PERMISSION_DENIED`

### Threat 4: Status Transition Hijack - Overriding Reservation Status (Public User)
- **Path**: `/reservations/valid_id` (currently `pending`)
- **Payload**: `{ "status": "approved" }`
- **Intent**: Modifying a transaction status directly to bypass Admin approval.
- **Expected**: `PERMISSION_DENIED`

### Threat 5: Poison ID String Length (Public User)
- **Path**: `/numbers/00000000000000000000000000000000000000000000000000` (malformed ID)
- **Payload**: `{ "id": "000...", "status": "reserved" }`
- **Intent**: Denial of Wallet/Resource poisoning via extremely long ID strings.
- **Expected**: `PERMISSION_DENIED`

### Threat 6: Modifying Saved Reservation Details (Public User)
- **Path**: `/reservations/valid_id`
- **Payload**: `{ "buyerName": "New Name", "buyerPhone": "New Phone" }`
- **Intent**: Tampering with contact details of an existing purchase.
- **Expected**: `PERMISSION_DENIED`

### Threat 7: Price Manipulation - Setting Value to 0 (Public User)
- **Path**: `/reservations/attacker_id`
- **Payload**: `{ "id": "attacker_id", "buyerName": "Hacker", "buyerPhone": "11999999999", "numbers": ["01", "02"], "status": "pending", "totalValue": 0.00, "createdAt": "request.time", "updatedAt": "request.time" }`
- **Intent**: Ordering tickets for free.
- **Expected**: `PERMISSION_DENIED` (Validated on client side or via strict schema rules checking math or format)

### Threat 8: Admin Spoofing via Unverified Email (Unverified User)
- **Path**: `/reservations/some_id`
- **Request Auth**: `{ "uid": "fake_admin", "token": { "email": "tazmaniacrvg@gmail.com", "email_verified": false } }`
- **Payload**: `{ "status": "approved" }`
- **Intent**: Accessing Admin console using an unverified account.
- **Expected**: `PERMISSION_DENIED`

### Threat 9: Admin Spoofing via Arbitrary Email (Public User)
- **Path**: `/reservations/some_id`
- **Request Auth**: `{ "uid": "malicious_user", "token": { "email": "attacker@gmail.com", "email_verified": true } }`
- **Payload**: `{ "status": "approved" }`
- **Intent**: Attempting admin write operations with a standard verified Google account.
- **Expected**: `PERMISSION_DENIED`

### Threat 10: Deleting Raffle Numbers (Public User)
- **Path**: `/numbers/05`
- **Method**: `DELETE`
- **Intent**: Sabotaging the raffle system by deleting numbers.
- **Expected**: `PERMISSION_DENIED`

### Threat 11: Bulk Harvesting of All Reservations (Unauthenticated Public User)
- **Path**: `/reservations`
- **Method**: `LIST` (without specific ID query or Admin privilege)
- **Intent**: Scrape sensitive buyer information (Names, WhatsApp numbers, Emails).
- **Expected**: `PERMISSION_DENIED`

### Threat 12: Injection of Malformed Number Schema (Public User)
- **Path**: `/numbers/08`
- **Payload**: `{ "id": "08", "status": "reserved", "buyerName": { "nested": "object_instead_of_string" }, "updatedAt": "request.time" }`
- **Intent**: Crashing the frontend rendering engine via type poisoning.
- **Expected**: `PERMISSION_DENIED`

---

## 3. Security Rules Implementation Framework

These tests are executed against the security constraints detailed in `firestore.rules`.
All standard updates must evaluate through `isValidRaffleNumber()` and `isValidReservation()`, and all admin actions must run through `isAdmin()`.
