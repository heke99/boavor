# Integrations

- Stripe: Bovaro SaaS subscriptions only
- Rent payments: provider-neutral `rent_payments`/allocations
- E-sign: provider abstraction; development mock is explicitly non-production
- Email/push/webhooks: existing adapters
- Domain delivery: transactional outbox with retry/dead-letter state

Live e-sign and rent-payment transports require provider credentials and
production webhook verification. Their absence must not block local domain work.

