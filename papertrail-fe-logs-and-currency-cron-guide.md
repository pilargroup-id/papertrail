# Logs Endpoint + Currency Exchange Rate Cron Guide

## Ringkasan perubahan

Update ini menambahkan 2 bagian:

1. Internal endpoint untuk cron sync kurs BI.
2. Read-only endpoint untuk melihat `activity_logs` dan `budget_usage_logs`.

File yang berubah/ditambah:

```txt
src/routes/index.js
src/routes/internal/index.js
src/routes/internal/currencySync.routes.js
src/controllers/internal/currencySync.controller.js
src/routes/logs/index.js
src/controllers/logs/log.controller.js
src/services/logs/log.service.js
src/models/logs/log.model.js
```

---

# 1. Currency Exchange Rate Cron

## Endpoint internal

```http
POST /api/internal/currency/exchange-rates/sync
```

Endpoint ini tidak memakai login user. Endpoint ini memakai internal token melalui header:

```http
X-Internal-Token: <TOKEN>
```

Token dibaca dari env:

```env
CURRENCY_SYNC_CRON_TOKEN=isi_token_random_panjang
```

Fallback env yang juga didukung:

```env
INTERNAL_CRON_TOKEN=isi_token_random_panjang
```

Rekomendasi pakai token random panjang, contoh:

```bash
openssl rand -hex 32
```

## Contoh manual test di VM

```bash
curl -s -X POST "https://papertrail.pilargroup.id/api/internal/currency/exchange-rates/sync" \
  -H "X-Internal-Token: ISI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lookback_days":7}'
```

Expected response:

```json
{
  "success": true,
  "message": "Exchange rates synced successfully",
  "data": {
    "source": "Bank Indonesia Kurs Transaksi",
    "total": 1,
    "success": 1,
    "failed": 0,
    "results": []
  }
}
```

## Sync currency tertentu

```bash
curl -s -X POST "https://papertrail.pilargroup.id/api/internal/currency/exchange-rates/sync" \
  -H "X-Internal-Token: ISI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currency_code":"USD","lookback_days":7}'
```

## Sync beberapa currency

```bash
curl -s -X POST "https://papertrail.pilargroup.id/api/internal/currency/exchange-rates/sync" \
  -H "X-Internal-Token: ISI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"currencies":["USD","EUR","SGD"],"lookback_days":7}'
```

## Cronjob VM

Edit crontab:

```bash
crontab -e
```

Jalankan setiap Senin-Jumat jam 17:00 WIB:

```cron
0 17 * * 1-5 curl -s -X POST "https://papertrail.pilargroup.id/api/internal/currency/exchange-rates/sync" -H "X-Internal-Token: ISI_TOKEN" -H "Content-Type: application/json" -d '{"lookback_days":7}' >> /var/log/papertrail-currency-sync.log 2>&1
```

Kalau mau jalan setiap hari jam 17:00:

```cron
0 17 * * * curl -s -X POST "https://papertrail.pilargroup.id/api/internal/currency/exchange-rates/sync" -H "X-Internal-Token: ISI_TOKEN" -H "Content-Type: application/json" -d '{"lookback_days":7}' >> /var/log/papertrail-currency-sync.log 2>&1
```

Cek log cron:

```bash
tail -f /var/log/papertrail-currency-sync.log
```

## PM2 env reminder

Kalau env ditambahkan di `.env`, restart backend:

```bash
pm2 restart papertrail-backend --update-env
```

Sesuaikan nama PM2 process dengan yang ada di VM:

```bash
pm2 list
```

---

# 2. Logs Endpoint

Endpoint logs dibuat read-only dan hanya boleh diakses user IT.

Root endpoint:

```txt
/api/logs
```

Semua endpoint logs tetap memakai auth normal aplikasi:

```http
Authorization: Bearer <token>
```

User non-IT akan ditolak dengan message:

```txt
Only IT users can view logs
```

## 2.1 Get Activity Logs

```http
GET /api/logs/activities
```

### Query params

| Param | Contoh | Keterangan |
|---|---|---|
| `page` | `1` | Halaman |
| `limit` | `10` | Max 100 |
| `module` | `RP` | Filter module |
| `entity_type` | `rp_requests` | Filter entity type |
| `entity_id` | UUID | Filter entity id |
| `action` | `CREATE` | Filter action |
| `actor_user_id` | UUID | Filter actor |
| `actor_department_id` | `8` | Filter departemen actor |
| `date_from` | `2026-08-01` | Start date |
| `date_to` | `2026-08-11` | End date |
| `search` | `RP-FIN` | Search umum |

