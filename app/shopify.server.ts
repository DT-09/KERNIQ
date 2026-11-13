import "@shopify/shopify-app-react-router/adapters/node";
import { ApiVersion, AppDistribution, BillingInterval, shopifyApp } from "@shopify/shopify-app-react-router/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

export const LAUNCH_PLAN = "Launch";
export const GROWTH_PLAN = "Growth";
export const SCALE_PLAN = "Scale";
const billingTestMode = process.env.SHOPIFY_BILLING_TEST_MODE === "true";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET ?? "",
  appUrl: process.env.SHOPIFY_APP_URL ?? "",
  apiVersion: ApiVersion.October26,
  scopes: process.env.SCOPES?.split(",").map((scope) => scope.trim()),
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  billing: {
    [LAUNCH_PLAN]: { lineItems: [{ amount: 29, currencyCode: "USD", interval: BillingInterval.Every30Days }] },
    [GROWTH_PLAN]: { lineItems: [{ amount: 79, currencyCode: "USD", interval: BillingInterval.Every30Days }] },
    [SCALE_PLAN]: { lineItems: [{ amount: 149, currencyCode: "USD", interval: BillingInterval.Every30Days }] },
  },
  future: { expiringOfflineAccessTokens: true },
});

export default shopify;
export const apiVersion = ApiVersion.October26;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const sessionStorage = shopify.sessionStorage;
export const isBillingTestMode = billingTestMode;
