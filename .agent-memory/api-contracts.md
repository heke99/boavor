# API contracts

Existing versioned `/api/v1` routes remain authoritative for public API
surfaces. New portal reads use `get_tenant_portal_bundle` and
`get_landlord_lifecycle_bundle`. Mutations use explicit RPC commands with
validated arguments. Outbound integrations consume versioned domain events.

OpenAPI must be extended before exposing the new lifecycle commands to external
clients; internal server actions are already wired to canonical RPCs.

