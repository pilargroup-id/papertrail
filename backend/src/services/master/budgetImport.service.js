// Aturan khusus import sheet "Budgets" pada Data Exchange.
// Menyamakan hasil import dengan form Create Budget: snapshot company/department/class
// diisi otomatis dari direktori PilarGroup, dan setiap baris divalidasi per kolom.
const { fetchDirectoryResource } = require('../directory.service');

// Kolom yang diisi user di template import. id, snapshot, dan saldo diisi sistem.
const TEMPLATE_FIELDS = [
  'budget_code',
  'company_id',
  'department_id',
  'class_department_id',
  'budget_type_id',
  'project_name',
  'budget_amount',
  'period_year',
  'period_month',
  'is_active',
];

const FIELD_GUIDE = [
  ['budget_code', 'Ya', 'Kode unik budget, maks. 50 karakter.', 'MKT-2026-01'],
  ['company_id', 'Ya', 'ID company, lihat sheet Referensi.', '1'],
  ['department_id', 'Ya', 'ID department, lihat sheet Referensi.', '5'],
  ['class_department_id', 'Ya', 'ID class department, lihat sheet Referensi.', '5'],
  ['budget_type_id', 'Ya', 'ID budget type yang aktif, lihat sheet Referensi.', '1'],
  ['project_name', 'Ya', 'Nama project/budget, maks. 255 karakter.', 'Campaign Q1'],
  ['budget_amount', 'Ya', 'Nominal budget, angka tanpa titik ribuan, tidak negatif.', '150000000'],
  ['period_year', 'Ya', 'Tahun periode, 2000-2100.', '2026'],
  ['period_month', 'Ya', 'Bulan periode, 1-12.', '1'],
  ['is_active', 'Tidak', '1 = aktif, 0 = nonaktif. Kosong = 1.', '1'],
];

function pick(source, keys, fallback = null) {
  const key = keys.find((k) => source?.[k] !== undefined && source?.[k] !== null && source?.[k] !== '');
  return key ? source[key] : fallback;
}

function rowsOf(response) {
  const body = response?.data;
  for (const candidate of [body, body?.data, body?.data?.data, body?.rows, body?.data?.rows]) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function text(value, max) {
  const result = value === undefined || value === null ? null : String(value).trim();
  return result ? result.slice(0, max) : null;
}

// Pemetaan mengikuti DialogCreateBudgets di frontend agar snapshot identik.
function mapCompany(row) {
  const id = pick(row, ['id', 'company_id', 'business_unit_id', 'uuid']);
  const code = pick(row, ['code', 'company_code', 'business_unit_code']);
  const name = pick(row, ['name', 'company_name', 'business_unit_name'], `Company #${id ?? '-'}`);
  return { id, code, name };
}

function mapDepartment(row) {
  const id = pick(row, ['id', 'department_id', 'uuid']);
  const code = pick(row, ['code', 'department_code']);
  const name = pick(row, ['name', 'department_name', 'label'], `Department #${id ?? '-'}`);
  const className = pick(row, ['class_name', 'department_class', 'class', 'department_class_snapshot'], name);
  const classLabel = pick(row, ['class', 'department_class', 'class_name', 'name', 'department_name'], `Class #${id ?? '-'}`);
  return { id, code, name, className, classLabel };
}

function indexById(items) {
  const map = new Map();
  for (const item of items) if (item.id !== null && item.id !== undefined) map.set(String(item.id), item);
  return map;
}

async function loadReferences(req, conn) {
  let companies;
  let departments;
  try {
    const [companyResponse, departmentResponse] = await Promise.all([
      fetchDirectoryResource('companies', { token: req.token }),
      fetchDirectoryResource('departments', { token: req.token }),
    ]);
    companies = rowsOf(companyResponse).map(mapCompany);
    departments = rowsOf(departmentResponse).map(mapDepartment);
  } catch (error) {
    const e = new Error(`Gagal memuat data company/department dari direktori: ${error.message}`);
    e.statusCode = 502;
    throw e;
  }

  const [budgetTypes] = await conn.query('SELECT id, code, name, is_active FROM master_budget_types ORDER BY code');

  return {
    companies,
    departments,
    budgetTypes,
    companyById: indexById(companies),
    departmentById: indexById(departments),
    budgetTypeById: indexById(budgetTypes),
  };
}

function toInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) ? number : null;
}

/**
 * Validasi dan lengkapi satu baris Budgets. Mengubah `data` di tempat
 * (normalisasi + snapshot) dan mengembalikan daftar pesan error.
 */
