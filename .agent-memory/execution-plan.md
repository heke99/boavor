# Execution plan

| ID | Phase | Priority | Status | Acceptance / verification |
|---|---:|---:|---|---|
| BOV-00 | 00 | P0 | VERIFIED | Repository and schema inventoried |
| BOV-01 | 01 | P0 | IN_PROGRESS | Outbox/numbering implemented; DB execution pending |
| BOV-02 | 02 | P0 | IN_PROGRESS | Permissions/RLS implemented; real cross-company run pending |
| BOV-03 | 03 | P1 | VERIFIED | Existing property/building/unit model retained |
| BOV-04 | 04 | P1 | VERIFIED | Existing marketplace/portal/search retained |
| BOV-05 | 05 | P1 | VERIFIED | Existing applicant profile/identity/docs retained |
| BOV-06 | 06 | P0 | IN_PROGRESS | Completion entity added; E2E pending |
| BOV-07 | 07 | P1 | VERIFIED | Existing viewing/offer RPC flow retained |
| BOV-08 | 08 | P0 | IN_PROGRESS | PDF/hash/document/signing model added; provider live test blocked |
| BOV-09 | 09 | P0 | IN_PROGRESS | Tenancy/move-in/portal added; DB/E2E pending |
| BOV-10 | 10 | P0 | IN_PROGRESS | Rent ledger/RPC added; provider live test blocked |
| BOV-11 | 11 | P0 | IN_PROGRESS | Maintenance/work orders/portal flow added; E2E pending |
| BOV-12 | 12 | P0 | IN_PROGRESS | Termination/move-out model added; E2E pending |
| BOV-13 | 13 | P1 | VERIFIED | Existing admin/SaaS foundation retained |
| BOV-14 | 14 | P1 | IN_PROGRESS | Outbox dispatcher added; external OpenAPI expansion pending |
| BOV-15 | 15 | P0 | IN_PROGRESS | Full validation running |

Only `VERIFIED` counts as complete. Each IN_PROGRESS item names its remaining
verification in the right column.

