import { createORPCClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";

import { createORPCReactQueryUtils } from "@orpc/react-query";
import { RPCLink } from "@orpc/client/fetch";
import type { Router } from "@/orpc/router.server";

const rpcLink = new RPCLink({
  url: `${typeof window !== "undefined" && window.location.origin}/orpc`,
  // fetch: optional override for the default fetch function
  // headers: provide additional headers
});

export const orpcFetch: RouterClient<Router> = createORPCClient(rpcLink);
export const orpcFetchQuery = createORPCReactQueryUtils(orpcFetch);
