function getYearTwoDigits(date = new Date()) {
  return String(date.getFullYear()).slice(-2);
}

async function generateDocumentNumber(conn, payload = {}) {
  const {
    module,
    departmentId,
    departmentCode,
    date = new Date(),
  } = payload;

  if (!module || !['FRP', 'RP'].includes(module)) {
    throw new Error('Invalid document number module');
  }

  if (!departmentId) {
    throw new Error('Department ID is required for document number');
  }

  if (!departmentCode) {
    throw new Error('Department code is required for document number');
  }

  const periodYear = date.getFullYear();
  const yearTwoDigits = getYearTwoDigits(date);

  const [existingRows] = await conn.query(
    `
      SELECT id, last_number
      FROM document_number_sequences
      WHERE module = ?
        AND department_id = ?
        AND period_year = ?
      FOR UPDATE
    `,
    [module, departmentId, periodYear]
  );

  let nextNumber;

  if (existingRows.length) {
    const current = Number(existingRows[0].last_number || 0);
    nextNumber = current + 1;

    await conn.query(
      `
        UPDATE document_number_sequences
        SET last_number = ?
        WHERE id = ?
      `,
      [nextNumber, existingRows[0].id]
    );
  } else {
    nextNumber = 1;

    await conn.query(
      `
        INSERT INTO document_number_sequences (
          module,
          department_id,
          department_code,
          period_year,
          last_number
        )
        VALUES (?, ?, ?, ?, ?)
      `,
      [module, departmentId, departmentCode, periodYear, nextNumber]
    );
  }

  return `${module}-${departmentCode}-${yearTwoDigits}-${String(nextNumber).padStart(5, '0')}`;
}

module.exports = {
  generateDocumentNumber,
};