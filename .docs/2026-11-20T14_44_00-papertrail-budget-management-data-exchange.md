# Papertrail — Budget Management & Master Data Exchange

## Scope

Patch ini hanya untuk Budget Transfer, Budget Adjustment, Budget Transaction History, dan pengelolaan Import/Export master berbasis workbook Excel. Tidak mengubah approval FRP/RP dari patch terpisah.

## Instalasi

1. Apply `database/migrations/031_budget_management_transactions.sql` pada database Papertrail.
2. Salin file yang terdapat dalam ZIP ke path yang sama pada backend.
3. Install dependency pada source backend (kemudian commit `package-lock.json` yang dihasilkan):

   ```bash
   npm install exceljs@^4.4.0 multer@^2.0.2
   ```

   **Penting:** ZIP menyertakan perubahan `package.json`, tetapi **tidak menyertakan package-lock.json terbaru**, karena registry npm tidak tersedia saat build. Jalankan perintah install sebelum `npm ci` atau deployment baru. Jangan deploy hanya mengganti `package.json` tanpa memperbarui lockfile.
4. Restart backend setelah instalasi; verifikasi permission modul masing-masing user.
5. Belum dilakukan test DB integration atau HTTP e2e; lakukan test terlebih dulu pada database development.

## Budget — aturan transaksi

- `company_id`, `department_id`, dan `class_department_id` source & destination **harus identik** untuk transfer.
- Budget source/target harus aktif. Transfer tidak menyentuh `budget_reserved` dan `budget_used`; hanya `budget_amount` dan `budget_remaining`.
- Pengurangan dan transfer keluar tidak boleh melebihi `budget_remaining`; anggaran yang telah `RESERVED` atau `USED` tidak bisa dipindahkan.
- Transaksi seluruhnya atomik, `SELECT ... FOR UPDATE` secara urutan ID untuk mencegah lost update/deadlock berulang.
- Setiap pergerakan menulis `budget_management_transactions` (header), `budget_management_transaction_lines` (rinci), `budget_usage_logs` jenis `ADJUST`, serta `activity_logs`.
- `budget_usage_logs.source_module='ADJUSTMENT'`, `source_header_id` menyimpan UUID transaksi; `amount` negatif untuk transfer keluar/pengurangan dan positif untuk transfer masuk/penambahan.
- `PUT /api/master/budgets/:id` tidak lagi menerima perubahan saldo atau company/department/class. Edit metadata saja; untuk uang gunakan endpoint transaksi. Pada create budget, remaining otomatis sama dengan amount dan reserved/used = 0.

### Transfer

`POST /api/master/budgets/transfer` — permission `MASTER_BUDGET.update`.

```json
{"source_budget_id":1,"destination_budget_id":2,"amount":"2500000.00","reason":"Reallocation budget equipment to maintenance"}
```

Menghasilkan transaksi TRANSFER dengan baris `TRANSFER_OUT` (-amount) dan `TRANSFER_IN` (+amount). Total alokasi semua budget tidak berubah.

### Adjustment

`POST /api/master/budgets/:id/adjust` — permission `MASTER_BUDGET.update`.

```json
{"operation":"INCREASE","amount":"1000000.00","reason":"Additional approved allocation"}
```

Untuk pengurangan gunakan `"operation":"DECREASE"`. Nominal selalu positif (maksimal 2 desimal).

### History

- `GET /api/master/budgets/transactions?page=1&limit=20`
- `GET /api/master/budgets/:id/transactions?page=1&limit=20`

Permission: `MASTER_BUDGET.view`. Response paginated standar dengan `data[]`, `meta`. Tiap transaksi memuat `lines[]` berisi saldo awal/akhir, budget ID, jenis pergerakan.

## Master Data Exchange — grouping

| Group (`group`) | Sheet Excel (urutan) |
|---|---|
| `vendor_banking` | `Vendors`, `Banks`, `VendorBankAccounts` |
| `budget` | `BudgetTypes`, `Budgets`, `BudgetAccessRules` |
| `currency` | `Currencies`, `ExchangeRates` |

