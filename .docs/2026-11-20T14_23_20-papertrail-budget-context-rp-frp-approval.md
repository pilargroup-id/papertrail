# Papertrail — Budget Context & Approval FRP dari RP

SOT: `backend(20261120-061929).zip`. Update ini hanya mengubah file terkait; **jangan replace seluruh backend**.

## Ringkasan business rules

### FRP Direct
- Pilih `company_id`, `department_id`, `class_department_id` dari context di `/auth/me`.
- Dropdown budget: `GET /api/master/budgets?purpose=FRP&company_id=...&department_id=...&class_department_id=...`.
- Backend menolak create/update FRP Direct bila item memakai budget milik company/department/class lain, termasuk ketika user mempunyai akses ke beberapa department.
- Approval dan budget RESERVE/FINALIZE untuk FRP Direct tetap mengikuti flow lama (buat=PENDING+RESERVE; approve=FINALIZE; reject=RELEASE).

### RP
- Pilih konteks pembuat (`company_id`, `department_id`, `class_department_id`) dari `/auth/me`.
- Pembuat dengan **selected department IT (id 8) atau HCGA (id 1)**: budget item hanya boleh milik department tujuan (`destination_department_id`) dalam company terpilih. Class budget destination bisa berbeda; validasi mengikuti department tujuan. Target wajib aktif pada master RP destination departments.
- Pembuat dari department lainnya: budget item harus sama dengan company, department, dan class yang dipilih dari `/auth/me`.
- Dropdown IT/HCGA: `GET /api/master/budgets?purpose=RP&company_id=...&department_id=8&class_department_id=8&destination_department_id=2` untuk contoh target Legal (id 2).
- Dropdown RP biasa: `GET /api/master/budgets?purpose=RP&company_id=...&department_id=...&class_department_id=...`.
- Backend tetap memvalidasi saat create/update/checker; mengganti `budget_id` secara manual tidak melewati validasi.
- Pada multi-department/company, FE harus mengirim konteks yang aktif. Company ID harus berada di `user.companies` atau sama dengan `user.company_id`. Department/class harus tercantum pada `/auth/me`.

### Create FRP from RP: approval baru
1. General Procurement memanggil `POST /api/rp/:id/create-frp` seperti sebelumnya.
2. Backend membuat FRP `status=PENDING`, `source_module=RP`; RP tetap `APPROVED`, `frp_conversion_status=CREATED`, dengan pointer FRP.
3. **Belum ada pergerakan budget** saat create FRP. Semua reserve RP masih tertahan.
4. Asst./Assistant Manager Product memanggil `POST /api/frp/:id/approve`.
5. Dalam **satu DB transaction**: RP **RELEASE** reserve lama, FRP **RESERVE** nilai final, FRP **FINALIZE** nilai final, lalu FRP menjadi `APPROVED`. Jika tidak cukup budget/validasi gagal, seluruh transaksi rollback.
6. Penolakan lewat `POST /api/frp/:id/reject` dengan `{ "reason": "..." }`: FRP `REJECTED`, RP tetap `APPROVED` dan kembali `frp_conversion_status=NOT_CREATED` (pointer conversion dihapus), **reserve RP tidak dilepas**. General Procurement dapat membuat FRP baru dari RP itu. FRP lama tetap ada sebagai histori `REJECTED`.
7. FRP dari RP yang `APPROVED` **tidak dapat direvert dengan endpoint revert generik**. Dibutuhkan prosedur tersendiri untuk memulihkan pembukuan budget RP; endpoint mengembalikan error sebagai guard.

## Approver
- `job_position` berawalan `Assistant Manager`, `Asst Manager`, atau `Asst. Manager` (case-insensitive), dan user terdaftar pada Product (department ID 13 / nama Product pada `departments`).
- Pembuat FRP tidak boleh menyetujui FRP sendiri.
- FRP Direct tetap mengikuti approver sebelumnya.
- Form pending FRP dari RP muncul di list `GET /api/frp?source_module=RP&status=PENDING` untuk role Assistant Manager Product.
- Detail tetap `GET /api/frp/:id`.

## Attachment
- General Procurement **pembuat FRP** tetap dapat mengelola attachment pada FRP hasil RP baik `PENDING` maupun `APPROVED` melalui endpoint attachment yang sudah ada.
- Untuk FRP Direct, attachment tetap mengikuti aturan lama.

## Response yang harus diperhatikan FE
- `POST /api/rp/:id/create-frp` sekarang mengembalikan `data.status=PENDING` (bukan APPROVED).
- Setelah create, FE arahkan ke detail FRP untuk upload attachment dan menunggu approval Product.
- `GET /api/rp?status=APPROVED&frp_conversion_status=NOT_CREATED` adalah queue RP yang belum dibuat FRP. RP yang sedang menunggu approval FRP **tidak ada di queue ini**, karena conversion berstatus CREATED.
- Setelah reject, RP kembali muncul dalam queue tersebut.

## Test checklist sebelum deploy
1. User satu department: list budget FRP cuma budget context itu.
2. Multi-department: switch ke department/company lain menghasilkan budget sesuai pilihan; ID company/dept di luar auth => error.
3. IT/HCGA membuat RP tujuan Legal => hanya budget Legal dari selected company; budget IT ditolak di backend.
4. User biasa membuat RP => hanya budget department/class yang aktif.
5. General Procurement create FRP dari RP approved (uji amount sama dan override): status PENDING, `budget_usage_logs` tidak berubah saat create.
6. Asst Manager Product bukan pembuat approve: urutan log RP RELEASE, FRP RESERVE, FRP FINALIZE dan FRP APPROVED.
7. Approver lain tidak boleh approve/reject FRP hasil RP.
8. Reject FRP hasil RP => RP kembali NOT_CREATED, budget RP tetap RESERVED, tidak ada FRP RELEASE.
9. Uji nilai FRP melebihi available balance: approve gagal, tidak ada perubahan budget/status.
10. General Procurement pembuat FRP bisa upload/confirm/cancel/download attachment saat pending dan approved.
11. FRP Direct tetap create/approve/reject tanpa regresi.

## Batasan dan catatan implementasi
- Perubahan menggunakan `PENDING` yang **sudah ada** di enum `frp_requests.status`: tidak perlu migration SQL baru.
- Pengecekan role Product Assistant Manager mengacu ke data posisi dan department dari `/auth/me`.
- Endpoint master `GET /api/master/budgets` sekarang difilter berdasarkan context user (default `purpose=FRP`); pastikan FE master budget management juga disesuaikan karena sebelumnya endpoint list tidak dibatasi context.
- Listing yang difilter tidak mengganti otorisasi transaksional: setiap create/update FRP/RP tetap validasi budget di server.
- Perubahan tidak memperbaiki atau memigrasikan FRP hasil RP yang **sudah dibuat APPROVED sebelum deploy patch**. Flow baru berlaku untuk creation setelah deploy.
- Uji integrasi terhadap database production/staging **belum dilakukan**; yang diverifikasi saat pembuatan paket adalah sintaks JS dan uji fungsi filter statis.