### Contoh curl

```bash
curl -X GET "$BASE_URL/logs/activities?page=1&limit=10&module=RP" \
  -H "Authorization: Bearer $TOKEN"
```

### Contoh response

```json
{
  "success": true,
  "message": "Activity logs retrieved",
  "data": [
    {
      "id": 1,
      "module": "RP",
      "entity_type": "rp_requests",
      "entity_id": "uuid-rp",
      "action": "CREATE",
      "description": "Create RP RP-FIN-26-00001",
      "old_values": null,
      "new_values": {},
      "metadata": {},
      "actor_user_id": "uuid-user",
      "actor_username": "azi",
      "actor_name": "Azi Fauzi",
      "created_at": "2026-08-11 09:00:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 2.2 Get Budget Usage Logs

```http
GET /api/logs/budget-usages
```

### Query params

| Param | Contoh | Keterangan |
|---|---|---|
| `page` | `1` | Halaman |
| `limit` | `10` | Max 100 |
| `budget_id` | `1` | Filter budget |
| `source_module` | `RP` | `RP`, `FRP`, `ADJUSTMENT` |
| `source_header_id` | UUID | RP/FRP id |
| `source_item_id` | UUID | RP/FRP item id |
| `transaction_type` | `RESERVE` | `RESERVE`, `RELEASE`, `FINALIZE`, `REVERT_FINALIZE`, `ADJUST` |
| `created_by_user_id` | UUID | User pembuat log |
| `date_from` | `2026-08-01` | Start date |
| `date_to` | `2026-08-11` | End date |
| `search` | `RP-FIN` | Search umum |

### Contoh curl

```bash
curl -X GET "$BASE_URL/logs/budget-usages?page=1&limit=20&source_module=RP&transaction_type=RESERVE" \
  -H "Authorization: Bearer $TOKEN"
```

### Contoh cek movement 1 RP/FRP

```bash
curl -X GET "$BASE_URL/logs/budget-usages?source_header_id=ISI_RP_ATAU_FRP_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### Contoh response

```json
{
  "success": true,
  "message": "Budget usage logs retrieved",
  "data": [
    {
      "id": 1,
      "budget_id": 1,
      "budget_code": "BGT-FIN-001",
      "budget_project_name": "Finance Budget",
      "source_module": "RP",
      "source_header_id": "uuid-rp",
      "source_item_id": "uuid-item",
      "transaction_type": "RESERVE",
      "amount": "60000.00",
      "balance_before": "1000000.00",
      "balance_after": "940000.00",
      "notes": "Reserve budget for RP-FIN-26-00001",
      "created_by_user_name": "Kevin Phillips",
      "created_at": "2026-08-11 09:00:00"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

---

# 3. FE Usage Notes

## Activity logs

Gunakan untuk audit trail umum:

```txt
Create RP
Approve RP
Reject RP
Create FRP
Approve FRP
Create FRP from RP
Procurement void
```

Filter paling sering dipakai:

```txt
module
entity_type
entity_id
action
date_from
date_to
```

## Budget usage logs

Gunakan untuk audit budget movement:

```txt
RESERVE
RELEASE
FINALIZE
REVERT_FINALIZE
ADJUST
```

Filter paling sering dipakai:

```txt
source_module
source_header_id
transaction_type
budget_id
```

## Mapping transaction_type

| transaction_type | Arti |
|---|---|
| `RESERVE` | Budget dikunci sementara |
| `RELEASE` | Budget reserved dikembalikan |
| `FINALIZE` | Budget reserved menjadi used |
| `REVERT_FINALIZE` | Finalize dibatalkan, used kembali ke reserved |
| `ADJUST` | Koreksi manual budget |

---

# 4. Deployment Notes

Setelah copy file ke VM:

```bash
npm run build # kalau project punya build step
pm2 restart papertrail-backend --update-env
```

Cek route:

```bash
curl -i "$BASE_URL/logs/activities?page=1&limit=1" -H "Authorization: Bearer $TOKEN"
```

Cek cron endpoint:

```bash
curl -i -X POST "$BASE_URL/internal/currency/exchange-rates/sync" \
  -H "X-Internal-Token: ISI_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lookback_days":7}'
```
