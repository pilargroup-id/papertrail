async function resolveVendorSnapshot(conn, vendorId) {
  const [rows] = await conn.query(
    `
      SELECT id, name
      FROM master_vendors
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [vendorId]
  );

  if (!rows.length) {
    throw new Error('Vendor not found or inactive');
  }

  return {
    vendor_id: rows[0].id,
    vendor_name_snapshot: rows[0].name,
  };
}

async function resolveVendorBankAccountSnapshot(conn, vendorId, vendorBankAccountId) {
  if (!vendorBankAccountId) {
    return {
      vendor_bank_account_id: null,
      vendor_bank_code_snapshot: null,
      vendor_bank_name_snapshot: null,
      vendor_account_number_snapshot: null,
      vendor_account_name_snapshot: null,
    };
  }

  const [rows] = await conn.query(
    `
      SELECT
        vba.id,
        vba.vendor_id,
        vba.account_number,
        vba.account_name,
        b.code AS bank_code,
        b.name AS bank_name
      FROM master_vendor_bank_accounts vba
      INNER JOIN master_banks b
        ON b.id = vba.bank_id
      WHERE vba.id = ?
        AND vba.vendor_id = ?
        AND vba.is_active = 1
        AND b.is_active = 1
      LIMIT 1
    `,
    [vendorBankAccountId, vendorId]
  );

  if (!rows.length) {
    throw new Error('Vendor bank account not found, inactive, or does not belong to vendor');
  }

  const row = rows[0];

  return {
    vendor_bank_account_id: row.id,
    vendor_bank_code_snapshot: row.bank_code,
    vendor_bank_name_snapshot: row.bank_name,
    vendor_account_number_snapshot: row.account_number,
    vendor_account_name_snapshot: row.account_name,
  };
}

async function resolveExternalDocumentTypeSnapshot(conn, externalDocumentTypeId) {
  if (!externalDocumentTypeId) {
    return {
      external_document_type_id: null,
      external_document_type_code_snapshot: null,
      external_document_type_name_snapshot: null,
    };
  }

  const [rows] = await conn.query(
    `
      SELECT id, code, name
      FROM master_external_document_types
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [externalDocumentTypeId]
  );

  if (!rows.length) {
    throw new Error('External document type not found or inactive');
  }

  return {
    external_document_type_id: rows[0].id,
    external_document_type_code_snapshot: rows[0].code,
    external_document_type_name_snapshot: rows[0].name,
  };
}

async function resolvePaymentMethodSnapshot(conn, paymentMethodId) {
  const [rows] = await conn.query(
    `
      SELECT id, code, name
      FROM master_payment_methods
      WHERE id = ?
        AND is_active = 1
      LIMIT 1
    `,
    [paymentMethodId]
  );

  if (!rows.length) {
    throw new Error('Payment method not found or inactive');
  }

  return {
    payment_method_id: rows[0].id,
    payment_method_code_snapshot: rows[0].code,
    payment_method_name_snapshot: rows[0].name,
  };
}

async function resolveFrpDocumentTypeSnapshots(conn, documentTypeIds = []) {
  if (!Array.isArray(documentTypeIds) || !documentTypeIds.length) {
    return [];
  }

  const uniqueIds = [...new Set(documentTypeIds.map(Number).filter(Boolean))];

  if (!uniqueIds.length) {
    return [];
  }

  const placeholders = uniqueIds.map(() => '?').join(',');

  const [rows] = await conn.query(
    `
      SELECT id, code, name
      FROM master_frp_document_types
      WHERE id IN (${placeholders})
        AND is_active = 1
      ORDER BY sort_order ASC, id ASC
    `,
    uniqueIds
  );

  if (rows.length !== uniqueIds.length) {
    throw new Error('One or more FRP document types are invalid or inactive');
  }

  return rows.map((row) => ({
    document_type_id: row.id,
    document_code_snapshot: row.code,
    document_name_snapshot: row.name,
  }));
}

function buildUserSnapshot(user) {
  return {
    requested_by_user_id: user.id,
    requested_by_username: user.username || null,
    requested_by_name: user.name,
    requested_by_job_position: user.job_position || null,
    requested_by_job_level_name: user.job_level || null,
    requested_by_job_level_value: user.job_level_value ?? null,

    created_by_user_id: user.id,
    created_by_name: user.name,
    updated_by_user_id: user.id,
    updated_by_name: user.name,
  };
}

function buildCompanyDepartmentSnapshot(user, body) {
  const departmentId = body.department_id || user.department_id;
  const classDepartmentId = body.class_department_id || body.department_id || user.department_id;

  return {
    company_id: body.company_id || user.company_id,
    company_code_snapshot: body.company_code || user.company_code,
    company_name_snapshot: body.company_name || user.company,

    department_id: departmentId,
    department_name_snapshot: body.department_name || user.department,
    department_class_snapshot: body.department_class || user.department_class,
    department_code_snapshot: body.department_code || user.department_code,

    class_department_id: classDepartmentId,
    class_name_snapshot: body.class_name || body.department_name || user.department,
    class_class_snapshot: body.class_class || body.department_class || user.department_class,
    class_code_snapshot: body.class_code || body.department_code || user.department_code,
  };
}

module.exports = {
  resolveVendorSnapshot,
  resolveVendorBankAccountSnapshot,
  resolveExternalDocumentTypeSnapshot,
  resolvePaymentMethodSnapshot,
  resolveFrpDocumentTypeSnapshots,
  buildUserSnapshot,
  buildCompanyDepartmentSnapshot,
};