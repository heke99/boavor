# Domain model

Tenant-owned aggregate roots carry `company_id`. `created_by` represents the
actor, never tenant ownership. Signed contract bytes are represented by an
immutable document version and SHA-256 hash. A tenancy can only be provisioned
from a signed contract whose version and hash match.

Rent invoices and allocations use integer öre. Outstanding balance is derived
from total minus allocated payment, not maintained by browser arithmetic.

