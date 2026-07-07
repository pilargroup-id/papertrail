# Dokumentasi FE Consume — FRP Update, Approval, Revert, Reject, Attachment Handling

## 1. Base URL

Development:

```txt
http://localhost:3001/api
```

FRP base endpoint:

```txt
/api/frp
```

Contoh full endpoint:

```txt
http://localhost:3001/api/frp
```

---

## 2. Ringkasan Flow FRP

### Status utama

```txt
PENDING   = FRP masih bisa diedit, attachment bisa ditambah/hapus
APPROVED  = FRP sudah disetujui, data dan attachment locked
REJECTED  = FRP ditolak, final, tidak bisa edit/revert/approve lagi
```

### Flow utama

```txt
Create FRP
  -> status PENDING
  -> budget RESERVED

Approve FRP
  -> status APPROVED
  -> budget FINALIZED

Revert FRP
  -> status balik ke PENDING
  -> budget balik dari FINALIZED ke RESERVED

Edit FRP setelah Revert
  -> hanya saat status PENDING
  -> old reserved budget RELEASE
  -> new budget RESERVED

Reject FRP
  -> status REJECTED
  -> reserved budget RELEASE
```

---

## 3. Permission Rule

### View FRP

User bisa melihat FRP kalau:

```txt
1. Creator FRP
2. Manager requester department
3. IT SuperUser
4. Budget owner department terkait item FRP
```

### Edit FRP

Yang boleh edit:

```txt
1. Creator FRP
2. IT SuperUser
```

Yang tidak boleh edit:

```txt
Manager department tidak boleh edit.
Manager hanya approve / reject / revert.
```

Edit hanya boleh saat:

```txt
status = PENDING
```

Kalau status `APPROVED` atau `REJECTED`, edit harus gagal.

### Approve / Reject FRP

Yang boleh approve / reject:

```txt
Manager dari requester department FRP
```

Contoh:

```txt
FRP Finance -> hanya Manager Finance
FRP IT      -> hanya Manager IT
FRP HCGA    -> hanya Manager HCGA
```

Creator tidak boleh approve / reject FRP sendiri.

IT SuperUser tidak otomatis bisa approve semua FRP.

### Revert FRP

Yang boleh revert:

```txt
1. Manager requester department
2. IT SuperUser
```

Revert hanya boleh saat:

```txt
status = APPROVED
```

---

## 4. Budget Rule Saat Edit

Saat FRP diedit, budget tidak boleh pindah department.

Contoh FRP:

```txt
FRP-FIN-26-00002
```

Berarti budget owner department-nya Finance.

Yang boleh:

```txt
Budget Finance A -> Budget Finance B
Amount 100000 -> 150000
```

Yang tidak boleh:

```txt
Budget Finance -> Budget IT
Budget Finance -> Budget Marketing
```

Jika budget department berubah, backend akan return error:

```json
{
  "success": false,
  "message": "Budget department cannot be changed on existing FRP. Current department is FIN"
}
```

Alasan: nomor FRP sudah mengandung department budget owner, misalnya `FRP-FIN`.

---

## 5. Attachment Rule

Attachment menggunakan signed URL Google Cloud Storage.

Frontend tidak upload file langsung ke backend. Flow upload:

```txt
1. FE request signed upload URL ke backend
2. Backend return upload_url
3. FE upload file langsung ke GCS pakai PUT upload_url
4. FE confirm upload ke backend
5. Backend cek object exists di GCS
6. Backend update status attachment jadi UPLOADED
```

### Attachment status

```txt
PENDING   = signed URL sudah dibuat, file belum confirmed
UPLOADED  = file sudah berhasil upload dan confirmed
CANCELED  = file dibatalkan/dihapus
```

### Attachment saat FRP PENDING

FE boleh:

```txt
1. Add attachment
2. Confirm attachment
3. Download/preview attachment
4. Cancel/delete attachment
5. Replace attachment
```

Replace attachment flow:

```txt
1. Cancel attachment lama
2. Backend delete object lama dari GCS
3. Upload attachment baru
4. Confirm attachment baru
```

File name tidak recycle.

Contoh:

```txt
FRP-FIN-26-00002-01.pdf = CANCELED
FRP-FIN-26-00002-02.pdf = UPLOADED
```

### Attachment saat FRP APPROVED

FE tidak boleh:

```txt
1. Add attachment
2. Confirm attachment
3. Cancel/delete attachment
```

Kalau butuh ubah attachment, FRP harus di-revert dulu ke `PENDING`.

### Attachment saat FRP REJECTED

Attachment tidak boleh diubah lagi.

---

## 6. Required Attachment Rule

Saat create / update FRP, FE bisa mengirim:

```json
"document_type_ids": [1]
```

Artinya document type tersebut menjadi required attachment.

Sebelum approve, semua document type di `frp_request_documents` harus punya attachment dengan:

```txt
upload_status = UPLOADED
```

Kalau belum ada, approve gagal:

```json
{
  "success": false,
  "message": "Required attachment is not complete: Form Request Payment"
}
```

Kalau FE kirim:

```json
"document_type_ids": []
```

Berarti tidak ada required attachment, dan FRP bisa approve tanpa attachment.

---

## 7. Endpoint List

### FRP

```txt
GET    /api/frp
GET    /api/frp/:id
POST   /api/frp
PUT    /api/frp/:id
POST   /api/frp/:id/approve
POST   /api/frp/:id/reject
POST   /api/frp/:id/revert
```

### FRP Attachment

```txt
POST   /api/frp/:id/attachments/sign-upload
POST   /api/frp/:id/attachments/confirm
POST   /api/frp/:id/attachments/:attachmentId/cancel
GET    /api/frp/:id/attachments/:attachmentId/download-url
```

---

## 8. Create FRP

### Endpoint

```txt
POST /api/frp
```

### Body

```json
{
  "frp_date": "2026-07-06",
  "description": "Pembayaran invoice vendor",
  "currency_code": "IDR",
  "exchange_rate": 1,

  "vendor_id": 1,
  "vendor_bank_account_id": null,

  "internal_po_number": "PO-TEST-001",

  "external_document_type_id": 1,
  "external_document_number": "INV-TEST-001",

  "payment_method_id": 1,
  "payment_date": "2026-07-10",

  "destination_bank_name": "BCA",
  "destination_bank_account": "1234567890",
  "destination_bank_account_name": "PT Vendor Testing",

  "document_type_ids": [1],

  "items": [
    {
      "budget_id": 1,
      "memo": "Pembayaran invoice vendor",
      "quantity": 1,
      "unit_price": 100000,
      "amount": 100000
    }
  ],

  "notes": "Create FRP"
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP request created",
  "data": {
    "id": "uuid",
    "frp_number": "FRP-FIN-26-00001",
    "status": "PENDING",
    "total_amount": 100000
  }
}
```

### Notes FE

Saat create:

```txt
1. Attachment belum wajib langsung diupload.
2. FRP boleh dibuat dulu tanpa file.
3. Kalau document_type_ids tidak kosong, file wajib sudah UPLOADED sebelum approve.
4. Budget langsung RESERVED.
```

---

## 9. Update / Edit FRP

### Endpoint

```txt
PUT /api/frp/:id
```

### Kapan FE boleh show tombol Edit?

Show tombol edit kalau:

```txt
status = PENDING
dan user adalah creator FRP atau IT SuperUser
```

Jangan show tombol edit untuk Manager department biasa.

### Body

Body update sama seperti create.

