# Create FRP from RP - FE Integration Guide

Dokumentasi ini dipakai FE untuk consume modul **Create FRP from RP** di Papertrail.

Modul ini digunakan oleh **General Procurement** untuk membuat FRP dari RP yang sudah final approved.

---

## 1. Konsep Utama

RP adalah request/procurement request. Setelah RP selesai approval sampai status `APPROVED`, General Procurement bisa membuat FRP dari RP tersebut.

Flow budget-nya:

```txt
RP create
-> Budget RESERVE pakai estimasi RP

RP approved
-> Budget tetap RESERVED
-> Belum FINALIZE

Create FRP from RP
-> RELEASE budget reserved dari RP
-> RESERVE budget final untuk FRP
-> FINALIZE budget final untuk FRP
```

Jadi nilai budget final yang dipakai adalah nilai FRP, bukan lagi estimasi awal RP.

---

## 2. User yang Boleh Akses

Endpoint ini hanya untuk user **General Procurement**.

Rule backend:

```txt
job_position = General Procurement
job_level_value < 4
```

RP yang boleh diproses:

```txt
status = APPROVED
frp_conversion_status = NOT_CREATED
```

RP yang tidak boleh diproses:

```txt
status != APPROVED
frp_conversion_status = CREATED
frp_conversion_status = VOIDED
```

---

## 3. Endpoint List RP yang Siap Dibuatkan FRP

```http
GET /api/rp?status=APPROVED&frp_conversion_status=NOT_CREATED
```

Gunakan endpoint ini untuk halaman list General Procurement.

### Response penting untuk FE

```json
{
  "id": "rp-id",
  "rp_number": "RP-FIN-26-00001",
  "status": "APPROVED",
  "frp_conversion_status": "NOT_CREATED",
  "flow_type": "NORMAL",
  "department_name_snapshot": "Finance",
  "destination_department_name_snapshot": "IT",
  "requested_by_name": "Kevin Phillips",
  "vendor_name_snapshot": "PT Example Vendor Updated",
  "payment_category_name_snapshot": "Pengandaan Barang Baru",
  "total_amount": "60000.00",
  "description": "TEST RP LONG - Checked by destination checker",
  "created_at": "2026-07-10 15:55:50"
}
```

### Action button FE

Untuk setiap RP dengan status di atas, tampilkan action:

```txt
Create FRP
Void Procurement
```

---

## 4. Endpoint Detail RP

Sebelum masuk form Create FRP, FE wajib ambil detail RP.

```http
GET /api/rp/:id
```

Contoh:

```http
GET /api/rp/4f41ea73-0ab2-4238-a2dd-8359fdd54908
```

Detail RP berisi:

```txt
header RP
items RP
approval_logs
header_histories
item_histories
```

FE pakai data detail ini untuk default value form FRP.

---

## 5. Form Create FRP from RP

Endpoint:

```http
POST /api/rp/:id/create-frp
```

Contoh:

```http
POST /api/rp/4f41ea73-0ab2-4238-a2dd-8359fdd54908/create-frp
```

---

## 6. Input Header yang Dibutuhkan

| Field | Required | Default | Keterangan |
|---|---:|---|---|
| `frp_date` | optional | today/backend default | Tanggal FRP |
| `internal_po_number` | optional | empty | Nomor PO internal, free text |
| `external_document_type_id` | optional/conditional | null | Dari `master_external_document_types` |
| `external_document_number` | optional | empty | Nomor invoice/contract/receipt vendor |
| `payment_method_id` | required | - | Dari `master_payment_methods` |
| `payment_date` | required | - | Tanggal pembayaran |
| `vendor_id` | required | vendor RP | Vendor final dari master vendor |
| `vendor_bank_account_id` | optional | null | Rekening vendor, idealnya required kalau transfer |
| `description` | optional | description RP | Bisa override deskripsi RP |
| `document_type_ids` | optional | [] | Checklist document FRP |
| `notes` | optional | null | Catatan create FRP |

Catatan:

```txt
Create FRP from RP tidak pakai currency/kurs.
Nilainya selalu IDR.
```

---

## 7. Input Item

