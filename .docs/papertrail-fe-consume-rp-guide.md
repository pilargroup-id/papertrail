# Dokumentasi FE - Request Purchase (RP)

Dokumentasi ini menjelaskan cara consume endpoint RP dari Frontend, termasuk flow status RP, endpoint per role, behavior budget, short flow, normal flow, reject, revert, dan catatan implementasi UI.

---

## 1. Konsep Utama RP

RP atau Request Purchase adalah form permintaan pembelian dari user department kepada department tujuan procurement/checker, misalnya IT atau HCGA.

RP belum membuat pembayaran final. Karena itu, saat RP dibuat, budget hanya masuk ke status **RESERVED**, bukan **USED/FINALIZED**.

Budget baru akan difinalisasi ketika nanti RP dibuat menjadi FRP. Jadi selama masih di RP, budget hanya ditahan supaya tidak dipakai request lain.

---

## 2. Base Endpoint

```txt
/api/rp
```

Semua endpoint RP membutuhkan user yang sudah authenticated lewat auth app Papertrail.

Contoh base variable saat testing:

```bash
BASE_URL="http://localhost:3001/api"
```

---

## 3. Status RP

| Status | Arti | Role yang Sedang Menunggu Action |
|---|---|---|
| `PENDING_REQUESTER_MANAGER` | RP baru dibuat dan menunggu approval manager dari department requester | Manager Divisi Requester |
| `PENDING_DESTINATION_CHECKER` | RP sudah disetujui manager requester dan menunggu checker department tujuan | Checker Department Tujuan |
| `PENDING_DESTINATION_MANAGER` | RP sudah dicek checker dan menunggu final approval manager department tujuan | Manager Department Tujuan |
| `APPROVED` | RP sudah final approved oleh manager department tujuan | Siap diproses ke Create FRP from RP |
| `REJECTED` | RP ditolak di salah satu step | Final, budget release |
| `VOIDED` | RP dibatalkan pada fase procurement sebelum dibuat FRP | Final, budget release |

---

## 4. Flow Type RP

RP punya 2 jenis flow:

```txt
NORMAL
SHORT
```

### 4.1 NORMAL Flow

NORMAL flow dipakai kalau department requester berbeda dengan department tujuan.

Contoh:

```txt
Finance request ke IT
Finance request ke HCGA
Marketing request ke IT
```

Flow:

```txt
Create RP
-> PENDING_REQUESTER_MANAGER
-> requester manager approve
-> PENDING_DESTINATION_CHECKER
-> destination checker check/edit
-> PENDING_DESTINATION_MANAGER
-> destination manager approve
-> APPROVED
```

### 4.2 SHORT Flow

SHORT flow dipakai kalau department requester sama dengan department tujuan dan department tersebut mengizinkan short flow.

Contoh:

```txt
IT request ke IT
HCGA request ke HCGA
```

Flow:

```txt
Create RP
-> PENDING_DESTINATION_MANAGER
-> destination manager approve
-> APPROVED
```

SHORT flow melewati:

```txt
PENDING_REQUESTER_MANAGER
PENDING_DESTINATION_CHECKER
```

Karena requester manager dan destination manager berada pada department yang sama.

---

## 5. Status Budget dalam RP

Budget movement RP berbeda dengan FRP.

| Action RP | Movement Budget | Penjelasan |
|---|---|---|
| Create RP | `RESERVE` | Budget ditahan sebesar total RP |
| Requester Manager Approve | Tidak ada movement | Budget tetap reserved |
| Destination Checker Check tanpa perubahan amount | Tidak ada perubahan nominal, bisa tetap reserved | Budget tetap reserved |
| Destination Checker Check dengan perubahan amount | `RELEASE` amount lama lalu `RESERVE` amount baru | Budget disesuaikan dengan hasil checker |
| Destination Manager Approve | Tidak ada `FINALIZE` | Budget tetap reserved walaupun RP sudah approved |
| Reject di step manapun | `RELEASE` | Budget reserved dikembalikan |
| Revert di step manapun | Tidak ada movement | Revert hanya mundur step approval, bukan cancel budget |
| Create FRP from RP | RP reserve akan dilepas, lalu FRP reserve/finalize sesuai flow FRP | Ini proses lanjutan, bukan bagian endpoint RP core |
| Void Procurement | `RELEASE` | RP dibatalkan sebelum dibuat FRP |

