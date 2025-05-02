import { os } from "@orpc/server";

type Context = {
  ANTHROPIC_API_KEY: string;
};

export const base = os.$context<Context>();
