import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/app.tsx"),
  route("/editor", "routes/editor.tsx"),
  route("/orpc/*", "routes/orpc.ts"),
] satisfies RouteConfig;