Item FRP otomatis berasal dari RP items.

FE harus menampilkan data item RP:

```txt
budget/project name
memo
purchase_link
quantity
unit_price RP
amount RP
input nilai FRP final
```

Field input final per item:

```txt
frp_amount
```

Rule:

```txt
Jika frp_amount kosong / tidak dikirim:
-> pakai amount RP lama

Jika frp_amount diisi:
-> pakai nilai itu sebagai amount final FRP

Jika frp_amount <= 0:
-> backend reject
```

FE tidak wajib mengirim semua item. Cukup kirim item yang amount-nya diubah.

---

## 8. Payload Create FRP tanpa Override Amount

Jika nilai FRP sama dengan RP, FE boleh tidak kirim `items`.

```json
{
  "frp_date": "2026-07-10",
  "internal_po_number": "PO-RP-TEST-001",
  "external_document_type_id": 1,
  "external_document_number": "INV-RP-TEST-001",
  "payment_method_id": 1,
  "payment_date": "2026-07-25",
  "vendor_id": 1,
  "vendor_bank_account_id": 1,
  "description": "Create FRP from RP-FIN-26-00001",
  "document_type_ids": [1],
  "notes": "Create FRP from approved RP without amount override"
}
```

Backend akan membuat item FRP dari semua item RP dengan amount yang sama.

---

## 9. Payload Create FRP dengan Override Amount

Jika hanya item tertentu yang berubah, kirim hanya item tersebut.

```json
{
  "frp_date": "2026-07-10",
  "internal_po_number": "PO-RP-TEST-001",
  "external_document_type_id": 1,
  "external_document_number": "INV-RP-TEST-001",
  "payment_method_id": 1,
  "payment_date": "2026-07-25",
  "vendor_id": 1,
  "vendor_bank_account_id": 1,
  "description": "Create FRP from RP-FIN-26-00001",
  "document_type_ids": [1],
  "items": [
    {
      "rp_request_item_id": "rp-item-id-yang-diubah",
      "frp_amount": 65000
    }
  ],
  "notes": "Create FRP from approved RP with amount override"
}
```

Contoh logic:

```txt
RP item 1 = 100.000
RP item 2 = 200.000
RP item 3 = 300.000

User hanya ubah item 3 jadi 350.000

Payload cukup kirim item 3 saja.
Backend otomatis pakai data lama untuk item 1 dan item 2.
```

---

## 10. Response Create FRP Berhasil

```json
{
  "success": true,
  "message": "FRP created from RP",
  "data": {
    "id": "frp-id",
    "frp_number": "FRP-FIN-26-00001",
    "status": "APPROVED",
    "source_module": "RP",
    "source_rp_request_id": "rp-id",
    "source_rp_number": "RP-FIN-26-00001",
    "total_amount": 65000,
    "total_amount_idr": 65000
  }
}
```

Setelah sukses, FE bisa redirect ke detail FRP:

```http
GET /api/frp/:frp_id
```

---

## 11. Status Setelah Create FRP Berhasil

### RP

RP tetap `APPROVED`, tapi conversion status berubah:

```txt
status = APPROVED
frp_conversion_status = CREATED
converted_frp_request_id = FRP ID
converted_frp_number = FRP Number
converted_by_user_id = General Procurement user id
converted_by_name = General Procurement name
converted_at = now
```

### FRP

FRP hasil create langsung final:

```txt
status = APPROVED
source_module = RP
source_rp_request_id = RP ID
source_rp_number = RP Number
```

Kenapa langsung `APPROVED`?

Karena RP sudah melewati approval requester manager, destination checker, dan destination manager. General Procurement hanya mengubah RP approved menjadi FRP pembayaran final.

---

## 12. Status Item FRP

FRP item menyimpan referensi ke RP item:

```txt
source_rp_request_item_id
is_amount_overridden
original_rp_amount
```

Contoh tidak override:

```txt
original_rp_amount = 60000
amount = 60000
is_amount_overridden = 0
```

Contoh override:

```txt
original_rp_amount = 60000
amount = 65000
is_amount_overridden = 1
```

FE bisa tampilkan badge:

```txt
Amount changed from RP
```

jika:

```txt
is_amount_overridden = 1
```

---

## 13. Budget Behavior

Saat Create FRP from RP sukses, budget movement harus seperti ini:

```txt
RP RELEASE old reserved amount
FRP RESERVE final amount
FRP FINALIZE final amount
```

Contoh RP amount 60.000, FRP final amount 65.000:

```txt
RP RELEASE 60.000
FRP RESERVE 65.000
FRP FINALIZE 65.000
```

`FINALIZE` tidak mengubah `budget_remaining`, karena uang sudah dikurangi saat `RESERVE`. `FINALIZE` hanya memindahkan nilai dari `budget_reserved` ke `budget_used`.

---

## 14. Attachment Flow

Attachment tidak dikirim di endpoint `create-frp`.

Flow yang benar:

```txt
1. Create FRP from RP
2. Backend return frp_id
3. FE upload attachment pakai endpoint FRP attachment existing
4. FE confirm upload
5. FE preview pakai download-url
```

FRP from RP dibuat dengan status `APPROVED`, tapi attachment tetap boleh karena `source_module = RP`.

---

## 15. Endpoint Sign Upload Attachment

```http
POST /api/frp/:frp_id/attachments/sign-upload
```

Payload:

```json
{
  "files": [
    {
      "document_type_id": 1,
      "original_file_name": "invoice-rp.pdf",
      "mime_type": "application/pdf",
      "file_size": 102400
    }
  ]
}
```

Response:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "attachment_id": "attachment-id",
        "document_type_id": 1,
        "upload_url": "https://storage.googleapis.com/....",
        "method": "PUT",
        "headers": {
          "Content-Type": "application/pdf"
        },
        "expires_at": "2026-07-10T10:00:00.000Z"
      }
    ]
  }
}
```

FE wajib pakai `Content-Type` yang sama saat PUT ke signed URL.

---

## 16. Upload File ke Signed URL

Contoh FE:

```js
await fetch(uploadUrl, {
  method: 'PUT',
  headers: {
    'Content-Type': file.type,
  },
  body: file,
});
```

Jangan upload file ke backend API. File langsung PUT ke GCS signed URL.

---

## 17. Confirm Upload

Setelah PUT file berhasil, FE wajib call confirm.

```http
POST /api/frp/:frp_id/attachments/confirm
```

Payload:

```json
{
  "attachments": [
    {
      "attachment_id": "attachment-id"
    }
  ]
}
```

Expected:

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "attachment_id": "attachment-id",
        "upload_status": "UPLOADED"
      }
    ]
  }
}
```

Kalau confirm tidak dipanggil, attachment masih `PENDING` dan tidak bisa dipreview.

---

## 18. Preview Attachment

Preview/download harus lewat endpoint signed download URL.

```http
GET /api/frp/:frp_id/attachments/:attachment_id/download-url
```

Response:

```json
{
  "success": true,
  "data": {
    "attachment_id": "attachment-id",
    "original_file_name": "invoice-rp.pdf",
    "file_name": "FRP-FIN-26-00001-01.pdf",
    "mime_type": "application/pdf",
    "file_size": 102400,
    "download_url": "https://storage.googleapis.com/....",
    "expires_at": "2026-07-10T10:00:00.000Z"
  }
}
```

FE bisa preview:

```js
window.open(downloadUrl, '_blank');
```

atau untuk PDF/image:

```jsx
<iframe src={downloadUrl} />
```

Jangan pakai `object_path` untuk preview, karena bucket private.

---

## 19. Void Procurement

Jika RP approved tapi tidak jadi dibuat FRP, General Procurement bisa melakukan void.

Endpoint:

```http
POST /api/rp/:id/procurement-void
```

Payload:

```json
{
  "reason": "Barang tidak jadi diproses oleh procurement"
}
```

Rule:

```txt
RP harus APPROVED
frp_conversion_status harus NOT_CREATED
```

Setelah void:

```txt
status = VOIDED
frp_conversion_status = VOIDED
procurement_voided_by_user_id = user id
procurement_voided_by_name = user name
procurement_voided_at = now
procurement_voided_reason = reason
```

