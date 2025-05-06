import { cleanEnv, str, host, port } from "envalid";

// Validate environment variables
const envHolder = typeof Bun !== "undefined" ? Bun.env : process.env;
export const env = cleanEnv(envHolder, {
  ANTHROPIC_API_KEY: str({
    desc: "Anthropic API Key",
  }),
  GRIST_BASE_URL: str({
    desc: "Grist Base URL",
  }),
});
