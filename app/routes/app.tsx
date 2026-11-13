import { AppProvider } from "@shopify/shopify-app-react-router/react";
import { NavMenu } from "@shopify/app-bridge-react";
import { Link, Outlet, redirect, useLoaderData, useRouteError } from "react-router";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { authenticate, GROWTH_PLAN, LAUNCH_PLAN, SCALE_PLAN, isBillingTestMode } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);
  const url = new URL(request.url);
  if (url.pathname !== "/app/billing") {
    const status = await billing.check({
      plans: [LAUNCH_PLAN, GROWTH_PLAN, SCALE_PLAN],
      isTest: isBillingTestMode,
    });
    if (!status.hasActivePayment) throw redirect("/app/billing");
  }
  return { apiKey: process.env.SHOPIFY_API_KEY ?? "" };
};

export default function EmbeddedApp() {
  const { apiKey } = useLoaderData<typeof loader>();
  return (
    <AppProvider embedded apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">Overview</Link>
        <Link to="/app/catalog">Catalog</Link>
        <Link to="/app/offers">Offers</Link>
        <Link to="/app/analytics">Analytics</Link>
        <Link to="/app/settings">Settings</Link>
        <Link to="/app/billing">Billing</Link>
      </NavMenu>
      <Outlet />
    </AppProvider>
  );
}

export function ErrorBoundary() { return boundary.error(useRouteError()); }
export const headers: HeadersFunction = (args) => boundary.headers(args);
