# Tenancy and RLS

`companies` is ratified as canonical tenant. All newly introduced tenant data
has `company_id`, foreign keys, indexes and RLS. Applicant/tenant access is
granted through object relationships, not company membership. Service-role
usage is restricted to trusted cron/webhook code.

Cross-company SQL verification remains mandatory against a real migrated
PostgreSQL database before production deployment.