```json
{
  "frp_date": "2026-07-03",
  "description": "Pembayaran invoice vendor testing revisi",
  "currency_code": "IDR",
  "exchange_rate": 1,

  "vendor_id": 1,
  "vendor_bank_account_id": null,

  "internal_po_number": "PO-TEST-002-REV",

  "external_document_type_id": 1,
  "external_document_number": "INV-TEST-002-REV",

  "payment_method_id": 1,
  "payment_date": "2026-07-10",

  "destination_bank_name": "BCA",
  "destination_bank_account": "1234567890",
  "destination_bank_account_name": "PT Vendor Testing",

  "document_type_ids": [],

  "items": [
    {
      "budget_id": 1,
      "memo": "Testing item FRP revisi",
      "quantity": 1,
      "unit_price": 150000,
      "amount": 150000
    }
  ],

  "notes": "Update FRP setelah revert"
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP request updated",
  "data": {
    "id": "5b22b53a-55dc-4a82-8633-7aacac70676f",
    "frp_number": "FRP-FIN-26-00002",
    "status": "PENDING",
    "total_amount": 150000,
    "canceled_attachments": []
  }
}
```

### Error: edit saat APPROVED / REJECTED

```json
{
  "success": false,
  "message": "Only PENDING FRP can be updated"
}
```

### Error: Manager coba edit

```json
{
  "success": false,
  "message": "Only FRP creator or IT SuperUser can update this FRP"
}
```

### Error: budget beda department

```json
{
  "success": false,
  "message": "Budget department cannot be changed on existing FRP. Current department is FIN"
}
```

---

## 10. Approve FRP

### Endpoint

```txt
POST /api/frp/:id/approve
```

### Body

```json
{
  "notes": "Approve FRP"
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP request approved",
  "data": {
    "id": "uuid",
    "frp_number": "FRP-FIN-26-00002",
    "status": "APPROVED"
  }
}
```

### FE button rule

Show approve button kalau:

```txt
status = PENDING
user adalah Manager requester department
user bukan creator FRP
```

### Error: creator approve sendiri

```json
{
  "success": false,
  "message": "You cannot approve your own FRP"
}
```

### Error: bukan manager department

```json
{
  "success": false,
  "message": "Only manager from requester department can approve this FRP"
}
```

### Error: required attachment belum lengkap

```json
{
  "success": false,
  "message": "Required attachment is not complete: Form Request Payment"
}
```

---

## 11. Reject FRP

### Endpoint

```txt
POST /api/frp/:id/reject
```

### Body

```json
{
  "reason": "Dokumen tidak sesuai"
}
```

Atau:

```json
{
  "notes": "Dokumen tidak sesuai"
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP request rejected",
  "data": {
    "id": "uuid",
    "frp_number": "FRP-FIN-26-00003",
    "status": "REJECTED"
  }
}
```

### FE button rule

Show reject button kalau:

```txt
status = PENDING
user adalah Manager requester department
user bukan creator FRP
```

### Setelah rejected

FE harus treat FRP sebagai final:

```txt
Tidak bisa edit
Tidak bisa approve
Tidak bisa revert
```

### Error: reject tanpa reason

```json
{
  "success": false,
  "message": "Reject reason is required"
}
```

### Error: reject setelah REJECTED / APPROVED

```json
{
  "success": false,
  "message": "Only PENDING FRP can be rejected"
}
```

---

## 12. Revert FRP

### Endpoint

```txt
POST /api/frp/:id/revert
```

### Body

```json
{
  "reason": "Perlu revisi data"
}
```

Atau:

```json
{
  "notes": "Perlu revisi data"
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP request reverted",
  "data": {
    "id": "uuid",
    "frp_number": "FRP-FIN-26-00002",
    "status": "PENDING"
  }
}
```

### FE button rule

Show revert button kalau:

```txt
status = APPROVED
dan user adalah Manager requester department atau IT SuperUser
```

### Setelah revert

FE boleh allow:

```txt
1. Creator / IT edit FRP
2. Creator / IT add/cancel attachment
3. Manager approve/reject lagi
```

### Error: revert tanpa reason

```json
{
  "success": false,
  "message": "Revert reason is required"
}
```

### Error: revert selain APPROVED

