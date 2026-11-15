# KERNIQ

**Profit-aware commerce decisions for Shopify merchants.**

KERNIQ connects a merchant's Shopify catalog and available order history to product-pair analysis, contribution-cost visibility, and merchant-controlled cart recommendations.

It is built around a strict evidence rule: observed behaviour, configured assumptions, and measured engagement are different things. The application must not present one as another.

## Product capabilities

- Shopify OAuth and embedded merchant application.
- Product, variant, inventory, and available unit-cost synchronization.
- Recent order and line-item synchronization with cursor pagination.
- Product-pair analysis using support, confidence, and lift.
- Variant-level contribution calculations using integer minor currency units.
- Merchant-configured payment fee, fulfillment, shipping subsidy, and minimum contribution assumptions.
- Cart recommendation drafts with explicit activate/pause controls.
- Shopify app-proxy endpoints and theme app extension assets where configured in the repository.
- Shopify-managed recurring subscriptions: Launch ($29), Growth ($79), and Scale ($149).
- PostgreSQL persistence through Prisma and durable synchronization jobs through pg-boss.

## Evidence boundaries

KERNIQ intentionally avoids unsupported claims:

- Product affinity is observational association, not causal proof.
- Offer impressions and add-to-cart submissions are engagement events, not completed sales.
- Attributed revenue is not incremental revenue.
- Contribution profit is unavailable when required cost inputs are missing.
- Shopify's standard order access window applies unless the merchant's app has additional order-history access approved.
- Storefront placement requires merchant configuration and an explicit save in the Shopify theme editor.

## Stack

- Node.js 22.12+
- TypeScript, React 18, React Router 7
- Shopify App React Router package
- Prisma 6 and PostgreSQL
- pg-boss for durable background jobs
- Node test runner through tsx

## Local development

1. Install Node.js 22.12 or later.
2. Copy `.env.example` to `.env` and populate Shopify credentials and a PostgreSQL connection.
3. Install dependencies: `npm install`.
4. Generate Prisma client: `npm run db:generate`.
5. Apply migrations: `npm run db:migrate`.
6. Start the Shopify development flow: `npm run dev`.

Useful commands:

```bash
npm run typecheck
npm test
npm run build
npm run worker
```

The web application and the pg-boss worker are separate runtime processes. Run the worker with the same production database and required Shopify environment as the web application.

## Production topology

A Vercel deployment can host the React Router web application. It does not provide a permanently running Node worker process for pg-boss. Deploy `npm run worker` as a separate persistent service, with the same `DATABASE_URL`, Shopify credentials, and environment configuration. Do not assume a successful Vercel web deployment also starts the worker.

Required production configuration:

- Shopify Dev Dashboard app credentials and an approved app URL.
- Matching `SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, and scopes.
- Production PostgreSQL with TLS, backups, and migration execution.
- A persistent worker process and restart policy.
- Shopify webhook and app-proxy URLs matching the deployed host.
- Billing configured in the Shopify app and tested with Shopify's test mode before live billing.
- Theme extension packaging and validation in a real development store.
- Privacy/compliance review and Shopify app review before public App Store distribution.

See [Production readiness](docs/production-readiness.md) before launch.

## Security and operational notes

- Keep secrets in deployment environment variables; never commit `.env`.
- Use TLS for PostgreSQL in production.
- Keep the worker concurrency conservative until queue throughput and Shopify API throttling are observed.
- Review sync failures in the merchant app; do not treat partial data as complete.
- Verify webhook HMAC handling and store-scoped authorization before each production release.
- Do not use synthetic data as merchant proof or public performance claims.

## License

No license is currently declared. Do not assume this repository is open for third-party reuse until a license is added.
