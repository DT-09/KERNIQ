import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import stylesheet from "./styles/global.css?url";

export const links = () => [{ rel: "stylesheet", href: stylesheet }];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <meta name="theme-color" content="#151719" />
        <Meta />
        <Links />
      </head>
      <body>{children}<ScrollRestoration /><Scripts /></body>
    </html>
  );
}

export default function App() { return <Outlet />; }
