const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Splits an audit target into the uuid column and the text key column.
 * admin_audit_logs.target_id is a uuid; passing text keys (e.g. platform
 * setting names) used to make the insert fail silently.
 */
export function resolveAuditTarget(targetId: string | null | undefined): {
  target_id: string | null
  resource_key: string | null
} {
  if (!targetId) return { target_id: null, resource_key: null }
  if (UUID_PATTERN.test(targetId)) return { target_id: targetId, resource_key: null }
  return { target_id: null, resource_key: targetId }
}
