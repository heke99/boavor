# Bovaro Public API (v1)

Read-only API for landlords who want to integrate Bovaro with their own
systems, plus signed outbound webhooks.

## Authentication

Create an API key under **Hyresvärd → Inställningar → API och webhooks**.
The secret (`bov_live_…`) is shown once; only its SHA-256 hash is stored.

```
Authorization: Bearer bov_live_<40 hex chars>
```

- Keys are scoped (see below) and can be revoked at any time.
- Rate limit: **300 requests/hour per key**. Exceeding it returns `429`.
- All requests are logged (`api_request_logs`) and visible to the key owner.

## Scopes

| Scope | Grants |
| --- | --- |
| `listings:read` | `GET /api/v1/listings` |
| `applications:read` | `GET /api/v1/applications` |

## Endpoints

### `GET /api/v1/ping`

Validates the key. Response: `{ "ok": true, "scopes": ["listings:read"] }`

### `GET /api/v1/listings`

The key owner's listings (company keys: the company's listings; private
keys: listings created by the user).

Query parameters:

| Param | Description |
| --- | --- |
| `status` | `draft`, `published`, `paused`, `rented`, `sold`, `archived` |
| `limit` | 1–100 (default 50) |

```json
{
  "data": [
    {
      "id": "…", "slug": "…", "title": "…", "status": "published",
      "listing_type": "rent", "city": "Stockholm", "price": 12000,
      "rooms": 2, "area_sqm": 55, "published_at": "…", "created_at": "…"
    }
  ]
}
```

### `GET /api/v1/applications`

Incoming rental applications for the key owner. Returns the same workflow
fields the landlord sees in the UI. Documents, profile snapshots and other
sensitive material are **not** exposed via the API.

Query parameters: `status`, `limit` (as above).

## Errors

All errors share one shape:

```json
{ "error": { "code": "missing_scope", "message": "Nyckeln saknar behörigheten \"listings:read\"." } }
```

| HTTP | Code | Meaning |
| --- | --- | --- |
| 401 | `missing_key` / `invalid_key` | No or unknown/revoked key. |
| 403 | `missing_scope` | Key lacks the required scope. |
| 429 | `rate_limited` | Over 300 requests/hour. |
| 503 | `not_configured` | Environment lacks server credentials. |

## Webhooks

Configure endpoints (HTTPS only) under the same settings page. Available
events:

| Event | Fired when |
| --- | --- |
| `application.created` | A new rental application is submitted for one of your listings. |

### Delivery format

```
POST <your url>
Content-Type: application/json
Bovaro-Event: application.created
Bovaro-Signature: t=1700000000,v1=<hex hmac>
```

```json
{
  "id": "<delivery id>",
  "type": "application.created",
  "created_at": "2026-07-06T12:00:00.000Z",
  "data": {
    "application_id": "…",
    "listing_id": "…",
    "listing_slug": "…",
    "listing_title": "…",
    "status": "submitted",
    "created_at": "…"
  }
}
```

### Verifying signatures

Compute `HMAC_SHA256(secret, "<t>.<raw body>")` and compare with `v1`
(constant-time). Reject if `t` is older than ~5 minutes to prevent replays.

```ts
import { createHmac, timingSafeEqual } from 'crypto'

function verify(header: string, body: string, secret: string): boolean {
  const match = header.match(/^t=(\d+),v1=([a-f0-9]{64})$/)
  if (!match) return false
  const [, timestamp, signature] = match
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
  return timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'))
}
```

### Retries

Respond with any `2xx` within 10 seconds. Failures are retried with backoff
(1 min, 5 min, 30 min, 2 h, 12 h) and dead-lettered after five attempts.
Delivery history is visible on the settings page.
