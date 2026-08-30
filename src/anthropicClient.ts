import Anthropic from '@anthropic-ai/sdk';

/**
 * Local-testing only: this puts the API key in the browser bundle, which is
 * only acceptable because this app never leaves localhost and is never
 * deployed with a real key baked in. A real product would proxy through a
 * server that holds the key instead.
 *
 * The key itself lives in `.env.local` (git-ignored) as
 * `VITE_ANTHROPIC_API_KEY` — set it yourself; nothing in this repo reads or
 * writes that value on your behalf.
 */
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

export const hasApiKey = Boolean(apiKey);

export const client = apiKey ? new Anthropic({ apiKey, dangerouslyAllowBrowser: true }) : null;