### Prinsip penting

```txt
RP APPROVED bukan berarti budget USED.
RP APPROVED tetap RESERVED.
Budget USED/FINALIZED terjadi saat proses FRP.
```

---

## 6. Endpoint List RP

### Request

```http
GET /api/rp
```

Optional query:

```txt
?page=1
&limit=10
&status=PENDING_DESTINATION_MANAGER
&search=RP-SIT
```

Contoh:

```bash
curl -X GET "$BASE_URL/rp?limit=10"
```

### Response usage FE

FE menggunakan endpoint ini untuk menampilkan list RP sesuai akses user login.

Rule visibility umum:

| User | List yang Terlihat |
|---|---|
| Requester | RP yang dia buat |
| Manager requester | RP department/class miliknya yang perlu approval |
| Destination checker | RP yang masuk department tujuan dan status checker |
| Destination manager | RP department tujuan yang perlu final approval |
| IT SuperUser | Bisa melihat lebih luas sesuai rule backend |

---

## 7. Endpoint Detail RP

### Request

```http
GET /api/rp/:id
```

Contoh:

```bash
curl -X GET "$BASE_URL/rp/$RP_ID"
```

### Data penting untuk FE

Dari detail RP, FE perlu membaca:

```txt
id
rp_number
status
flow_type
department/class requester
destination_department
requested_by
items
approval_logs
header_histories
item_histories
budget snapshots
```

FE sebaiknya menggunakan `status` dan `flow_type` untuk menentukan tombol action yang muncul.

---

## 8. Endpoint Create RP

### Request

```http
POST /api/rp
```

### Body NORMAL Flow contoh Finance ke IT

```json
{
  "department_id": 7,
  "class_department_id": 7,
  "destination_department_id": 8,
  "date_required": "2026-07-20",
  "vendor_source": "MASTER",
  "vendor_id": 1,
  "payment_category_id": 1,
  "pic_name": "Finance User",
  "description": "Request pembelian perangkat IT",
  "items": [
    {
      "budget_id": 1,
      "memo": "Pembelian mouse wireless",
      "purchase_link": "https://example.com/mouse",
      "quantity": 1,
      "unit_price": 50000,
      "amount": 50000
    }
  ],
  "notes": "Submit RP"
}
```

### Body SHORT Flow contoh IT ke IT

```json
{
  "department_id": 8,
  "class_department_id": 8,
  "destination_department_id": 8,
  "date_required": "2026-07-20",
  "vendor_source": "MASTER",
  "vendor_id": 1,
  "payment_category_id": 1,
  "pic_name": "Azi",
  "description": "Request pembelian device IT",
  "items": [
    {
      "budget_id": 1,
      "memo": "Pembelian keyboard",
      "purchase_link": "https://example.com/keyboard",
      "quantity": 1,
      "unit_price": 100000,
      "amount": 100000
    }
  ],
  "notes": "Submit RP IT"
}
```

### Expected response NORMAL

```txt
status = PENDING_REQUESTER_MANAGER
flow_type = NORMAL
budget movement = RESERVE
```

### Expected response SHORT

```txt
status = PENDING_DESTINATION_MANAGER
flow_type = SHORT
budget movement = RESERVE
```

---

## 9. Endpoint Update RP

### Request

```http
PUT /api/rp/:id
```

Update hanya untuk RP yang masih di awal flow, yaitu sebelum masuk proses approval/checker lanjutan.

Umumnya status yang boleh update:

```txt
PENDING_REQUESTER_MANAGER
```

### Catatan FE

FE sebaiknya hanya tampilkan tombol edit ketika backend status masih editable.

Jika RP sudah masuk:

```txt
PENDING_DESTINATION_CHECKER
PENDING_DESTINATION_MANAGER
APPROVED
REJECTED
VOIDED
```

maka form edit requester sebaiknya tidak ditampilkan.

---

## 10. Endpoint Requester Manager Approve

Endpoint ini hanya untuk NORMAL flow.

### Request

