import { cleanEnv, str, host, port, bool } from "envalid";

// Validate environment variables
const envHolder = typeof Bun !== "undefined" ? Bun.env : process.env;
export const env = cleanEnv(envHolder, {
  ANTHROPIC_API_KEY: str({
    desc: "Anthropic API Key",
  }),
  OPENROUTER_API_KEY: str({
    desc: "OpenRouter API Key",
  }),
  GRIST_BASE_URL: str({
    desc: "Grist Base URL",
  }),
  DISABLE_AUTH_CHECK: bool({
    desc: "Disable authentication check",
    default: false,
  }),
});
