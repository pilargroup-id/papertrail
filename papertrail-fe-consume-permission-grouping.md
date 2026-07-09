# Papertrail FE Consume Update — User Module Permission Grouping

## 1. Purpose

Dokumentasi ini menjelaskan update endpoint permission untuk kebutuhan Frontend Papertrail.

Sebelumnya endpoint utama permission adalah:

```txt
GET /api/master/user-module-permissions
```

Endpoint tersebut tetap dipakai untuk list row-level permission.

Sekarang ditambahkan 2 endpoint baru untuk kebutuhan tampilan FE:

```txt
GET /api/master/user-module-permissions/grouped-by-user
GET /api/master/user-module-permissions/grouped-by-module
```

Tujuannya supaya FE bisa render permission dalam bentuk grouping/matrix tanpa harus grouping manual terlalu banyak di sisi FE.

---

## 2. Base URL

Development:

```txt
http://localhost:3000/api
```

Permission endpoint base:

```txt
/api/master/user-module-permissions
```

Full example:

```txt
http://localhost:3000/api/master/user-module-permissions/grouped-by-user
```

---

## 3. Auth Requirement

Semua endpoint permission tetap membutuhkan auth Papertrail.

Header production:

```txt
Authorization: Bearer <token>
```

Local development dengan `DEV_AUTH=true` di backend bisa menggunakan dev token/local auth sesuai setup project.

User yang mengakses endpoint permission harus punya permission:

```txt
module_code = MASTER_PERMISSION
can_view = 1
```

Untuk create/update/deactivate permission, user juga perlu:

```txt
can_create = 1
can_update = 1
can_deactivate = 1
```

---

## 4. Endpoint Existing — Row Level List

### Endpoint

```txt
GET /api/master/user-module-permissions
```

### Use Case

Dipakai untuk mengambil data permission secara row-level/paginated.

Cocok untuk:

```txt
1. Table list biasa
2. Audit sederhana
3. Searching permission by user/module
4. Mengambil ID row permission sebelum update
```

### Query Params

```txt
page        optional, default 1
limit       optional, default 10, max 100
user_id     optional
module_id   optional
module_code optional
is_active   optional, 0 atau 1
q           optional search username/name/module
```

### Example Request

```txt
GET /api/master/user-module-permissions?page=1&limit=10&is_active=1
```

### Example Response

```json
{
  "success": true,
  "message": "User module permissions retrieved",
  "data": [
    {
      "id": 1,
      "user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
      "username_snapshot": "azi",
      "name_snapshot": "Azi Fauzi",
      "module_id": 1,
      "module_code": "MASTER_VENDOR",
      "module_name": "Master Vendor",
      "module_group": "MASTER",
      "can_view": 1,
      "can_create": 1,
      "can_update": 1,
      "can_deactivate": 1,
      "is_active": 1,
      "created_by_user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
      "created_by_name": "Azi Fauzi",
      "updated_by_user_id": null,
      "updated_by_name": null,
      "created_at": "2026-07-09T00:00:00.000Z",
      "updated_at": "2026-07-09T00:00:00.000Z"
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

---

## 5. New Endpoint — Grouped By User

### Endpoint

```txt
GET /api/master/user-module-permissions/grouped-by-user
```

### Use Case

Dipakai untuk tampilan permission berdasarkan user.

Cocok untuk FE screen seperti:

```txt
User Permission Matrix
- Azi Fauzi
  - MASTER_VENDOR
  - MASTER_BANK
  - MASTER_BUDGET

- User Lain
  - MASTER_VENDOR
  - MASTER_PERMISSION