```http
POST /api/rp/:id/requester-manager-approve
```

### Body

```json
{
  "notes": "Approve by requester manager"
}
```

### Contoh

```bash
curl -X POST "$BASE_URL/rp/$RP_ID/requester-manager-approve" \
-H "Content-Type: application/json" \
-d '{
  "notes": "Approve by requester manager"
}'
```

### Required current status

```txt
PENDING_REQUESTER_MANAGER
```

### Expected result

```txt
status: PENDING_DESTINATION_CHECKER
budget: tetap RESERVED, tidak ada movement baru
```

### FE rule

Tampilkan tombol ini jika:

```txt
status = PENDING_REQUESTER_MANAGER
user login = Manager Divisi Requester
```

---

## 11. Endpoint Requester Manager Reject

### Request

```http
POST /api/rp/:id/requester-manager-reject
```

### Body

```json
{
  "reason": "Budget tidak disetujui"
}
```

### Required current status

```txt
PENDING_REQUESTER_MANAGER
```

### Expected result

```txt
status = REJECTED
rejected_stage = REQUESTER_MANAGER
budget movement = RELEASE
```

### FE rule

Tampilkan tombol reject ini jika:

```txt
status = PENDING_REQUESTER_MANAGER
user login = Manager Divisi Requester
```

---

## 12. Endpoint Destination Checker Check/Edit

Endpoint ini hanya untuk NORMAL flow setelah requester manager approve.

### Request

```http
POST /api/rp/:id/destination-check
```

### Required current status

```txt
PENDING_DESTINATION_CHECKER
```

### Body tanpa edit item

Jika checker hanya pass tanpa edit item:

```json
{
  "vendor_source": "MASTER",
  "vendor_id": 1,
  "description": "Checked by destination checker",
  "notes": "Checker pass without item changes"
}
```

### Body edit sebagian item

Jika RP punya 3 item dan checker hanya revisi item ke-3, FE cukup kirim item yang direvisi saja.

```json
{
  "vendor_source": "MASTER",
  "vendor_id": 1,
  "description": "Checked by destination checker",
  "items": [
    {
      "rp_request_item_id": "item-3-id",
      "memo": "Item 3 direvisi checker",
      "purchase_link": "https://example.com/item-3-new",
      "quantity": 1,
      "unit_price": 60000,
      "amount": 60000
    }
  ],
  "notes": "Checker only updated item 3"
}
```

### Behavior item merge

Jika RP punya 3 item:

```txt
Item 1 tidak dikirim -> tetap pakai data lama
Item 2 tidak dikirim -> tetap pakai data lama
Item 3 dikirim -> update pakai data baru dari checker
```

Checker tidak wajib mengirim semua item.

### Expected result

```txt
status = PENDING_DESTINATION_MANAGER
```

### Budget behavior

Jika tidak ada perubahan total amount:

```txt
budget tetap RESERVED
```

Jika amount berubah:

```txt
RELEASE amount lama
RESERVE amount baru
```

### History behavior

```txt
header history dibuat jika vendor/description berubah
item history dibuat hanya untuk item yang berubah
```

### FE rule

Tampilkan action checker jika:

```txt
status = PENDING_DESTINATION_CHECKER
user login = checker department tujuan yang terdaftar di master_rp_checker_rules
```

---

## 13. Endpoint Destination Checker Reject

### Request

```http
POST /api/rp/:id/destination-check-reject
```

### Body

```json
{
  "reason": "Barang tidak sesuai kebutuhan department tujuan"
}
```

### Required current status

```txt
PENDING_DESTINATION_CHECKER
```

### Expected result

```txt
status = REJECTED
rejected_stage = DESTINATION_CHECKER
budget movement = RELEASE
```

---

## 14. Endpoint Destination Manager Approve

Endpoint ini dipakai untuk:

```txt
SHORT flow final approve
NORMAL flow final approve setelah checker check
```

### Request

```http
POST /api/rp/:id/destination-manager-approve
```

### Body

```json
{
  "notes": "Final approve by destination manager"
}
```

### Required current status

```txt
PENDING_DESTINATION_MANAGER
```

### Expected result

```txt
status = APPROVED
budget tetap RESERVED
tidak ada FINALIZE
```

