import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useMatches,
} from "react-router";
import {
  HydrationBoundary,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { GristAPILayer } from "./components/GristAPILayer";
import merge from "deepmerge";
import { FullPageSpinner } from "./components/FullPageSpinner";
import RequireScript from "./components/RequireScript";
import { Toaster } from "./components/ui/toaster";

import type { Route } from "./+types/root";
import "./app.css";
import { useState } from "react";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <script
          src="https://docs.getgrist.com/grist-plugin-api.js"
          rel="preload"
        />
        <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
        <Meta />
        <Links />
      </head>
      <body>
        <RequireScript
          src="https://docs.getgrist.com/grist-plugin-api.js"
          fallback={<FullPageSpinner description="Loading Grist API..." />}
          checkLoaded={() => {
            return window.grist !== undefined;
          }}
        >
          <GristAPILayer
            fallback={
              <FullPageSpinner description="Configuring Grist API..." />
            }
          >
            {children}
          </GristAPILayer>
        </RequireScript>
        <Toaster />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // With SSR, we usually want to set some default staleTime
            // above 0 to avoid refetching immediately on the client
            staleTime: 60 * 1000,
          },
        },
      })
  );

  const routeMatches = useMatches();
  const dehydratedStateComponents = routeMatches
    .map((match) => (match.data as any)?.__dehydratedState)
    .filter(Boolean);

  const dehydratedState = dehydratedStateComponents.length
    ? dehydratedStateComponents.reduce((acc, curr) => {
        return merge(acc, curr);
      }, {})
    : undefined;

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Outlet />
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