```json
{
  "success": false,
  "message": "Only APPROVED FRP can be reverted"
}
```

---

## 13. Attachment — Sign Upload URL

### Endpoint

```txt
POST /api/frp/:id/attachments/sign-upload
```

### FE usage

Dipakai saat user memilih file dan klik upload.

FE kirim metadata file, bukan binary file.

### Body

```json
{
  "files": [
    {
      "document_type_id": 1,
      "original_file_name": "invoice.pdf",
      "mime_type": "application/pdf",
      "file_size": 110282
    }
  ]
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP attachment upload URLs generated",
  "data": {
    "items": [
      {
        "attachment_id": "12f50c0c-c338-49af-8b3f-5f98f7832ae5",
        "document_type_id": 1,
        "document_code": "FORM_REQUEST_PAYMENT",
        "document_name": "Form Request Payment",
        "original_file_name": "invoice.pdf",
        "file_name": "FRP-FIN-26-00002-02.pdf",
        "object_path": "frp/2026/07/FRP-FIN-26-00002-02.pdf",
        "bucket_name": "papertrail-pilargroup",
        "upload_url": "https://storage.googleapis.com/...",
        "method": "PUT",
        "headers": {
          "Content-Type": "application/pdf"
        },
        "expires_at": "2026-07-06T03:14:59.172Z"
      }
    ]
  }
}
```

### FE notes

```txt
1. Simpan attachment_id dari response.
2. Gunakan upload_url untuk upload langsung ke GCS.
3. Gunakan Content-Type sesuai response headers.
4. Signed URL expired mengikuti expires_at.
5. Kalau expired, request sign-upload ulang.
```

---

## 14. Attachment — Upload File ke GCS dari FE

Setelah dapat `upload_url`, FE upload file langsung ke URL tersebut.

### JavaScript fetch example

```js
async function uploadToGcs(uploadUrl, file, mimeType) {
  const response = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    body: file,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file to storage');
  }

  return true;
}
```

### Penting

Header `Content-Type` harus sama dengan yang dikirim saat sign-upload.

Kalau saat sign-upload pakai:

```json
"mime_type": "application/pdf"
```

Maka PUT ke GCS wajib:

```txt
Content-Type: application/pdf
```

Kalau beda, GCS bisa reject signed URL.

---

## 15. Attachment — Confirm Upload

Setelah upload ke GCS sukses, FE harus call confirm.

### Endpoint

```txt
POST /api/frp/:id/attachments/confirm
```

### Body

```json
{
  "attachments": [
    {
      "attachment_id": "12f50c0c-c338-49af-8b3f-5f98f7832ae5",
      "checksum": null
    }
  ]
}
```

### Response success

```json
{
  "success": true,
  "message": "FRP attachments confirmed",
  "data": {
    "items": [
      {
        "attachment_id": "12f50c0c-c338-49af-8b3f-5f98f7832ae5",
        "upload_status": "UPLOADED"
      }
    ]
  }
}
```

### FE notes

```txt
1. Jangan tampilkan file sebagai final UPLOADED sebelum confirm sukses.
2. Kalau upload ke GCS sukses tapi confirm gagal, tampilkan retry confirm.
3. Kalau object tidak ditemukan di GCS, backend akan error.
```

---

## 16. Attachment — Download / Preview URL

### Endpoint

```txt
GET /api/frp/:id/attachments/:attachmentId/download-url
```

### Response success

```json
{
  "success": true,
  "message": "FRP attachment download URL generated",
  "data": {
    "attachment_id": "12f50c0c-c338-49af-8b3f-5f98f7832ae5",
    "original_file_name": "invoice.pdf",
    "file_name": "FRP-FIN-26-00002-02.pdf",
    "mime_type": "application/pdf",
    "file_size": 110282,
    "download_url": "https://storage.googleapis.com/...",
    "expires_at": "2026-07-06T03:06:23.281Z"
  }
}
```

### FE usage