### FE rule untuk SHORT flow

```txt
flow_type = SHORT
status = PENDING_DESTINATION_MANAGER
user login = Manager Department tersebut
```

### FE rule untuk NORMAL flow

```txt
flow_type = NORMAL
status = PENDING_DESTINATION_MANAGER
user login = Manager Department Tujuan
```

---

## 15. Endpoint Destination Manager Reject

### Request

```http
POST /api/rp/:id/destination-manager-reject
```

### Body

```json
{
  "reason": "Tidak disetujui oleh manager tujuan"
}
```

### Required current status

```txt
PENDING_DESTINATION_MANAGER
```

### Expected result

```txt
status = REJECTED
rejected_stage = DESTINATION_MANAGER
budget movement = RELEASE
```

---

## 16. Endpoint Revert RP

### Request

```http
POST /api/rp/:id/revert
```

### Body

```json
{
  "reason": "Perlu revisi sebelum lanjut approval"
}
```

Revert bukan reject. Revert artinya RP dikembalikan ke step sebelumnya untuk diperbaiki atau dicek ulang.

Budget tidak berubah saat revert.

---

## 17. Revert Behavior per Status

| Current Status | Revert By | New Status | Budget Movement | Field yang Dibersihkan |
|---|---|---|---|---|
| `PENDING_DESTINATION_CHECKER` | Manager Divisi Requester | `PENDING_REQUESTER_MANAGER` | Tidak ada | `requester_manager_approved_*` |
| `PENDING_DESTINATION_MANAGER` | Manager Department Tujuan | `PENDING_DESTINATION_CHECKER` | Tidak ada | `destination_checked_*` |
| `APPROVED` | Manager Department Tujuan | `PENDING_DESTINATION_MANAGER` | Tidak ada | `destination_manager_approved_*` |

### Contoh 1: Manager Finance revert setelah approve

Flow:

```txt
Finance staff create RP
-> PENDING_REQUESTER_MANAGER
Manager Finance approve
-> PENDING_DESTINATION_CHECKER
Manager Finance revert
-> PENDING_REQUESTER_MANAGER
```

Budget:

```txt
Tetap RESERVED
Tidak ada RELEASE
Tidak ada RESERVE baru
Tidak ada FINALIZE
```

### Contoh 2: Manager IT revert setelah checker check

Flow:

```txt
RP status PENDING_DESTINATION_MANAGER
Manager IT revert
-> PENDING_DESTINATION_CHECKER
```

Budget:

```txt
Tetap RESERVED
```

### Contoh 3: Manager IT revert setelah approved

Flow:

```txt
RP status APPROVED
Manager IT revert
-> PENDING_DESTINATION_MANAGER
```

Budget:

```txt
Tetap RESERVED
```

### FE rule

Tampilkan tombol revert jika backend mengizinkan user login pada status tersebut.

Secara UI, mapping sederhananya:

```txt
PENDING_DESTINATION_CHECKER -> Manager Divisi Requester bisa revert
PENDING_DESTINATION_MANAGER -> Manager Department Tujuan bisa revert
APPROVED -> Manager Department Tujuan bisa revert
```

---

## 18. Frontend Action Mapping

FE sebaiknya menentukan tombol action berdasarkan `status`, `flow_type`, dan role user login.

| Status | Flow | Tombol Utama | Endpoint |
|---|---|---|---|
| `PENDING_REQUESTER_MANAGER` | NORMAL | Approve | `/requester-manager-approve` |
| `PENDING_REQUESTER_MANAGER` | NORMAL | Reject | `/requester-manager-reject` |
| `PENDING_DESTINATION_CHECKER` | NORMAL | Check/Edit | `/destination-check` |
| `PENDING_DESTINATION_CHECKER` | NORMAL | Reject | `/destination-check-reject` |
| `PENDING_DESTINATION_CHECKER` | NORMAL | Revert | `/revert` |
| `PENDING_DESTINATION_MANAGER` | NORMAL | Approve | `/destination-manager-approve` |
| `PENDING_DESTINATION_MANAGER` | NORMAL | Reject | `/destination-manager-reject` |
| `PENDING_DESTINATION_MANAGER` | NORMAL | Revert | `/revert` |
| `PENDING_DESTINATION_MANAGER` | SHORT | Approve | `/destination-manager-approve` |
| `PENDING_DESTINATION_MANAGER` | SHORT | Reject | `/destination-manager-reject` |
| `APPROVED` | NORMAL/SHORT | Revert | `/revert` |
| `APPROVED` | NORMAL/SHORT | Create FRP from RP | endpoint terpisah, dibuat setelah RP core |
| `REJECTED` | NORMAL/SHORT | Tidak ada action approval | final |
| `VOIDED` | NORMAL/SHORT | Tidak ada action approval | final |

