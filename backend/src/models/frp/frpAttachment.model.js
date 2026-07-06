async function insertPendingAttachment(conn, data) {
  await conn.query(
    `
      INSERT INTO frp_request_attachments (
        id,
        frp_request_id,
        document_type_id,
        document_code_snapshot,
        document_name_snapshot,
        original_file_name,
        file_name,
        object_path,
        bucket_name,
        storage_provider,
        mime_type,
        file_size,
        checksum,
        upload_status,
        signed_url_expires_at,
        uploaded_by_user_id,
        uploaded_by_username,
        uploaded_by_name,
        uploaded_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'GCS', ?, ?, NULL, 'PENDING', ?, ?, ?, ?, NULL, NOW(), NOW())
    `,
    [
      data.id,
      data.frp_request_id,
      data.document_type_id,
      data.document_code_snapshot,
      data.document_name_snapshot,
      data.original_file_name,
      data.file_name,
      data.object_path,
      data.bucket_name,
      data.mime_type,
      data.file_size,
      data.signed_url_expires_at,
      data.uploaded_by_user_id,
      data.uploaded_by_username,
      data.uploaded_by_name,
    ]
  );
}

async function countAttachmentsByFrpRequestId(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT COUNT(*) AS total
      FROM frp_request_attachments
      WHERE frp_request_id = ?
    `,
    [frpRequestId]
  );

  return Number(rows[0]?.total || 0);
}

async function getAttachmentById(conn, id, frpRequestId = null) {
  const params = [id];
  let extraWhere = '';

  if (frpRequestId) {
    extraWhere = 'AND frp_request_id = ?';
    params.push(frpRequestId);
  }

  const [rows] = await conn.query(
    `
      SELECT *
      FROM frp_request_attachments
      WHERE id = ?
        ${extraWhere}
      LIMIT 1
    `,
    params
  );

  return rows[0] || null;
}

async function getActiveAttachmentsByDocumentTypeIds(conn, frpRequestId, documentTypeIds = []) {
  if (!Array.isArray(documentTypeIds) || documentTypeIds.length === 0) {
    return [];
  }

  const safeIds = [...new Set(documentTypeIds.map(Number).filter(Boolean))];

  if (!safeIds.length) {
    return [];
  }

  const placeholders = safeIds.map(() => '?').join(', ');

  const [rows] = await conn.query(
    `
      SELECT *
      FROM frp_request_attachments
      WHERE frp_request_id = ?
        AND document_type_id IN (${placeholders})
        AND upload_status <> 'CANCELED'
      ORDER BY created_at ASC
    `,
    [frpRequestId, ...safeIds]
  );

  return rows;
}

async function markAttachmentUploaded(conn, id, payload = {}) {
  await conn.query(
    `
      UPDATE frp_request_attachments
      SET
        upload_status = 'UPLOADED',
        checksum = ?,
        uploaded_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
        AND upload_status = 'PENDING'
    `,
    [
      payload.checksum || null,
      id,
    ]
  );
}

async function cancelAttachment(conn, id, user = {}) {
  await conn.query(
    `
      UPDATE frp_request_attachments
      SET
        upload_status = 'CANCELED',
        canceled_by_user_id = ?,
        canceled_by_name = ?,
        canceled_at = NOW(),
        updated_at = NOW()
      WHERE id = ?
        AND upload_status <> 'CANCELED'
    `,
    [
      user.id,
      user.name,
      id,
    ]
  );
}

async function getMissingRequiredAttachments(conn, frpRequestId) {
  const [rows] = await conn.query(
    `
      SELECT
        frd.document_type_id,
        frd.document_code_snapshot,
        frd.document_name_snapshot
      FROM frp_request_documents frd
      WHERE frd.frp_request_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM frp_request_attachments fra
          WHERE fra.frp_request_id = frd.frp_request_id
            AND fra.document_type_id = frd.document_type_id
            AND fra.upload_status = 'UPLOADED'
        )
      ORDER BY frd.id ASC
    `,
    [frpRequestId]
  );

  return rows;
}

module.exports = {
  insertPendingAttachment,
  countAttachmentsByFrpRequestId,
  getAttachmentById,
  getActiveAttachmentsByDocumentTypeIds,
  markAttachmentUploaded,
  cancelAttachment,
  getMissingRequiredAttachments,
};