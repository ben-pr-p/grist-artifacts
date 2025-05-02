import { type InferRouterInputs, type InferRouterOutputs } from "@orpc/server";
import { aiRouter } from "./ai.server";
import { base } from "./base.server";

export const router = base.router({
  ai: aiRouter,
});

export type Router = typeof router;
export type Inputs = InferRouterInputs<Router>;
export type Outputs = InferRouterOutputs<Router>;