---

## 19. UI Label Rekomendasi

| Backend Status | Label FE |
|---|---|
| `PENDING_REQUESTER_MANAGER` | Menunggu Approval Manager Divisi |
| `PENDING_DESTINATION_CHECKER` | Menunggu Checker Tujuan |
| `PENDING_DESTINATION_MANAGER` | Menunggu Approval Manager Tujuan |
| `APPROVED` | Approved |
| `REJECTED` | Rejected |
| `VOIDED` | Voided |

| Flow Type | Label FE |
|---|---|
| `NORMAL` | Normal Flow |
| `SHORT` | Short Flow |

---

## 20. Timeline / Approval Logs

FE bisa menggunakan `approval_logs` dari detail RP untuk membuat timeline.

Action umum:

| Action | Arti |
|---|---|
| `SUBMIT` | RP dibuat |
| `REQUESTER_MANAGER_APPROVE` | Manager requester approve |
| `REQUESTER_MANAGER_REJECT` | Manager requester reject |
| `DESTINATION_CHECK` | Checker tujuan melakukan check/edit |
| `DESTINATION_CHECK_REJECT` | Checker tujuan reject |
| `DESTINATION_MANAGER_APPROVE` | Manager tujuan approve |
| `DESTINATION_MANAGER_REJECT` | Manager tujuan reject |
| `REVERT` | RP dikembalikan ke step sebelumnya |
| `PROCUREMENT_VOID` | RP dibatalkan oleh procurement sebelum menjadi FRP |

---

## 21. Item History dan Header History

### Header History

Header history terisi ketika checker mengubah data header seperti:

```txt
vendor
description
```

### Item History

Item history terisi ketika checker mengubah data item seperti:

```txt
memo
purchase_link
quantity
unit_price
amount
```

Jika checker hanya mengubah 1 item dari 3 item, maka hanya item tersebut yang masuk history.

---

## 22. Error Handling FE

Backend response error umum:

```json
{
  "success": false,
  "message": "Only PENDING_REQUESTER_MANAGER RP can be approved by requester manager"
}
```

FE cukup tampilkan `message` ke user.

Beberapa error yang mungkin muncul:

| Error Message | Penyebab |
|---|---|
| `Only PENDING_REQUESTER_MANAGER RP can be approved by requester manager` | FE hit requester approve padahal status bukan `PENDING_REQUESTER_MANAGER` |
| `Only PENDING_DESTINATION_MANAGER RP can be approved by destination manager` | FE hit destination approve padahal status bukan `PENDING_DESTINATION_MANAGER` |
| `Current user cannot revert this RP at current status` | User login bukan role yang boleh revert pada status tersebut |
| `Revert reason is required` | Body tidak mengirim `reason` atau `notes` |
| `RP request item ID is required on checker item` | Checker kirim item revisi tanpa `rp_request_item_id` |
| `Checker item does not belong to this RP` | `rp_request_item_id` tidak cocok dengan RP tersebut |
| `Duplicate RP request item ID on checker items` | Payload checker mengirim item ID yang sama lebih dari sekali |

---

## 23. Contoh FE Pseudocode Action Button

