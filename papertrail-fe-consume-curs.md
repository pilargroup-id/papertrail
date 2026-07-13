# Dokumentasi FE - Modul Kurs / Currency Papertrail

Dokumentasi ini menjelaskan cara FE consume fitur kurs terbaru untuk modul FRP Papertrail.

Fitur kurs dipakai untuk **FRP direct**. Untuk **Create FRP from RP**, nilai tetap IDR dan tidak menggunakan kurs.

---

## 1. Konsep Utama

Pada FRP, user cukup memilih mata uang. FE **tidak perlu mengirim exchange rate manual**.

Backend akan:

1. menerima `currency_code` dari FE,
2. mencari kurs terbaru berdasarkan `frp_date`,
3. menghitung `amount_original`, `exchange_rate`, dan `amount_idr`,
4. melakukan budget movement memakai nilai IDR (`amount_idr`).

Jadi rule pentingnya:

```txt
FE kirim currency_code saja.
Backend yang menentukan exchange_rate.
Budget selalu menggunakan amount_idr.
```

---

## 2. Kapan Kurs Dipakai?

| Modul | Pakai Kurs? | Catatan |
|---|---:|---|
| FRP Direct | Ya | User bisa memilih IDR / foreign currency |
| Create FRP from RP | Tidak | RP sudah IDR, FRP hasil RP tetap IDR |
| RP | Tidak | Semua nilai RP dianggap IDR |

---

## 3. Endpoint Currency / Kurs

Base URL contoh:

```txt
/api/master/currencies
```

### 3.1 List Currency

Digunakan FE untuk dropdown currency di form FRP.

```http
GET /api/master/currencies
```

Contoh response:

```json
{
  "success": true,
  "message": "Currencies retrieved",
  "data": [
    {
      "id": 1,
      "code": "IDR",
      "name": "Indonesian Rupiah",
      "symbol": "Rp",
      "is_base_currency": 1,
      "is_active": 1
    },
    {
      "id": 2,
      "code": "USD",
      "name": "US Dollar",
      "symbol": "$",
      "is_base_currency": 0,
      "is_active": 1
    }
  ]
}
```

FE gunakan field:

```txt
code -> dikirim sebagai currency_code
name -> label dropdown
symbol -> optional untuk UI
```

---

### 3.2 Latest Exchange Rate

Digunakan FE untuk preview kurs sebelum submit FRP.

```http
GET /api/master/currencies/exchange-rates/latest?currency_code=USD&date=2026-07-10
```

Parameter:

| Query | Required | Keterangan |
|---|---:|---|
| `currency_code` | Ya | Contoh: USD, CNY, SGD |
| `date` | Optional | Biasanya sama dengan `frp_date`. Kalau kosong backend pakai tanggal hari ini / latest available |

Contoh response:

```json
{
  "success": true,
  "message": "Latest exchange rate retrieved",
  "data": {
    "currency_code": "USD",
    "exchange_rate": 16250,
    "exchange_rate_date": "2026-07-10",
    "exchange_rate_type": "MIDDLE_RATE",
    "exchange_rate_source": "BI"
  }
}
```

Catatan:

```txt
Endpoint ini untuk preview UI saja.
Nilai exchange_rate dari FE tetap tidak dipercaya saat submit FRP.
Backend akan resolve ulang kurs saat create/update FRP.
```

---

### 3.3 Create / Update Manual Exchange Rate

Digunakan oleh admin/master data, bukan user FRP biasa.

```http
POST /api/master/currencies/exchange-rates
```

Payload:

```json
{
  "currency_code": "USD",
  "rate_date": "2026-07-10",
  "middle_rate": 16250,
  "source": "MANUAL"
}
```

Expected behavior:

```txt
Kalau rate untuk currency + tanggal sudah ada, backend update.
Kalau belum ada, backend insert.
```

---

### 3.4 Sync Exchange Rate

Digunakan untuk sync kurs dari sumber eksternal, misalnya Bank Indonesia.

```http
POST /api/master/currencies/exchange-rates/sync
```

Payload contoh:

```json
{
  "date": "2026-07-10"
}
```

