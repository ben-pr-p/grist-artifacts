import { cleanEnv, str, host, port, bool } from "envalid";

// Validate environment variables
console.log(process.env);
console.log(process.env.OPENROUTER_API_KEY);
export const env = cleanEnv(process.env, {
  OPENROUTER_API_KEY: str({
    desc: "OpenRouter API Key",
  }),
  ANTHROPIC_API_KEY: str({
    desc: "Anthropic API Key",
  }),
  GRIST_BASE_URL: str({
    desc: "Grist Base URL",
  }),
  DISABLE_AUTH_CHECK: bool({
    desc: "Disable authentication check",
    default: false,
  }),
});
