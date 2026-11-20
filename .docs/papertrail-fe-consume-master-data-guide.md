# Papertrail Backend - FE Consume Guide

> Dokumentasi ini untuk developer Frontend.
> Base API local default: `http://localhost:3000/api`
> Semua endpoint protected membutuhkan auth dari PilarGroup.

---

## 1. Auth Contract

Frontend login tetap dari PilarGroup.
Papertrail FE harus kirim token PilarGroup ke Papertrail Backend.

Header:

```http
Authorization: Bearer <PILARGROUP_TOKEN>
Content-Type: application/json
Accept: application/json
```

Local dev bisa tanpa Bearer jika backend `DEV_AUTH_ENABLED=true`.
Untuk FE normal tetap gunakan Bearer token.

Cek profile user:

```http
GET /api/auth/me
```

Response:

```json
{
  "success": true,
  "message": "Authenticated",
  "data": {
    "id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
    "internal_id": 7411,
    "username": "azi",
    "name": "Azi Fauzi",
    "email": null,
    "phone": "081285571510",
    "departments": [
      {
        "id": 8,
        "name": "IT",
        "class": "IT",
        "code": "SIT",
        "is_primary": 1
      }
    ],
    "companies": [
      {
        "id": "comp-pnm-0001",
        "code": "PNM",
        "name": "PT Pilar Niaga Makmur",
        "is_primary": 1
      }
    ],
    "department_id": 8,
    "department": "IT",
    "company_id": "comp-pnm-0001",
    "company": "PT Pilar Niaga Makmur",
    "job_position": "Programmer",
    "job_level": "Staff",
    "job_level_value": 1,
    "apps": ["papertrail"],
    "cv": 54,
    "department_class": "IT",
    "department_code": "SIT",
    "company_code": "PNM"
  }
}
```

Frontend boleh pakai data ini untuk default scope user, misalnya default department/company.

---

## 2. Response Format

Success detail:

```json
{
  "success": true,
  "message": "Data retrieved",
  "data": {}
}
```

Success list paginated:

```json
{
  "success": true,
  "message": "Data retrieved",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 1
  }
}
```

Error:

```json
{
  "success": false,
  "message": "Validation error",
  "errors": {
    "field_name": "error message"
  }
}
```

Common HTTP status:

```txt
200 OK
201 Created
400 Validation error / bad request
401 Unauthorized / token invalid
403 Forbidden / app or module permission denied
404 Not found
500 Internal server error
```

---

## 3. Permission Behavior

Papertrail punya permission per user, per module, per action.

Action mapping:

```txt
GET list/detail -> can_view
POST create     -> can_create
PUT update      -> can_update
PATCH status    -> can_deactivate
```

Kalau user tidak punya permission, response:

```json
{
  "success": false,
  "message": "Forbidden: missing permission for MASTER_VENDOR"
}
```

atau:

```json
{
  "success": false,
  "message": "Forbidden: create access for MASTER_VENDOR is not allowed"
}
```

FE harus handle 403 dengan pesan user-friendly seperti:

```txt
Anda tidak memiliki akses ke module ini.
```

---

## 4. Query Parameters Standard

Mayoritas list endpoint support:

```txt
page        number, default 1
limit       number, default 10, max 100
q           search keyword
is_active   0 or 1
```

Contoh:

```http
GET /api/master/vendors?page=1&limit=10&q=example&is_active=1
```

Beberapa endpoint punya filter tambahan.

---

## 5. Master Module Summary

### 5.1 Vendors

Purpose: master vendor utama. Vendor wajib di FRP.

Endpoint:

```txt
GET    /api/master/vendors
GET    /api/master/vendors/:id
POST   /api/master/vendors
PUT    /api/master/vendors/:id
PATCH  /api/master/vendors/:id/status
```

Create/update body:

```json
{
  "name": "PT Example Vendor"
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, is_active
```

Relation:

```txt
master_vendors -> master_vendor_bank_accounts
master_vendors -> frp_requests.vendor_id
master_vendors -> rp_requests.vendor_id optional if vendor_source MASTER
```

---

### 5.2 Banks

Purpose: master bank untuk vendor bank account.

Endpoint:

```txt
GET    /api/master/banks
GET    /api/master/banks/:id
POST   /api/master/banks
PUT    /api/master/banks/:id
PATCH  /api/master/banks/:id/status
```

Create/update body:

```json
{
  "code": "BCA",
  "name": "Bank Central Asia",
  "sort_order": 1
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, is_active
```

Relation:

```txt
master_banks -> master_vendor_bank_accounts.bank_id
```

---

### 5.3 Vendor Bank Accounts

Purpose: rekening bank per vendor. Vendor bisa punya banyak rekening.

Endpoint:

```txt
GET    /api/master/vendor-bank-accounts
GET    /api/master/vendor-bank-accounts/:id
POST   /api/master/vendor-bank-accounts
PUT    /api/master/vendor-bank-accounts/:id
PATCH  /api/master/vendor-bank-accounts/:id/status
```

Create/update body:

```json
{
  "vendor_id": 1,
  "bank_id": 1,
  "account_number": "1234567890",
  "account_name": "PT Example Vendor",
  "is_primary": 1
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, vendor_id, bank_id, is_active
```

Notes:

```txt
- vendor_id must exist and active.
- bank_id must exist and active.
- unique per vendor_id + bank_id + account_number.
- if is_primary = 1, backend clears other primary account for same vendor.
```

Relation:

```txt
FRP can select vendor_bank_account_id optionally.
If selected, FRP stores bank/account snapshot.
```

---

### 5.4 Budget Types

Purpose: type budget seperti ASSET/COST.

Endpoint:

```txt
GET    /api/master/budget-types
GET    /api/master/budget-types/:id
POST   /api/master/budget-types
PUT    /api/master/budget-types/:id
PATCH  /api/master/budget-types/:id/status
```

Create/update body:

```json
{
  "code": "ASSET",
  "name": "Aktiva",
  "description": "Budget type for asset"
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, is_active
```

Relation:

```txt
master_budget_types -> master_budgets.budget_type_id
```

---

### 5.5 Budgets

Purpose: master budget from GSheet/import/reference.

Endpoint:

```txt
GET    /api/master/budgets
GET    /api/master/budgets/:id
POST   /api/master/budgets
PUT    /api/master/budgets/:id
PATCH  /api/master/budgets/:id/status
```

Create/update body:

```json
{
  "budget_code": "FIN01",
  "company_id": "comp-pnm-0001",
  "company_code_snapshot": "PNM",
  "company_name_snapshot": "PT Pilar Niaga Makmur",
  "department_id": 7,
  "department_name_snapshot": "Finance",
  "department_class_snapshot": "Finance",
  "department_code_snapshot": "FIN",
  "class_department_id": 7,
  "class_name_snapshot": "Finance",
  "class_class_snapshot": "Finance",
  "class_code_snapshot": "FIN",
  "budget_type_id": 1,
  "project_name": "1620.00.00 - Transit Aktiva Tetap",
  "budget_amount": 1200000000,
  "budget_reserved": 0,
  "budget_used": 0,
  "budget_remaining": 1200000000,
  "period_year": 2026,
  "period_month": 7
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, company_id, department_id, class_department_id, budget_type_id, period_year, period_month, is_active
```

Important relation:

```txt
FRP/RP item must select budget_id.
Budget must belong to selected header department_id + class_department_id.
Budget amount movement is handled later by FRP/RP create/approve/reject/revert.
```

---

### 5.6 Budget Access Rules

Purpose: dynamic cross budget access by module and department.

Endpoint:

```txt
GET    /api/master/budget-access-rules
GET    /api/master/budget-access-rules/:id
POST   /api/master/budget-access-rules
PUT    /api/master/budget-access-rules/:id
PATCH  /api/master/budget-access-rules/:id/status
```

Create/update body:

```json
{
  "module": "FRP",
  "access_type": "CROSS_BUDGET",
  "department_id": 1,
  "department_name_snapshot": "HCGA",
  "department_class_snapshot": "HCGA",
  "department_code_snapshot": "HCG"
}
```

Allowed `module`:

```txt
FRP
RP
```

Allowed `access_type`:

```txt
CROSS_BUDGET
```

Query:

```txt
page, limit, q, module, access_type, department_id, is_active
```

Relation:

```txt
Used later to decide which department can access cross budget for FRP/RP.
Do not hardcode HCGA/IT/Marketing in FE or BE.
```

---

### 5.7 FRP Document Typespaper

Purpose: FRP checklist documents. Multi-select in FRP.

Endpoint:

```txt
GET    /api/master/frp-document-types
GET    /api/master/frp-document-types/:id
POST   /api/master/frp-document-types
PUT    /api/master/frp-document-types/:id
PATCH  /api/master/frp-document-types/:id/status
```

Create/update body:

```json
{
  "code": "FORM_REQUEST_PAYMENT",
  "name": "Form Request Payment",
  "description": "FRP checklist document",
  "sort_order": 1
}
```

Query:

```txt
page, limit, q, is_active
```

Relation:

```txt
FRP create sends selected document_type_ids.
Backend stores selected docs into frp_request_documents with snapshots.
```

---

### 5.8 External Document Types

Purpose: dropdown external document type in FRP.

Endpoint:

```txt
GET    /api/master/external-document-types
GET    /api/master/external-document-types/:id
POST   /api/master/external-document-types
PUT    /api/master/external-document-types/:id
PATCH  /api/master/external-document-types/:id/status
```

Create/update body:

```json
{
  "code": "INVOICE",
  "name": "Invoice",
  "description": "External invoice document",
  "sort_order": 1
}
```

Relation:

```txt
FRP header uses external_document_type_id optional.
```

---

### 5.9 Payment Methods

Purpose: payment method for FRP.

Endpoint:

```txt
GET    /api/master/payment-methods
GET    /api/master/payment-methods/:id
POST   /api/master/payment-methods
PUT    /api/master/payment-methods/:id
PATCH  /api/master/payment-methods/:id/status
```

Create/update body:

```json
{
  "code": "TRANSFER",
  "name": "Transfer",
  "description": "Bank transfer payment",
  "sort_order": 1
}
```

Relation:

```txt
FRP header requires payment_method_id.
```

---

### 5.10 RP Destination Departments

Purpose: dynamic RP destination department list.

Endpoint:

```txt
GET    /api/master/rp-destination-departments
GET    /api/master/rp-destination-departments/:id
POST   /api/master/rp-destination-departments
PUT    /api/master/rp-destination-departments/:id
PATCH  /api/master/rp-destination-departments/:id/status
```

Create/update body:

```json
{
  "department_id": 8,
  "department_name_snapshot": "IT",
  "department_class_snapshot": "IT",
  "department_code_snapshot": "SIT",
  "is_short_flow_allowed": 1
}
```

Query:

```txt
page, limit, q, department_id, is_short_flow_allowed, is_active
```

Relation:

```txt
RP create requires destination_department_id.
Destination department must exist and active in this table.
```

---

### 5.11 RP Checker Rules

Purpose: job_position rule for RP destination checker.

Endpoint:

```txt
GET    /api/master/rp-checker-rules
GET    /api/master/rp-checker-rules/:id
POST   /api/master/rp-checker-rules
PUT    /api/master/rp-checker-rules/:id
PATCH  /api/master/rp-checker-rules/:id/status
```

Create/update body:

```json
{
  "destination_department_rule_id": 1,
  "job_position": "IT Support"
}
```

Query:

```txt
page, limit, q, destination_department_rule_id, department_id, is_active
```

Relation:

```txt
RP destination checker action validates req.user.job_position against active rule for destination department.
```

---

### 5.12 RP Payment Categories

Purpose: dropdown category payment for RP.

Endpoint:

```txt
GET    /api/master/rp-payment-categories
GET    /api/master/rp-payment-categories/:id
POST   /api/master/rp-payment-categories
PUT    /api/master/rp-payment-categories/:id
PATCH  /api/master/rp-payment-categories/:id/status
```

Create/update body:

```json
{
  "code": "NEW_ITEM_PROCUREMENT",
  "name": "Pengandaan Barang Baru",
  "description": "New item procurement",
  "sort_order": 1
}
```

Relation:

```txt
RP header requires payment_category_id.
```

---

## 6. Permission Management

### 6.1 Permission Modules

Purpose: list all permission modules for dropdown.

Endpoint:

```txt
GET /api/master/permission-modules
```

Query:

```txt
module_group, is_active, q
```

Response item:

```json
{
  "id": 1,
  "module_code": "MASTER_VENDOR",
  "module_name": "Master Vendor",
  "module_group": "MASTER",
  "description": null,
  "is_active": 1,
  "sort_order": 1,
  "created_at": "...",
  "updated_at": "..."
}
```

### 6.2 User Module Permissions

Purpose: assign user access per module/action.

Endpoint:

```txt
GET    /api/master/user-module-permissions
GET    /api/master/user-module-permissions/:id
POST   /api/master/user-module-permissions
PUT    /api/master/user-module-permissions/:id
PATCH  /api/master/user-module-permissions/:id/status
```

Create/update body:

```json
{
  "user_id": "a340b7c7-4fe2-4760-a3ac-848ceef72306",
  "username_snapshot": "chandra",
  "name_snapshot": "Chandra",
  "module_id": 1,
  "can_view": 1,
  "can_create": 0,
  "can_update": 0,
  "can_deactivate": 0
}
```

Status body:

```json
{
  "is_active": 1
}
```

Query:

```txt
page, limit, q, user_id, module_id, module_code, is_active
```

Frontend note:

```txt
- User list source should come from PilarGroup directory endpoint / separate agreed source.
- Papertrail only stores snapshot: user_id, username_snapshot, name_snapshot.
- user_id does not FK to central_users.
```

---

## 7. Department/Class Handling for FE

When creating FRP/RP/Budget, FE must send both:

```txt
department_id
class_department_id
```

For department with no child:

```txt
class_department_id = department_id
```

For department with child/class:

```txt
class_department_id = selected child department id
```

Also send snapshots when endpoint requires them:

```txt
department_name_snapshot
department_class_snapshot
department_code_snapshot
class_name_snapshot
class_class_snapshot
class_code_snapshot
```

---

## 8. Planned FRP Consume Contract

Not fully implemented yet, but FE should prepare this shape.

Create FRP body concept:

```json
{
  "company_id": "comp-pnm-0001",
  "company_code_snapshot": "PNM",
  "company_name_snapshot": "PT Pilar Niaga Makmur",
  "department_id": 8,
  "department_name_snapshot": "IT",
  "department_class_snapshot": "IT",
  "department_code_snapshot": "SIT",
  "class_department_id": 8,
  "class_name_snapshot": "IT",
  "class_class_snapshot": "IT",
  "class_code_snapshot": "SIT",
  "frp_date": "2026-07-02",
  "description": "Payment request description",
  "currency_code": "IDR",
  "exchange_rate": 1,
  "vendor_id": 1,
  "vendor_bank_account_id": 1,
  "internal_po_number": "PO-001",
  "external_document_type_id": 1,
  "external_document_number": "INV-001",
  "payment_method_id": 1,
  "payment_date": "2026-07-05",
  "destination_bank_name": "Bank Central Asia",
  "destination_bank_account": "1234567890",
  "destination_bank_account_name": "PT Example Vendor",
  "document_type_ids": [1, 2, 3],
  "items": [
    {
      "budget_id": 1,
      "memo": "Payment item memo",
      "quantity": 1,
      "unit_price": 100000,
      "amount": 100000
    }
  ]
}
```

Important:

```txt
- vendor_id required.
- vendor_bank_account_id optional.
- payment_method_id required.
- items required.
- document_type_ids optional/multi.
- Budget will be reserved on create.
```

---

## 9. Planned RP Consume Contract

Not fully implemented yet, but FE should prepare this shape.

Create RP body concept:

```json
{
  "company_id": "comp-pnm-0001",
  "company_code_snapshot": "PNM",
  "company_name_snapshot": "PT Pilar Niaga Makmur",
  "department_id": 7,
  "department_name_snapshot": "Finance",
  "department_class_snapshot": "Finance",
  "department_code_snapshot": "FIN",
  "class_department_id": 7,
  "class_name_snapshot": "Finance",
  "class_class_snapshot": "Finance",
  "class_code_snapshot": "FIN",
  "destination_department_id": 8,
  "date_required": "2026-07-10",
  "description": "Request purchase description",
  "vendor_source": "MASTER",
  "vendor_id": 1,
  "vendor_name_snapshot": "PT Example Vendor",
  "payment_category_id": 1,
  "pic_name": "Azi Fauzi",
  "items": [
    {
      "budget_id": 1,
      "memo": "Laptop procurement",
      "purchase_link": "https://example.com/item",
      "quantity": 1,
      "unit_price": 15000000,
      "amount": 15000000
    }
  ]
}
```

Manual vendor mode:

```json
{
  "vendor_source": "MANUAL",
  "vendor_id": null,
  "vendor_name_snapshot": "Manual Vendor Name"
}
```

Important:

```txt
- destination_department_id must exist in /api/master/rp-destination-departments.
- payment_category_id required.
- vendor_source must be MASTER or MANUAL.
- items required.
- Budget will be reserved on create.
```

---

## 10. UI Notes

Recommended FE pages:

```txt
Master Vendor
Master Bank
Vendor Bank Account
Budget Type
Budget
Budget Access Rule
FRP Document Type
External Document Type
Payment Method
RP Destination Department
RP Checker Rule
RP Payment Category
Permission Management
```

Recommended dropdown source:

```txt
Vendor dropdown              -> GET /api/master/vendors?is_active=1
Bank dropdown                -> GET /api/master/banks?is_active=1
Vendor account dropdown      -> GET /api/master/vendor-bank-accounts?vendor_id=<id>&is_active=1
Budget type dropdown         -> GET /api/master/budget-types?is_active=1
Budget dropdown              -> GET /api/master/budgets?department_id=<id>&class_department_id=<id>&is_active=1
FRP doc type checklist       -> GET /api/master/frp-document-types?is_active=1
External doc type dropdown   -> GET /api/master/external-document-types?is_active=1
Payment method dropdown      -> GET /api/master/payment-methods?is_active=1
RP destination dropdown      -> GET /api/master/rp-destination-departments?is_active=1
RP payment category dropdown -> GET /api/master/rp-payment-categories?is_active=1
Permission module dropdown   -> GET /api/master/permission-modules?is_active=1
```

No hard delete UI. Use activate/deactivate.
