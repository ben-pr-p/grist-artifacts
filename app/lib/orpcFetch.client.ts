import { createORPCClient } from "@orpc/client";
import type { RouterClient } from "@orpc/server";

import { createORPCReactQueryUtils } from "@orpc/react-query";
import { RPCLink } from "@orpc/client/fetch";
import type { Router } from "@/orpc/router.server";

let accessToken: string | null = null;
const rpcLink = new RPCLink({
  url: `${typeof window !== "undefined" && window.location.origin}/orpc`,
  // fetch: optional override for the default fetch function
  headers: async () => {
    if (!accessToken) {
      const r = await window.grist.docApi.getAccessToken({});
      accessToken = r.token;
    }
    return {
      "X-Grist-Access-Token": accessToken,
    };
  },
});

export const orpcFetch: RouterClient<Router> = createORPCClient(rpcLink);
export const orpcFetchQuery = createORPCReactQueryUtils(orpcFetch);
