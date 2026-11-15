# Production readiness and launch gates

This document distinguishes repository work from external launch requirements. A successful build is not the same as a live Shopify product.

## Verified in the repository

- Shopify embedded-app foundation using React Router and Shopify's official app package.
- Prisma/PostgreSQL data model for stores, catalog, variants, orders, offers, events, experiments, and sync runs.
- Shopify catalog and recent-order synchronization.
- Product-pair metrics and contribution calculations.
- Merchant settings, billing, offers, catalog, analytics, and overview routes.
- pg-boss queue producer and separate worker entry point.
- Shopify app proxy and compliance webhook routes.
- Environment-variable template in `.env.example`.

## Changes in this release branch

- Catalog synchronization now drains nested variant cursor pages beyond Shopify's first 250 variants.
- Order synchronization now drains nested line-item cursor pages beyond the first 250 line items.
- The public website now explains the product's actual workflow and evidence boundaries, rather than implying that engagement metrics prove incremental revenue.
- The marketing system has a responsive ink/navy, warm-paper, and brass visual language.
- This document records the external gates that cannot be completed by changing repository files alone.

## Must be completed before a real merchant launch

### 1. Shopify application configuration

- Create or select the production app in Shopify Dev Dashboard.
- Set the real client ID in `shopify.app.toml`; it is currently blank in the repository.
- Set the production app URL and OAuth redirect URLs.
- Verify requested scopes against each GraphQL field and merchant value proposition.
- Configure the app proxy and compliance webhook subscriptions against the deployed domain.
- Confirm the selected distribution channel and Shopify review requirements.

### 2. Runtime and data infrastructure

- Provision production PostgreSQL with TLS, automated backups, restore testing, and connection limits.
- Configure every variable in `.env.example` in the deployment environment.
- Run Prisma migrations as a controlled release step.
- Deploy the web process and the pg-boss worker as separate services.
- The worker must remain running, reconnect after failures, and be monitored. A Vercel web deployment alone does not run `npm run worker` as a persistent process.
- Add operational alerts for worker downtime, queue age, repeated sync failures, and database connection exhaustion.

### 3. Shopify data correctness

- Test catalog and order sync against development stores with small and large catalogs.
- Verify Shopify API throttling, retry behaviour, cursor continuation, and idempotent reruns.
- Confirm the standard order-history access window and obtain additional approval if a longer history is required.
- Reconcile refunds and line-level refund allocation before treating product-level contribution as fully reconciled.
- Validate multi-currency and zero-decimal currency handling.
- Confirm product and variant deletion/archive behaviour does not leave misleading recommendations.

### 4. Storefront and offers

- Install the theme app extension in a real development store.
- Test the app block in supported cart templates and themes.
- Confirm app-proxy signatures, offer lookup, active/paused behaviour, and product availability.
- Verify that paused or deleted offers cannot continue to render from stale cache.
- Test mobile storefront behaviour, accessibility, and cart submission failure states.

### 5. Billing, privacy, and support

- Test every subscription lifecycle: trial, approval, active, decline, cancellation, upgrade, downgrade, and charge recovery.
- Confirm plan limits are enforced server-side for every route and action.
- Review privacy policy, terms, support contact, data retention, data deletion, and Shopify mandatory compliance requirements.
- Verify uninstall cleanup, token revocation, customer-data request handling, and shop-redaction behaviour.
- Prepare a support and incident-response path.

## Release acceptance

Do not call KERNIQ production-ready until all of the following are true:

- [ ] Typecheck passes.
- [ ] Unit tests pass.
- [ ] Production build succeeds.
- [ ] Database migrations succeed against a clean production-like database.
- [ ] Shopify OAuth and embedded navigation work in a real development store.
- [ ] Catalog and order sync complete without truncating nested connections.
- [ ] Worker restarts and recovers safely after a failed job.
- [ ] App proxy and theme extension work in the storefront.
- [ ] Billing lifecycle passes in Shopify test mode.
- [ ] Privacy and compliance review is complete.
- [ ] Production monitoring and backups are verified.
- [ ] Shopify distribution/review requirements are satisfied.

## Honest launch status

Repository changes can improve code and documentation, but they cannot create Shopify credentials, approve restricted scopes, provision production infrastructure, complete Shopify review, or verify behaviour in a merchant's store. Those are real external acceptance gates, not items to mark complete by assumption.
