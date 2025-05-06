import { os, ORPCError } from "@orpc/server";
import { env } from "@/env.server";

type Context = {
  accessToken: string | null;
};

async function fetchGristOrgs(accessToken: string) {
  const requestUrl = `${env.GRIST_BASE_URL}/api/orgs?auth=${accessToken}`;

  const response = await fetch(requestUrl, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return true;
}

export const authMiddleware = os
  .$context<Context>()
  .middleware(async ({ next, context }) => {
    const { accessToken } = context;

    if (!accessToken) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const allowed = await fetchGristOrgs(accessToken);
    if (!allowed) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const response = await next();
    return response;
  });

const loggingMiddleware = os
  .$context<Context>()
  .middleware(async ({ next, context }) => {
    try {
      const response = await next({ context });
      return response;
    } catch (error) {
      console.error(error);
      throw error;
    }
  });

export const base = os
  .$context<Context>()
  .use(authMiddleware)
  .use(loggingMiddleware);