```js
function getRpActions(rp, currentUserPermission) {
  const actions = [];

  if (rp.status === 'PENDING_REQUESTER_MANAGER' && currentUserPermission.canRequesterManagerApprove) {
    actions.push('requester-manager-approve');
    actions.push('requester-manager-reject');
  }

  if (rp.status === 'PENDING_DESTINATION_CHECKER' && currentUserPermission.canDestinationCheck) {
    actions.push('destination-check');
    actions.push('destination-check-reject');
  }

  if (rp.status === 'PENDING_DESTINATION_CHECKER' && currentUserPermission.canRequesterManagerApprove) {
    actions.push('revert');
  }

  if (rp.status === 'PENDING_DESTINATION_MANAGER' && currentUserPermission.canDestinationManagerApprove) {
    actions.push('destination-manager-approve');
    actions.push('destination-manager-reject');
    actions.push('revert');
  }

  if (rp.status === 'APPROVED' && currentUserPermission.canDestinationManagerApprove) {
    actions.push('revert');
    actions.push('create-frp-from-rp');
  }

  return actions;
}
```

Catatan: validasi final tetap dari backend. FE hanya membantu menampilkan tombol yang relevan.

---

## 24. Ringkasan Flow Normal

```txt
Finance Staff create RP
status: PENDING_REQUESTER_MANAGER
budget: RESERVE

Manager Finance approve
status: PENDING_DESTINATION_CHECKER
budget: tetap RESERVED

IT Checker check/edit
status: PENDING_DESTINATION_MANAGER
budget: tetap RESERVED jika amount sama
budget: RELEASE lama + RESERVE baru jika amount berubah

Manager IT approve
status: APPROVED
budget: tetap RESERVED
```

Reject bisa terjadi di:

```txt
PENDING_REQUESTER_MANAGER
PENDING_DESTINATION_CHECKER
PENDING_DESTINATION_MANAGER
```

Semua reject:

```txt
status: REJECTED
budget: RELEASE
```

Revert bisa terjadi di:

```txt
PENDING_DESTINATION_CHECKER -> PENDING_REQUESTER_MANAGER
PENDING_DESTINATION_MANAGER -> PENDING_DESTINATION_CHECKER
APPROVED -> PENDING_DESTINATION_MANAGER
```

Semua revert:

```txt
budget: tetap RESERVED
```

---

## 25. Ringkasan Flow Short

```txt
IT Staff create RP ke IT
status: PENDING_DESTINATION_MANAGER
flow_type: SHORT
budget: RESERVE

Manager IT approve
status: APPROVED
budget: tetap RESERVED
```

Jika Manager IT reject:

```txt
status: REJECTED
budget: RELEASE
```

Jika Manager IT revert setelah approved:

```txt
status: PENDING_DESTINATION_MANAGER
budget: tetap RESERVED
```

---

## 26. Catatan Penting untuk FE

1. Jangan hardcode satu endpoint approve untuk semua status.
2. Endpoint approve harus mengikuti status RP saat ini.
3. SHORT flow tidak memakai requester manager approve.
4. NORMAL flow wajib melewati requester manager, checker, lalu destination manager.
5. Checker boleh kirim item yang berubah saja.
6. Item yang tidak dikirim checker harus dianggap tetap memakai data lama dari backend.
7. Revert tidak mengubah budget.
8. Reject selalu release budget.
9. RP approved tetap reserved, bukan used/finalized.
10. Create FRP from RP adalah proses lanjutan setelah RP approved.

---

## 27. Checklist FE Consume

Saat render halaman detail RP, FE perlu:

```txt
1. Ambil detail RP by ID.
2. Baca status dan flow_type.
3. Baca user login dan permission/role context.
4. Tampilkan tombol sesuai status.
5. Untuk checker, tampilkan semua item existing.
6. Saat submit checker edit, kirim hanya item yang berubah.
7. Tetap include rp_request_item_id pada item yang berubah.
8. Untuk reject/revert, wajib kirim reason.
9. Setelah action success, refresh detail RP.
10. Tampilkan timeline dari approval_logs.
```

---

## 28. Quick Endpoint Reference

```txt
GET    /api/rp
GET    /api/rp/:id
POST   /api/rp
PUT    /api/rp/:id

POST   /api/rp/:id/requester-manager-approve
POST   /api/rp/:id/requester-manager-reject

POST   /api/rp/:id/destination-check
POST   /api/rp/:id/destination-check-reject

POST   /api/rp/:id/destination-manager-approve
POST   /api/rp/:id/destination-manager-reject

POST   /api/rp/:id/revert
```
