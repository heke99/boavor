# Authentication and RBAC

Authentication uses Supabase Auth. Global roles remain in `profiles.role`.
Tenant team roles remain in `company_members.team_role`.
`company_role_permissions` adds explicit permissions; owner/admin and Bovaro
admins retain management rights. UI permission hiding is convenience only;
server/RPC and RLS enforcement are mandatory.

