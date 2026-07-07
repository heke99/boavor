import { describe, expect, it } from 'vitest'
import { resolveAuditTarget } from './audit'

describe('resolveAuditTarget', () => {
  it('routes UUID targets to target_id', () => {
    expect(resolveAuditTarget('123e4567-e89b-42d3-a456-426614174000')).toEqual({
      target_id: '123e4567-e89b-42d3-a456-426614174000',
      resource_key: null,
    })
  })

  it('routes text keys to resource_key (admin_audit_logs.target_id is uuid)', () => {
    expect(resolveAuditTarget('maintenance_mode')).toEqual({
      target_id: null,
      resource_key: 'maintenance_mode',
    })
  })

  it('handles missing targets', () => {
    expect(resolveAuditTarget(null)).toEqual({ target_id: null, resource_key: null })
    expect(resolveAuditTarget(undefined)).toEqual({ target_id: null, resource_key: null })
    expect(resolveAuditTarget('')).toEqual({ target_id: null, resource_key: null })
  })
})