Catatan:

```txt
Di production, endpoint ini idealnya dijalankan oleh scheduled job harian.
Untuk dev/testing, manual insert rate tetap valid.
```

---

## 4. Implementasi di Form FRP Direct

### 4.1 Field yang Perlu Ditampilkan FE

Di header FRP:

| Field | Required | Keterangan |
|---|---:|---|
| `frp_date` | Ya | Tanggal FRP, dipakai backend untuk resolve kurs |
| `currency_code` | Optional | Default IDR kalau kosong |
| `exchange_rate` | Tidak dikirim | Hanya preview dari latest rate |

Di item FRP:

| Field | Required | Keterangan |
|---|---:|---|
| `budget_id` | Ya | Budget yang digunakan |
| `memo` | Optional | Keterangan item |
| `quantity` | Ya | Qty |
| `unit_price` | Ya | Harga dalam mata uang original |
| `amount` | Optional | Kalau kosong backend hitung `quantity * unit_price` |

---

## 5. Payload Create FRP Direct dengan Currency

Contoh FRP USD:

```http
POST /api/frp
```

```json
{
  "department_id": 8,
  "class_department_id": 8,
  "frp_date": "2026-07-10",
  "currency_code": "USD",
  "vendor_id": 1,
  "vendor_bank_account_id": 1,
  "external_document_type_id": 1,
  "external_document_number": "INV-USD-001",
  "payment_method_id": 1,
  "payment_date": "2026-07-20",
  "description": "FRP payment in USD",
  "internal_po_number": "PO-USD-001",
  "document_type_ids": [1],
  "items": [
    {
      "budget_id": 1,
      "memo": "Software subscription",
      "quantity": 1,
      "unit_price": 100,
      "amount": 100
    }
  ],
  "notes": "Submit FRP USD"
}
```

Backend akan menyimpan item kurang lebih seperti ini:

```txt
currency_code = USD
exchange_rate = rate dari DB
amount = 100
amount_original = 100
amount_idr = 100 * exchange_rate
```

Budget movement memakai:

```txt
amount_idr
```

---

## 6. Payload Create FRP IDR

Untuk IDR, FE boleh kirim `currency_code: "IDR"` atau tidak kirim sama sekali.

```json
{
  "department_id": 8,
  "class_department_id": 8,
  "frp_date": "2026-07-10",
  "currency_code": "IDR",
  "vendor_id": 1,
  "payment_method_id": 1,
  "payment_date": "2026-07-20",
  "description": "FRP payment IDR",
  "document_type_ids": [1],
  "items": [
    {
      "budget_id": 1,
      "memo": "Pembayaran lokal",
      "quantity": 1,
      "unit_price": 100000,
      "amount": 100000
    }
  ]
}
```

Expected:

```txt
currency_code = IDR
exchange_rate = 1
amount_original = 100000
amount_idr = 100000
```

---

## 7. Update FRP dengan Currency

```http
PUT /api/frp/:id
```

Rule-nya sama seperti create:

```txt
FE kirim currency_code.
Backend resolve ulang kurs berdasarkan frp_date.
Budget reserved lama akan RELEASE.
Budget reserved baru akan RESERVE pakai amount_idr baru.
```

Update hanya boleh untuk FRP status:

```txt
PENDING
```

---

## 8. Display Detail FRP di FE

Saat FE call detail:

```http
GET /api/frp/:id
```

Field penting yang perlu ditampilkan:

Header:

```txt
currency_code
exchange_rate
exchange_rate_date
exchange_rate_type
exchange_rate_source
total_amount
total_amount_idr
```

Items:

```txt
currency_code
exchange_rate
quantity
unit_price
amount
amount_original
amount_idr
```

Rekomendasi tampilan FE:

| Label | Field |
|---|---|
| Currency | `currency_code` |
| Kurs | `exchange_rate` |
| Tanggal Kurs | `exchange_rate_date` |
| Source Kurs | `exchange_rate_source` |
| Total Original | `total_amount` |
| Total IDR | `total_amount_idr` |

Untuk item:

| Label | Field |
|---|---|
| Harga Original | `unit_price` |
| Amount Original | `amount_original` atau `amount` |
| Kurs | `exchange_rate` |
| Amount IDR | `amount_idr` |

---

## 9. Preview Kurs di FE

Saat user memilih currency atau mengganti `frp_date`, FE bisa call latest rate:

```http
GET /api/master/currencies/exchange-rates/latest?currency_code=USD&date=2026-07-10
```

Lalu FE bisa tampilkan simulasi:

```txt
Amount Original = 100 USD
Kurs = 16.250
Estimasi IDR = 1.625.000
```

Formula preview FE:

```js
const amountOriginal = quantity * unitPrice;
const amountIdrPreview = amountOriginal * exchangeRate;
```

Tapi saat submit:

```txt
Jangan kirim exchange_rate.
Jangan kirim amount_idr.
Backend yang hitung ulang.
```

---

## 10. Error yang Mungkin Muncul

### 10.1 Rate tidak ditemukan

```json
{
  "success": false,
  "message": "Exchange rate not found"
}
```

Artinya belum ada kurs untuk currency/tanggal tersebut.

FE action:

```txt
Tampilkan pesan agar admin input/sync kurs dulu.
```

---

### 10.2 Budget tidak cukup

```json
{
  "success": false,
  "message": "Budget XXX remaining is not enough"
}
```

Artinya hasil konversi IDR lebih besar dari sisa budget.

Contoh:

```txt
100 USD * 16.250 = 1.625.000 IDR
budget remaining cuma 1.000.000 IDR
```

---

### 10.3 Currency inactive / invalid

```json
{
  "success": false,
  "message": "Currency not found or inactive"
}
```

FE action:

```txt
Refresh list currency.
Pastikan currency yang dipilih masih active.
```

---

## 11. Budget Behavior dengan Currency

### Saat Create FRP Direct

```txt
RESERVE amount_idr
```

### Saat Approve FRP

```txt
FINALIZE amount_idr
```

### Saat Reject FRP

```txt
RELEASE amount_idr
```

### Saat Revert Approved FRP

```txt
REVERT_FINALIZE amount_idr
```

---

## 12. Create FRP from RP Tidak Menggunakan Kurs

Untuk modul Create FRP from RP:

```txt
RP amount sudah IDR.
FRP hasil RP tetap IDR.
FE tidak perlu menampilkan currency selector.
FE tidak perlu call latest exchange rate.
```

Payload Create FRP from RP cukup memakai amount IDR:

```json
{
  "frp_date": "2026-07-10",
  "external_document_type_id": 1,
  "payment_method_id": 1,
  "payment_date": "2026-07-25",
  "vendor_id": 1,
  "description": "Create FRP from RP",
  "items": [
    {
      "rp_request_item_id": "rp-item-id",
      "frp_amount": 65000
    }
  ]
}
```

Expected:

```txt
currency_code = IDR
exchange_rate = 1
amount_original = frp_amount
amount_idr = frp_amount
```

---

## 13. Recommended FE Logic

### On Form Load

```txt
1. Fetch currencies.
2. Default currency_code = IDR.
3. If currency_code != IDR, fetch latest rate.
```

### On Currency Change

```txt
1. Set selected currency_code.
2. Fetch latest rate using selected currency + frp_date.
3. Recalculate preview amount_idr.
```

### On FRP Date Change

```txt
1. If selected currency_code != IDR, fetch latest rate again.
2. Recalculate preview amount_idr.
```

### On Submit

```txt
1. Send currency_code.
2. Send original item amount only.
3. Do not send exchange_rate.
4. Do not send amount_idr.
```

---

## 14. Quick Checklist FE

```txt
[ ] Dropdown currency pakai GET /api/master/currencies
[ ] Default currency IDR
[ ] Preview kurs pakai latest exchange rate endpoint
[ ] Submit hanya kirim currency_code
[ ] Jangan kirim exchange_rate
[ ] Jangan kirim amount_idr
[ ] Tampilkan total original dan total IDR
[ ] Untuk Create FRP from RP, jangan tampilkan currency selector
```