Untuk preview PDF/image:

```txt
Buka download_url langsung di iframe/new tab/modal viewer.
```

Untuk download:

```txt
window.open(download_url)
```

### FE notes

```txt
1. download_url temporary / expired.
2. Jangan simpan download_url permanen di state/cache jangka panjang.
3. Kalau expired, request ulang endpoint download-url.
```

---

## 17. Attachment — Cancel / Delete Attachment

### Endpoint

```txt
POST /api/frp/:id/attachments/:attachmentId/cancel
```

### Body

Tidak perlu body.

### Response success

```json
{
  "success": true,
  "message": "FRP attachment canceled",
  "data": {
    "attachment_id": "12f50c0c-c338-49af-8b3f-5f98f7832ae5",
    "upload_status": "CANCELED",
    "deleted_from_storage": true
  }
}
```

### FE behavior

Kalau user klik remove file:

```txt
1. Call cancel endpoint.
2. Kalau success, hilangkan file dari active list.
3. Backend akan delete object dari GCS.
4. DB row tetap ada sebagai audit trail dengan status CANCELED.
```

### Error saat FRP APPROVED

```json
{
  "success": false,
  "message": "Attachments can only be canceled on PENDING FRP"
}
```

---

## 18. Attachment — Replace File Flow

Tidak ada endpoint khusus replace.

FE flow:

```txt
1. User klik remove file lama
2. FE call cancel endpoint
3. Backend delete file lama dari GCS dan mark CANCELED
4. User upload file baru
5. FE call sign-upload
6. FE PUT file ke GCS
7. FE call confirm
```

Contoh hasil:

```txt
File lama:
FRP-FIN-26-00002-01.pdf -> CANCELED, object deleted

File baru:
FRP-FIN-26-00002-02.pdf -> UPLOADED
```

Sequence file tidak recycle.

---

## 19. Detail FRP Response — Data yang Dibutuhkan FE

Endpoint:

```txt
GET /api/frp/:id
```

FE butuh membaca minimal:

```txt
id
frp_number
status
requested_by_user_id
requested_by_name
department_id
department_name_snapshot
class_department_id
class_name_snapshot
total_amount
items[]
documents[]
attachments[]
approval_logs[]
```

### Button visibility dari detail

#### Edit button

```txt
status = PENDING
AND current_user.id = requested_by_user_id OR current_user is IT department
```

#### Approve button

```txt
status = PENDING
AND current_user is manager
AND current_user department_id = frp.department_id
AND current_user.id != requested_by_user_id
```

#### Reject button

```txt
status = PENDING
AND current_user is manager
AND current_user department_id = frp.department_id
AND current_user.id != requested_by_user_id
```

#### Revert button

```txt
status = APPROVED
AND current_user is manager requester department OR current_user is IT department
```

#### Add / Cancel attachment button

```txt
status = PENDING
AND current_user.id = requested_by_user_id OR current_user is IT department
```

#### Download / Preview attachment button

```txt
attachment.upload_status = UPLOADED
AND user has access to FRP detail
```

---

## 20. FE Recommended UX Flow

### Create page

```txt
1. User isi header FRP.
2. User isi item budget.
3. User pilih required document types jika perlu.
4. Submit create FRP.
5. Setelah create success, redirect ke detail FRP.
6. Di detail, user upload attachment.
```

### Detail page PENDING

Show:

```txt
1. Edit button untuk creator / IT.
2. Upload attachment untuk creator / IT.
3. Remove attachment untuk creator / IT.
4. Approve / Reject untuk Manager requester department.
```

### Detail page APPROVED

Show:

```txt
1. Data readonly.
2. Attachment readonly.
3. Download / preview attachment.
4. Revert button untuk Manager requester department / IT.
```

### Detail page REJECTED

Show:

```txt
1. Data readonly.
2. Attachment readonly.
3. Rejected reason.
4. No edit / approve / revert.
```

---

## 21. Error Handling FE

