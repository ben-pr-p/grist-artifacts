import type { Route } from "./+types/orpc";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/orpc/router.server";

const rpcHandler = new RPCHandler(router);

async function handleRequest(request: Request) {
  const accessToken = request.headers.get("X-Grist-Access-Token");
  const { response } = await rpcHandler.handle(request, {
    prefix: "/orpc",
    context: {
      accessToken,
    },
  });
  return response;
}

export const loader = async ({ request }: Route.LoaderArgs) => {
  return await handleRequest(request);
};

export const action = async ({ request }: Route.ActionArgs) => {
  return await handleRequest(request);
};