```

### Query Params

Endpoint ini support filter yang sama dengan endpoint row-level:

```txt
user_id     optional
module_id   optional
module_code optional
is_active   optional, 0 atau 1
q           optional search username/name/module
```

Catatan:

```txt
Endpoint grouped tidak pakai pagination.
Gunakan filter q/user_id/is_active kalau data sudah besar.
```

### Example Request — All Active Permissions Grouped By User

```txt
GET /api/master/user-module-permissions/grouped-by-user?is_active=1
```

### Example Request — Specific User

```txt
GET /api/master/user-module-permissions/grouped-by-user?user_id=bd625aff-7fc4-44e9-b95c-549f99f47991
```

### Example Response

```json
{
  "success": true,
  "message": "User module permissions grouped by user retrieved",
  "data": [
    {
      "user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
      "username_snapshot": "azi",
      "name_snapshot": "Azi Fauzi",
      "permissions": [
        {
          "id": 1,
          "module_id": 1,
          "module_code": "MASTER_VENDOR",
          "module_name": "Master Vendor",
          "module_group": "MASTER",
          "can_view": 1,
          "can_create": 1,
          "can_update": 1,
          "can_deactivate": 1,
          "is_active": 1,
          "created_by_user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
          "created_by_name": "Azi Fauzi",
          "updated_by_user_id": null,
          "updated_by_name": null,
          "created_at": "2026-07-09T00:00:00.000Z",
          "updated_at": "2026-07-09T00:00:00.000Z"
        },
        {
          "id": 2,
          "module_id": 2,
          "module_code": "MASTER_BANK",
          "module_name": "Master Bank",
          "module_group": "MASTER",
          "can_view": 1,
          "can_create": 1,
          "can_update": 1,
          "can_deactivate": 1,
          "is_active": 1,
          "created_by_user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
          "created_by_name": "Azi Fauzi",
          "updated_by_user_id": null,
          "updated_by_name": null,
          "created_at": "2026-07-09T00:00:00.000Z",
          "updated_at": "2026-07-09T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### FE Consumption Example

```js
async function getPermissionsGroupedByUser(apiBaseUrl) {
  const response = await fetch(
    `${apiBaseUrl}/master/user-module-permissions/grouped-by-user?is_active=1`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to get grouped permissions by user');
  }

  return json.data;
}
```

### FE Render Concept

```jsx
function PermissionByUser({ users = [] }) {
  return (
    <div>
      {users.map((user) => (
        <section key={user.user_id}>
          <h3>{user.name_snapshot}</h3>
          <p>{user.username_snapshot}</p>

          <table>
            <thead>
              <tr>
                <th>Module</th>
                <th>View</th>
                <th>Create</th>
                <th>Update</th>
                <th>Deactivate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {user.permissions.map((permission) => (
                <tr key={permission.id}>
                  <td>{permission.module_name}</td>
                  <td>{permission.can_view ? 'Yes' : 'No'}</td>
                  <td>{permission.can_create ? 'Yes' : 'No'}</td>
                  <td>{permission.can_update ? 'Yes' : 'No'}</td>
                  <td>{permission.can_deactivate ? 'Yes' : 'No'}</td>
                  <td>{permission.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
```

---

## 6. New Endpoint — Grouped By Module

### Endpoint

```txt
GET /api/master/user-module-permissions/grouped-by-module
```

### Use Case

Dipakai untuk tampilan permission berdasarkan module.

Cocok untuk FE screen seperti:

```txt
Module Permission Matrix
- MASTER_VENDOR
  - Azi Fauzi
  - User Lain

- MASTER_BANK
  - Azi Fauzi
  - User Lain
```

### Query Params

Endpoint ini support filter yang sama:

```txt
user_id     optional
module_id   optional
module_code optional
is_active   optional, 0 atau 1
q           optional search username/name/module
```

Catatan:

```txt
Endpoint grouped tidak pakai pagination.
Gunakan filter q/module_code/is_active kalau data sudah besar.
```

### Example Request — All Active Permissions Grouped By Module

```txt
GET /api/master/user-module-permissions/grouped-by-module?is_active=1
```

### Example Request — Specific Module

```txt
GET /api/master/user-module-permissions/grouped-by-module?module_code=MASTER_VENDOR
```

### Example Response

```json
{
  "success": true,
  "message": "User module permissions grouped by module retrieved",
  "data": [
    {
      "module_id": 1,
      "module_code": "MASTER_VENDOR",
      "module_name": "Master Vendor",
      "module_group": "MASTER",
      "users": [
        {
          "id": 1,
          "user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
          "username_snapshot": "azi",
          "name_snapshot": "Azi Fauzi",
          "can_view": 1,
          "can_create": 1,
          "can_update": 1,
          "can_deactivate": 1,
          "is_active": 1,
          "created_by_user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
          "created_by_name": "Azi Fauzi",
          "updated_by_user_id": null,
          "updated_by_name": null,
          "created_at": "2026-07-09T00:00:00.000Z",
          "updated_at": "2026-07-09T00:00:00.000Z"
        }
      ]
    }
  ]
}
```

### FE Consumption Example

```js
async function getPermissionsGroupedByModule(apiBaseUrl) {
  const response = await fetch(
    `${apiBaseUrl}/master/user-module-permissions/grouped-by-module?is_active=1`,
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to get grouped permissions by module');
  }

  return json.data;
}
```

### FE Render Concept

```jsx
function PermissionByModule({ modules = [] }) {
  return (
    <div>
      {modules.map((module) => (
        <section key={module.module_id}>
          <h3>{module.module_name}</h3>
          <p>{module.module_code}</p>

          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>View</th>
                <th>Create</th>
                <th>Update</th>
                <th>Deactivate</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {module.users.map((userPermission) => (
                <tr key={userPermission.id}>
                  <td>{userPermission.name_snapshot}</td>
                  <td>{userPermission.can_view ? 'Yes' : 'No'}</td>
                  <td>{userPermission.can_create ? 'Yes' : 'No'}</td>
                  <td>{userPermission.can_update ? 'Yes' : 'No'}</td>
                  <td>{userPermission.can_deactivate ? 'Yes' : 'No'}</td>
                  <td>{userPermission.is_active ? 'Active' : 'Inactive'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
    </div>
  );
}
```

---

## 7. Why PUT and PATCH Do Not Need To Change

Endpoint berikut tetap dipertahankan:

```txt
PUT   /api/master/user-module-permissions/:id
PATCH /api/master/user-module-permissions/:id/status
```

Alasannya:

```txt
1. Data permission tetap disimpan per row di table user_module_permissions.
2. Grouped endpoint hanya bentuk response untuk read/display FE.
3. Update permission tetap paling aman dilakukan per row berdasarkan id.
4. Tidak perlu endpoint update grouped karena rawan update massal tidak sengaja.
5. FE tetap bisa render grouped data, lalu saat user edit salah satu permission, FE update row tersebut berdasarkan id permission.
```

Jadi endpoint grouped hanya untuk:

```txt
GET / read / display
```

Sedangkan update tetap memakai:

```txt
PUT / PATCH row-level
```

---

## 8. How FE Should Update Permission From Grouped Data

### Scenario

FE ambil data dari:

```txt
GET /api/master/user-module-permissions/grouped-by-user
```

Response permission item punya `id`:

```json
{
  "id": 1,
  "module_id": 1,
  "module_code": "MASTER_VENDOR",
  "can_view": 1,
  "can_create": 1,
  "can_update": 1,
  "can_deactivate": 1,
  "is_active": 1
}
```

Saat user edit checkbox permission tersebut, FE tetap call:

```txt
PUT /api/master/user-module-permissions/1
```

### PUT Body

PUT membutuhkan body lengkap untuk row permission tersebut:

```json
{
  "user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
  "username_snapshot": "azi",
  "name_snapshot": "Azi Fauzi",
  "module_id": 1,
  "can_view": 1,
  "can_create": 1,
  "can_update": 0,
  "can_deactivate": 0
}
```

### Example FE Update Function

```js
async function updateUserModulePermission(apiBaseUrl, permission) {
  const response = await fetch(
    `${apiBaseUrl}/master/user-module-permissions/${permission.id}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: permission.user_id,
        username_snapshot: permission.username_snapshot,
        name_snapshot: permission.name_snapshot,
        module_id: permission.module_id,
        can_view: permission.can_view,
        can_create: permission.can_create,
        can_update: permission.can_update,
        can_deactivate: permission.can_deactivate,
      }),
    }
  );

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to update permission');
  }

  return json.data;
}
```

---

## 9. How FE Should Activate / Deactivate Permission

Untuk toggle aktif/nonaktif permission, FE tetap pakai:

```txt
PATCH /api/master/user-module-permissions/:id/status
```

### Body

```json
{
  "is_active": 0
}
```

Atau aktifkan lagi:

```json
{
  "is_active": 1
}
```

### Example FE Function

```js
async function updateUserModulePermissionStatus(apiBaseUrl, permissionId, isActive) {
  const response = await fetch(
    `${apiBaseUrl}/master/user-module-permissions/${permissionId}/status`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        is_active: isActive,
      }),
    }
  );

  const json = await response.json();

  if (!response.ok || !json.success) {
    throw new Error(json.message || 'Failed to update permission status');
  }

  return json.data;
}
```

---

## 10. Recommended FE Flow

### Option A — User Based Screen

```txt
1. FE call GET /user-module-permissions/grouped-by-user?is_active=1
2. Render user list
3. Under each user, render permission modules
4. User edits checkbox can_view/can_create/can_update/can_deactivate
5. FE call PUT /user-module-permissions/:id
6. FE refresh grouped-by-user or update state locally
```

### Option B — Module Based Screen

```txt
1. FE call GET /user-module-permissions/grouped-by-module?is_active=1
2. Render module list
3. Under each module, render users
4. User edits checkbox per user permission row
5. FE call PUT /user-module-permissions/:id
6. FE refresh grouped-by-module or update state locally
```

### Option C — Deactivate Permission

```txt
1. FE renders active/inactive toggle
2. User toggles status
3. FE call PATCH /user-module-permissions/:id/status
4. FE refresh grouped endpoint or update state locally
```

---

## 11. Endpoint Summary

```txt
GET    /api/master/user-module-permissions
GET    /api/master/user-module-permissions/grouped-by-user
GET    /api/master/user-module-permissions/grouped-by-module
GET    /api/master/user-module-permissions/:id
POST   /api/master/user-module-permissions
PUT    /api/master/user-module-permissions/:id
PATCH  /api/master/user-module-permissions/:id/status
```

Important route order in backend:

```txt
/grouped-by-user and /grouped-by-module must be registered before /:id
```

If `/grouped-by-user` is placed after `/:id`, Express will treat it as:

```txt
:id = grouped-by-user
```

and the grouped endpoint will not work.

---

## 12. Postman Examples

### Row Level List

```txt
GET http://localhost:3000/api/master/user-module-permissions?page=1&limit=10
```

### Grouped By User

```txt
GET http://localhost:3000/api/master/user-module-permissions/grouped-by-user?is_active=1
```

### Grouped By Module

```txt
GET http://localhost:3000/api/master/user-module-permissions/grouped-by-module?is_active=1
```

### Update Permission

```txt
PUT http://localhost:3000/api/master/user-module-permissions/1
```

Body:

```json
{
  "user_id": "bd625aff-7fc4-44e9-b95c-549f99f47991",
  "username_snapshot": "azi",
  "name_snapshot": "Azi Fauzi",
  "module_id": 1,
  "can_view": 1,
  "can_create": 1,
  "can_update": 1,
  "can_deactivate": 1
}
```

### Deactivate Permission

```txt
PATCH http://localhost:3000/api/master/user-module-permissions/1/status
```

Body:

```json
{
  "is_active": 0
}
```

### Activate Permission

```txt
PATCH http://localhost:3000/api/master/user-module-permissions/1/status
```

Body:

```json
{
  "is_active": 1
}
```

---

## 13. Final Notes For FE

```txt
1. Use grouped-by-user if UI starts from user selection.
2. Use grouped-by-module if UI starts from module selection.
3. Do not update grouped data as a batch unless backend provides a dedicated batch endpoint later.
4. For now, every permission update should use PUT /:id.
5. For activate/deactivate, use PATCH /:id/status.
6. Always keep permission id from grouped response because it is required for update.
7. If permission does not exist yet for a user-module pair, create it using POST /user-module-permissions.
```
