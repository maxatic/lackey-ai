import Anthropic from '@anthropic-ai/sdk';

export const AI_MODEL = 'claude-opus-4-8';

// ponytail: module-level singleton; per-request clients if key rotation ever matters
let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('Missing ANTHROPIC_API_KEY');
  if (!client) client = new Anthropic();
  return client;
}

export async function callStructured<T>(opts: {
  system: string;
  user: string;
  toolName: string;
  toolDescription: string;
  inputSchema: Record<string, unknown>;
  validate: (raw: unknown) => T | null;
  maxTokens?: number;
}): Promise<T> {
  const anthropic = getClient();
  // SDK retries transient errors (429/5xx/network) itself; this loop only
  // covers a schema-invalid tool payload.
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: opts.maxTokens ?? 8192,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
      tools: [
        {
          name: opts.toolName,
          description: opts.toolDescription,
          strict: true,
          input_schema: opts.inputSchema as Anthropic.Tool['input_schema'],
        },
      ],
      tool_choice: { type: 'tool', name: opts.toolName },
    });
    const block = response.content.find((b) => b.type === 'tool_use');
    const parsed = block && 'input' in block ? opts.validate(block.input) : null;
    if (parsed !== null) return parsed;
  }
  throw new Error('AI returned an unexpected response — please try again');
}