### General response error shape

```json
{
  "success": false,
  "message": "Error message"
}
```

### Important messages to handle

```txt
Only PENDING FRP can be updated
Only FRP creator or IT SuperUser can update this FRP
Budget department cannot be changed on existing FRP. Current department is FIN
You cannot approve your own FRP
Only manager from requester department can approve this FRP
Required attachment is not complete: Form Request Payment
Only PENDING FRP can be approved
Reject reason is required
Only PENDING FRP can be rejected
Revert reason is required
Only APPROVED FRP can be reverted
Attachments can only be added to PENDING FRP
Attachments can only be confirmed on PENDING FRP
Attachments can only be canceled on PENDING FRP
Attachment object not found in storage
Uploaded object not found for attachment
```

---

## 22. Full Attachment Upload Example in FE

```js
async function uploadFrpAttachment({ apiBaseUrl, frpId, file, documentTypeId }) {
  const signResponse = await fetch(`${apiBaseUrl}/frp/${frpId}/attachments/sign-upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      files: [
        {
          document_type_id: documentTypeId,
          original_file_name: file.name,
          mime_type: file.type,
          file_size: file.size,
        },
      ],
    }),
  });

  const signJson = await signResponse.json();

  if (!signResponse.ok || !signJson.success) {
    throw new Error(signJson.message || 'Failed to generate upload URL');
  }

  const uploadItem = signJson.data.items[0];

  const uploadResponse = await fetch(uploadItem.upload_url, {
    method: uploadItem.method || 'PUT',
    headers: uploadItem.headers,
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error('Failed to upload file to GCS');
  }

  const confirmResponse = await fetch(`${apiBaseUrl}/frp/${frpId}/attachments/confirm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      attachments: [
        {
          attachment_id: uploadItem.attachment_id,
          checksum: null,
        },
      ],
    }),
  });

  const confirmJson = await confirmResponse.json();

  if (!confirmResponse.ok || !confirmJson.success) {
    throw new Error(confirmJson.message || 'Failed to confirm upload');
  }

  return confirmJson.data.items[0];
}
```

---

## 23. Full Attachment Cancel Example in FE

```js
async function cancelFrpAttachment({ apiBaseUrl, frpId, attachmentId }) {
  const response = await fetch(`${apiBaseUrl}/frp/${frpId}/attachments/${attachmentId}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to cancel attachment');
  }

  return json.data;
}
```

---

## 24. Full Attachment Download / Preview Example in FE

```js
async function getFrpAttachmentDownloadUrl({ apiBaseUrl, frpId, attachmentId }) {
  const response = await fetch(`${apiBaseUrl}/frp/${frpId}/attachments/${attachmentId}/download-url`);
  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to get download URL');
  }

  return json.data.download_url;
}