function prepareRow(data, refs, seenCodes, prefix, rowNumber) {
  const errors = [];
  const push = (message) => errors.push(`${prefix}: ${message}`);

  if (data.id !== undefined && data.id !== null && data.id !== '') {
    push('kolom id harus dikosongkan; id dibuat otomatis.');
  }
  delete data.id;

  const budgetCode = text(data.budget_code, 1000);
  if (!budgetCode) push('budget_code wajib diisi.');
  else if (budgetCode.length > 50) push('budget_code maksimal 50 karakter.');
  else {
    const key = budgetCode.toUpperCase();
    if (seenCodes.has(key)) push(`budget_code ${budgetCode} duplikat dengan baris ${seenCodes.get(key)}.`);
    else seenCodes.set(key, rowNumber);
    data.budget_code = budgetCode;
  }

  const company = data.company_id === undefined ? null : refs.companyById.get(String(data.company_id).trim());
  if (data.company_id === undefined) push('company_id wajib diisi.');
  else if (!company) push(`company_id ${data.company_id} tidak ditemukan.`);
  else {
    data.company_id = String(company.id);
    data.company_code_snapshot = text(company.code, 10);
    data.company_name_snapshot = text(company.name, 150);
  }

  const department = data.department_id === undefined ? null : refs.departmentById.get(String(data.department_id).trim());
  if (data.department_id === undefined) push('department_id wajib diisi.');
  else if (!department) push(`department_id ${data.department_id} tidak ditemukan.`);
  else {
    data.department_id = toInteger(department.id) ?? department.id;
    data.department_name_snapshot = text(department.name, 100);
    data.department_class_snapshot = text(department.className, 100);
    data.department_code_snapshot = text(department.code, 10);
  }

  const classDepartment = data.class_department_id === undefined ? null : refs.departmentById.get(String(data.class_department_id).trim());
  if (data.class_department_id === undefined) push('class_department_id wajib diisi.');
  else if (!classDepartment) push(`class_department_id ${data.class_department_id} tidak ditemukan.`);
  else {
    data.class_department_id = toInteger(classDepartment.id) ?? classDepartment.id;
    data.class_name_snapshot = text(classDepartment.classLabel, 100);
    data.class_class_snapshot = text(classDepartment.classLabel, 100);
    data.class_code_snapshot = text(classDepartment.code, 10);
  }

  const budgetType = data.budget_type_id === undefined ? null : refs.budgetTypeById.get(String(data.budget_type_id).trim());
  if (data.budget_type_id === undefined) push('budget_type_id wajib diisi.');
  else if (!budgetType) push(`budget_type_id ${data.budget_type_id} tidak ditemukan.`);
  else if (Number(budgetType.is_active) !== 1) push(`budget type ${budgetType.code || budgetType.id} tidak aktif.`);
  else data.budget_type_id = Number(budgetType.id);

  const projectName = text(data.project_name, 1000);
  if (!projectName) push('project_name wajib diisi.');
  else if (projectName.length > 255) push('project_name maksimal 255 karakter.');
  else data.project_name = projectName;

  const periodYear = toInteger(data.period_year);
  if (data.period_year === undefined) push('period_year wajib diisi.');
  else if (periodYear === null || periodYear < 2000 || periodYear > 2100) push('period_year harus antara 2000 dan 2100.');
  else data.period_year = periodYear;

  const periodMonth = toInteger(data.period_month);
  if (data.period_month === undefined) push('period_month wajib diisi.');
  else if (periodMonth === null || periodMonth < 1 || periodMonth > 12) push('period_month harus antara 1 dan 12.');
  else data.period_month = periodMonth;

  if (data.is_active === undefined) data.is_active = 1;
  else if (![0, 1].includes(Number(data.is_active))) push('is_active harus 0 atau 1.');
  else data.is_active = Number(data.is_active);

  return errors;
}

function styleHeader(sheet) {
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addGuideSheets(wb, refs) {
  const guide = wb.addWorksheet('Petunjuk');
  guide.columns = [
    { header: 'Kolom', width: 22 },
    { header: 'Wajib', width: 8 },
    { header: 'Keterangan', width: 60 },
    { header: 'Contoh', width: 18 },
  ];
  FIELD_GUIDE.forEach((row) => guide.addRow(row));
  styleHeader(guide);
  guide.addRow([]);
  [
    'Isi data mulai baris ke-2 pada sheet Budgets. Jangan ubah nama kolom di baris pertama.',
    'Nama company, department, dan class diisi otomatis dari ID.',
    'Saldo reserved/used dibuat 0 dan remaining = budget_amount.',
    'Budget yang sudah ada tidak bisa diubah lewat import; gunakan Transfer atau Adjustment.',
    'Sheet Petunjuk dan Referensi diabaikan saat import.',
  ].forEach((note) => guide.addRow([note]).font = { italic: true });

  const reference = wb.addWorksheet('Referensi');
  reference.columns = [
    { header: 'company_id', width: 14 },
    { header: 'Company', width: 36 },
    { header: '', width: 4 },
    { header: 'department_id', width: 16 },
    { header: 'Department', width: 36 },
    { header: '', width: 4 },
    { header: 'budget_type_id', width: 16 },
    { header: 'Budget Type', width: 36 },
  ];
  styleHeader(reference);
  const label = (...parts) => parts.filter(Boolean).join(' - ');
  const activeTypes = refs.budgetTypes.filter((type) => Number(type.is_active) === 1);
  const length = Math.max(refs.companies.length, refs.departments.length, activeTypes.length);
  for (let i = 0; i < length; i += 1) {
    const company = refs.companies[i];
    const department = refs.departments[i];
    const type = activeTypes[i];
    reference.addRow([
      company?.id ?? null, company ? label(company.code, company.name) : null, null,
      department?.id ?? null, department ? label(department.code, department.name) : null, null,
      type?.id ?? null, type ? label(type.code, type.name) : null,
    ]);
  }
}

module.exports = { TEMPLATE_FIELDS, loadReferences, prepareRow, addGuideSheets };
