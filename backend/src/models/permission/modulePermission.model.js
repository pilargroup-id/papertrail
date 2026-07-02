const { db } = require('../../config/database.config');

async function findUserModulePermission(userId, moduleCode, connection = db) {
  const [rows] = await connection.query(
    `SELECT
       ump.id,
       ump.user_id,
       ump.username_snapshot,
       ump.name_snapshot,
       ump.module_id,
       mpm.module_code,
       mpm.module_name,
       mpm.module_group,
       ump.can_view,
       ump.can_create,
       ump.can_update,
       ump.can_deactivate,
       ump.is_active,
       ump.created_at,
       ump.updated_at
     FROM user_module_permissions ump
     INNER JOIN master_permission_modules mpm ON mpm.id = ump.module_id
     WHERE ump.user_id = ?
       AND mpm.module_code = ?
       AND ump.is_active = 1
       AND mpm.is_active = 1
     LIMIT 1`,
    [userId, moduleCode]
  );

  return rows[0] || null;
}

module.exports = {
  findUserModulePermission,
};