Satu halaman FE, satu workbook berisi 1–3 sheet. Workbook boleh memiliki hanya beberapa sheet di grup yang dipilih. Saat import, pemrosesan mengikuti urutan sheet di atas untuk FK.

### API

- `GET /api/master/data-exchange/groups` — daftar grup dan nama kolom.
- `GET /api/master/data-exchange/template?group=vendor_banking` — template `.xlsx` (nama sheet + headers).
- `GET /api/master/data-exchange/export?group=vendor_banking` — seluruh data `.xlsx` (maksimal **50.000 baris per sheet**, urutan ID; data di atas batas tersebut belum tercakup). 
- `POST /api/master/data-exchange/validate` — `multipart/form-data`: field `file` (.xlsx), `group`, `mode`; mengembalikan `valid`, `report` per sheet (insert/update/skip), `errors`.
- `POST /api/master/data-exchange/import` — `multipart/form-data`: field sama; import dalam satu SQL transaction.

Ukuran file maksimum **8 MB** dan **5.000 baris/sheet** per import. Mode: `INSERT_ONLY` (gagal bila ID/key sudah ada), `UPSERT` (update row existing berdasarkan ID atau natural key), `SKIP_DUPLICATES` (lewati row existing). Matching menggunakan ID bila ada, kalau tidak berdasarkan `name`, `code`, `budget_code`, atau key gabungan yang ditentukan per tabel. Error constraint/FK dari DB juga bisa menyebabkan import gagal; validasi awal belum mensimulasikan seluruh constraint/FK database.

Contoh `curl`:

```bash
curl -X POST 'https://papertrail.pilargroup.id/api/master/data-exchange/validate' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'group=vendor_banking' -F 'mode=INSERT_ONLY' \
  -F 'file=@vendor_banking.xlsx'
```

Import sama, hanya ganti URL `/validate` menjadi `/import` **setelah** `valid=true`.

### Keamanan dan audit

- Seluruh endpoint memakai auth aplikasi yang sudah ada pada `/api/master`.
- Export/template harus punya permission `view` untuk **setiap** sheet di grup.
- Import/validate harus punya permission `create` untuk setiap sheet; `UPSERT` juga memerlukan `update`.
- Saat import, kolom yang diizinkan di-hardcode (tidak ada arbitrary table/column SQL input). Import berhasil menulis ringkasan di `activity_logs`.
- **Jangan edit saldo budget melalui Excel.** Sheet `Budgets` hanya mengimpor budget baru (`budget_amount` otomatis menjadi `budget_remaining`; reserved/used = 0). Existing budget pada `UPSERT` akan ditolak; `SKIP_DUPLICATES` melewatinya. Penambahan/pengurangan anggaran harus lewat Budget Adjustment.
- `ExchangeRates` dapat diimpor untuk nilai historis/manual, tetapi sinkronisasi otomatis BI tetap memakai service currency existing.
- Untuk sheet FK, sertakan ID sumber yang valid. Template bukan alat resolusi nama vendor/bank otomatis.
- Jangan menjadikan `validate=true` sebagai jaminan commit pasti berhasil: perubahan data bersamaan atau FK constraint masih bisa menggagalkan transaksi.

## Checklist QA Development

1. Buat budget baru: `remaining=amount`, `reserved=used=0`.
2. Transfer 2 budget dalam company/dept/class yang sama: sum amount tetap; 2 lines + 2 log ADJUST.
3. Transfer antar-company/dept/class berbeda: 400, saldo tidak berubah.
4. Transfer melebihi remaining: 400, saldo tidak berubah.
5. Adjustment INCREASE dan DECREASE: periksa amount/remaining, budget_reserved/used tetap.
6. Edit budget PUT mengubah amount/remaining atau konteks: 400.
7. Import workbook Vendor & Banking: validate dahulu, lalu import; FK Vendor/Bank konsisten.
8. Import workbook duplicate: mode SKIP_DUPLICATES tidak menggandakan.
9. Import workbook invalid sheet/kolom, FK tidak valid: rollback seluruhnya.
10. Export dan import pakai user tanpa permission: 403.
11. Regression test alur `RP RESERVE`, `FRP FINALIZE`, `RP RELEASE`, `FRP REVERT` tidak berubah.