async function previewAttachment({ apiBaseUrl, frpId, attachmentId }) {
  const downloadUrl = await getFrpAttachmentDownloadUrl({
    apiBaseUrl,
    frpId,
    attachmentId,
  });

  window.open(downloadUrl, '_blank');
}
```

---

## 25. Schema Update / ALTER TABLE

### 25.1 Create table `frp_request_attachments`

```sql
CREATE TABLE frp_request_attachments (
  id VARCHAR(36) NOT NULL,
  frp_request_id VARCHAR(36) NOT NULL,
  document_type_id INT NULL,
  document_code_snapshot VARCHAR(50) NULL,
  document_name_snapshot VARCHAR(150) NULL,

  original_file_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  object_path VARCHAR(500) NOT NULL,
  bucket_name VARCHAR(100) NOT NULL,
  storage_provider ENUM('GCS') NOT NULL DEFAULT 'GCS',

  mime_type VARCHAR(100) NOT NULL,
  file_size BIGINT NOT NULL,
  checksum VARCHAR(128) NULL,

  upload_status ENUM('PENDING','UPLOADED','CANCELED') NOT NULL DEFAULT 'PENDING',
  signed_url_expires_at DATETIME NULL,

  uploaded_by_user_id VARCHAR(36) NULL,
  uploaded_by_username VARCHAR(100) NULL,
  uploaded_by_name VARCHAR(150) NULL,
  uploaded_at DATETIME NULL,

  canceled_by_user_id VARCHAR(36) NULL,
  canceled_by_name VARCHAR(150) NULL,
  canceled_at DATETIME NULL,

  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_fra_frp_request_id (frp_request_id),
  KEY idx_fra_document_type_id (document_type_id),
  KEY idx_fra_upload_status (upload_status),
  KEY idx_fra_object_path (object_path),

  CONSTRAINT fk_fra_frp_request_id
    FOREIGN KEY (frp_request_id) REFERENCES frp_requests(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_fra_document_type_id
    FOREIGN KEY (document_type_id) REFERENCES master_frp_document_types(id)
    ON DELETE SET NULL
);
```

### 25.2 Jika table sudah ada, pastikan column berikut ada

```sql
ALTER TABLE frp_request_attachments
  ADD COLUMN IF NOT EXISTS signed_url_expires_at DATETIME NULL AFTER upload_status,
  ADD COLUMN IF NOT EXISTS canceled_by_user_id VARCHAR(36) NULL AFTER uploaded_at,
  ADD COLUMN IF NOT EXISTS canceled_by_name VARCHAR(150) NULL AFTER canceled_by_user_id,
  ADD COLUMN IF NOT EXISTS canceled_at DATETIME NULL AFTER canceled_by_name;
```

> Catatan: MySQL versi tertentu tidak support `ADD COLUMN IF NOT EXISTS`. Kalau error, cek dulu dengan `SHOW COLUMNS`, lalu jalankan `ALTER TABLE ADD COLUMN` manual satu per satu.

Manual fallback:

```sql
ALTER TABLE frp_request_attachments
  ADD COLUMN signed_url_expires_at DATETIME NULL AFTER upload_status;

ALTER TABLE frp_request_attachments
  ADD COLUMN canceled_by_user_id VARCHAR(36) NULL AFTER uploaded_at;

ALTER TABLE frp_request_attachments
  ADD COLUMN canceled_by_name VARCHAR(150) NULL AFTER canceled_by_user_id;

ALTER TABLE frp_request_attachments
  ADD COLUMN canceled_at DATETIME NULL AFTER canceled_by_name;
```

### 25.3 Pastikan enum attachment status sudah benar

```sql
ALTER TABLE frp_request_attachments
  MODIFY COLUMN upload_status ENUM('PENDING','UPLOADED','CANCELED') NOT NULL DEFAULT 'PENDING';
```

### 25.4 Pastikan table `frp_request_documents` ada

```sql
CREATE TABLE frp_request_documents (
  id INT NOT NULL AUTO_INCREMENT,
  frp_request_id VARCHAR(36) NOT NULL,
  document_type_id INT NOT NULL,
  document_code_snapshot VARCHAR(50) NULL,
  document_name_snapshot VARCHAR(150) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  KEY idx_frd_frp_request_id (frp_request_id),
  KEY idx_frd_document_type_id (document_type_id),

  CONSTRAINT fk_frd_frp_request_id
    FOREIGN KEY (frp_request_id) REFERENCES frp_requests(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_frd_document_type_id
    FOREIGN KEY (document_type_id) REFERENCES master_frp_document_types(id)
    ON DELETE RESTRICT
);
```

### 25.5 Pastikan approval log action tidak perlu UPDATE

Edit FRP tidak dicatat di `frp_request_approval_logs`.

Edit FRP dicatat di `activity_logs` dengan action:

```txt
UPDATE
```

Approval log hanya untuk event approval/status:

```txt
SUBMIT
APPROVE
REJECT
REVERT
```

Jika enum `frp_request_approval_logs.action` perlu dicek:

```sql
SHOW COLUMNS FROM frp_request_approval_logs LIKE 'action';
```

Expected enum minimal:

```txt
'SUBMIT','APPROVE','REJECT','REVERT'
```

Tidak perlu tambah `UPDATE`.

---

## 26. Environment / GCS Config Backend

Backend membutuhkan env:

```env
GCP_KEY_PATH=./credentials/even-gearbox-255203-10881c36321f.json
GCP_BUCKET_NAME=papertrail-pilargroup
GCP_SIGNED_UPLOAD_EXPIRES_MINUTES=15
GCP_SIGNED_DOWNLOAD_EXPIRES_MINUTES=10
GCP_MAX_ATTACHMENT_FILES=10
GCP_MAX_ATTACHMENT_FILE_SIZE_MB=10
```

FE tidak perlu tahu service account key.

FE hanya consume:

```txt
upload_url dari backend
download_url dari backend
```

---

## 27. Regression Test yang Sudah Valid

Backend sudah ditest untuk flow berikut:

```txt
1. Create FRP
2. Approve by Manager department requester
3. Creator tidak bisa approve sendiri
4. IT SuperUser tidak otomatis bisa approve semua
5. Revert oleh Manager department requester
6. Edit FRP setelah revert / PENDING
7. Budget lama RELEASE, budget baru RESERVE
8. FRP number tidak berubah
9. Attachment signed upload ke GCS
10. Confirm attachment
11. Download/preview via signed download_url
12. Cancel attachment saat PENDING
13. File di GCS ikut hilang saat cancel
14. Upload ulang sequence lanjut -02, tidak recycle -01
15. Attachment tidak bisa dicancel saat APPROVED
16. Setelah REVERT, attachment bisa dicancel lagi
17. APPROVED tidak bisa edit
18. Manager Finance tidak bisa edit
19. Budget beda department ditolak
20. Required attachment CANCELED semua -> approve gagal
21. document_type_ids [] -> approve sukses tanpa attachment
22. Reject -> budget RELEASE, status REJECTED, tidak bisa edit/approve/revert
```

---

## 28. FE Implementation Notes

### Jangan hardcode permission hanya dari role name

FE boleh hide/show button berdasarkan local profile, tapi backend tetap source of truth.

Recommended:

```txt
FE hide/show button untuk UX.
Backend tetap validasi permission.
Kalau backend return forbidden-like error, tampilkan message dari backend.
```

### Jangan simpan signed URL permanen

```txt
upload_url dan download_url expired.
Selalu request ulang kalau expired.
```

### Jangan anggap upload selesai setelah PUT GCS

Upload dianggap selesai kalau:

```txt
PUT GCS success
AND confirm endpoint success
```

Kalau confirm belum sukses, attachment masih `PENDING`.

### Jangan hapus row attachment dari UI total

Untuk active list, FE tampilkan hanya:

```txt
upload_status !== CANCELED
```

Untuk audit/history, FE boleh tampilkan CANCELED kalau dibutuhkan.

### Replace file bukan overwrite

Replace file bukan upload ke path lama.

Flow wajib:

```txt
cancel old attachment -> upload new attachment -> confirm new attachment
```

---

## 29. Final FE Checklist

```txt
[ ] Create FRP form support document_type_ids
[ ] Edit FRP form support document_type_ids
[ ] Detail page show documents requirement
[ ] Detail page show active attachments
[ ] Upload component use sign-upload -> PUT GCS -> confirm
[ ] Preview/download use download-url endpoint
[ ] Remove file use cancel endpoint
[ ] Hide edit button when APPROVED / REJECTED
[ ] Hide edit button for Manager non-creator
[ ] Hide attachment add/remove when APPROVED / REJECTED
[ ] Show approve/reject only for Manager requester department and not creator
[ ] Show revert only when APPROVED and user Manager requester department / IT
[ ] Handle required attachment error on approve
[ ] Handle signed URL expired by re-request sign-upload/download-url
```
