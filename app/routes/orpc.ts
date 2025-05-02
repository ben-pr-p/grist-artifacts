import type { Route } from "./+types/orpc";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@/orpc/router.server";

const rpcHandler = new RPCHandler(router);

async function handleRequest(request: Request, context: Env) {
  const { response } = await rpcHandler.handle(request, {
    prefix: "/orpc",
    context,
  });
  return response;
}

export const loader = async ({ request, context }: Route.LoaderArgs) => {
  return await handleRequest(request, context.cloudflare.env);
};

export const action = async ({ request, context }: Route.ActionArgs) => {
  return await handleRequest(request, context.cloudflare.env);
};