Budget:

```txt
RP reserved budget -> RELEASE
Tidak ada FRP dibuat
```

---

## 20. Error yang Perlu Ditangani FE

### RP belum approved

```json
{
  "success": false,
  "message": "Only APPROVED RP can be converted to FRP"
}
```

### RP sudah dibuatkan FRP / sudah void

```json
{
  "success": false,
  "message": "RP has already been converted or voided"
}
```

### User bukan General Procurement

```json
{
  "success": false,
  "message": "Only General Procurement can create FRP from RP"
}
```

### Item bukan milik RP tersebut

```json
{
  "success": false,
  "message": "FRP item does not belong to this RP"
}
```

### Amount tidak valid

```json
{
  "success": false,
  "message": "FRP amount must be greater than 0"
}
```

### Budget tidak cukup

```json
{
  "success": false,
  "message": "Budget XXX remaining is not enough"
}
```

---

## 21. FE Button Mapping

### RP list

Show `Create FRP` dan `Void Procurement` jika:

```txt
status = APPROVED
frp_conversion_status = NOT_CREATED
current user = General Procurement
```

Show link `Open FRP` jika:

```txt
frp_conversion_status = CREATED
converted_frp_request_id is not null
```

Show disabled/label `Voided` jika:

```txt
frp_conversion_status = VOIDED
```

---

## 22. Recommended FE Flow

```txt
1. General Procurement buka halaman Approved RP
2. FE call GET /api/rp?status=APPROVED&frp_conversion_status=NOT_CREATED
3. User klik Create FRP
4. FE call GET /api/rp/:id
5. FE render form FRP from RP
6. User isi document/payment/vendor data
7. User optional override amount item
8. FE submit POST /api/rp/:id/create-frp
9. Backend return frp_id
10. FE redirect ke FRP detail/upload attachment page
11. FE call sign-upload
12. FE PUT file ke signed URL
13. FE call confirm upload
14. FE preview attachment via download-url
```

---

## 23. Quick Test Curl

```bash
BASE_URL="http://localhost:3001/api"
RP_ID="4f41ea73-0ab2-4238-a2dd-8359fdd54908"
```

Create FRP from RP:

```bash
curl -X POST "$BASE_URL/rp/$RP_ID/create-frp" \
-H "Content-Type: application/json" \
-d '{
  "frp_date": "2026-07-10",
  "internal_po_number": "PO-RP-TEST-001",
  "external_document_type_id": 1,
  "external_document_number": "INV-RP-TEST-001",
  "payment_method_id": 1,
  "payment_date": "2026-07-25",
  "vendor_id": 1,
  "vendor_bank_account_id": 1,
  "description": "Create FRP from RP",
  "document_type_ids": [1],
  "notes": "Create FRP from approved RP"
}'
```

Upload attachment:

```bash
curl -X POST "$BASE_URL/frp/$FRP_ID/attachments/sign-upload" \
-H "Content-Type: application/json" \
-d '{
  "files": [
    {
      "document_type_id": 1,
      "original_file_name": "invoice-rp.pdf",
      "mime_type": "application/pdf",
      "file_size": 102400
    }
  ]
}'
```

Confirm upload:

```bash
curl -X POST "$BASE_URL/frp/$FRP_ID/attachments/confirm" \
-H "Content-Type: application/json" \
-d '{
  "attachments": [
    {
      "attachment_id": "ATTACHMENT_ID"
    }
  ]
}'
```

Preview:

```bash
curl -X GET "$BASE_URL/frp/$FRP_ID/attachments/$ATTACHMENT_ID/download-url"
```

---

## 24. Catatan Penting untuk FE

```txt
- Jangan kirim file di endpoint create-frp.
- Jangan preview dari object_path.
- Preview selalu pakai download-url.
- Kalau upload berhasil tapi tidak confirm, status attachment tetap PENDING.
- FRP from RP langsung APPROVED, tapi attachment tetap bisa upload karena source_module = RP.
- Create FRP from RP hanya boleh sekali per RP.
- Void Procurement juga hanya boleh sebelum FRP dibuat.
```
